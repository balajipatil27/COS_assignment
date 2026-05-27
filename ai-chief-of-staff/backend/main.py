from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai
import json
import os
import re
import time
from models import AnalyzeRequest, AnalysisResponse, DraftsRequest, DraftsResponse, Message
from prompt import get_system_prompt

load_dotenv()
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

DEFAULT_MODEL = "gemini-2.0-flash"
# flash-lite is faster and cheaper; override in .env if needed
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite")
FALLBACK_MODELS = [
    m.strip()
    for m in os.getenv(
        "GEMINI_MODEL_FALLBACKS",
        "gemini-2.5-flash-lite,gemini-2.5-flash,gemini-2.0-flash,gemini-2.0-flash-001",
    ).split(",")
    if m.strip()
]
MAX_BODY_CHARS = int(os.getenv("MAX_MESSAGE_BODY_CHARS", "600"))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _is_quota_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return "429" in str(exc) or "quota" in msg or "rate limit" in msg or "rate-limit" in msg


def _is_model_not_found(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return "404" in str(exc) or "not found" in msg or "not supported for generatecontent" in msg


def _retry_delay_seconds(exc: BaseException, attempt: int) -> float:
    match = re.search(r"retry in ([\d.]+)s", str(exc), re.IGNORECASE)
    if match:
        return float(match.group(1)) + 0.5
    return min(2**attempt, 8)


def _compact_message(message: Message) -> dict:
    data = message.model_dump(by_alias=True, exclude_none=True)
    body = data.get("body", "")
    if len(body) > MAX_BODY_CHARS:
        data["body"] = body[:MAX_BODY_CHARS] + "…[truncated]"
    return data


def _prepare_messages_json(messages: list[Message]) -> str:
    payload = [_compact_message(m) for m in messages]
    return json.dumps(payload, separators=(",", ":"))


def _generation_config(max_output_tokens: int | None = None) -> dict:
    return {
        "response_mime_type": "application/json",
        "temperature": 0.2,
        "max_output_tokens": max_output_tokens
        if max_output_tokens is not None
        else int(os.getenv("MAX_OUTPUT_TOKENS", "8192")),
    }

def _delegate_to_to_string(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        v = value.strip()
        return v if v else None
    if isinstance(value, dict):
        name = str(value.get("name", "")).strip()
        role = str(value.get("role", "")).strip()
        if name and role:
            return f"{name} — {role}"
        if name:
            return name
        if role:
            return role
        return None
    return str(value).strip() or None


def _normalize_analysis_payload(data: dict) -> dict:
    triage = data.get("triage")
    if isinstance(triage, list):
        for item in triage:
            if isinstance(item, dict) and "delegate_to" in item:
                item["delegate_to"] = _delegate_to_to_string(item.get("delegate_to"))
    return data


def _safe_json_loads(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract the first JSON object from the text.
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = text[start : end + 1]
            return json.loads(candidate)
        raise


def _generate_json(full_prompt: str, *, max_output_tokens: int | None = None) -> dict:
    models_to_try: list[str] = []
    for name in [GEMINI_MODEL, *FALLBACK_MODELS, DEFAULT_MODEL]:
        if name not in models_to_try:
            models_to_try.append(name)

    last_error: Exception | None = None
    config = _generation_config(max_output_tokens=max_output_tokens)

    for model_name in models_to_try:
        model = genai.GenerativeModel(model_name=model_name, generation_config=config)
        for attempt in range(3):
            try:
                response = model.generate_content(full_prompt)
                return _safe_json_loads(response.text)
            except Exception as e:
                last_error = e
                if _is_model_not_found(e):
                    break
                if _is_quota_error(e) and attempt < 2:
                    time.sleep(_retry_delay_seconds(e, attempt))
                    continue
                if _is_quota_error(e):
                    break
                raise

    if last_error is not None:
        raise last_error
    raise RuntimeError("No Gemini model available")


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalyzeRequest):
    try:
        messages_json = _prepare_messages_json(request.messages)
        include_drafts = os.getenv("INCLUDE_DRAFTS_BY_DEFAULT", "0").strip() == "1"

        prompt = get_system_prompt()
        if not include_drafts:
            prompt += (
                "\n\nIMPORTANT: For this run, set drafted_response to an empty string "
                "and delegate_to to null for ALL triage items. Do not draft replies."
            )

        full_prompt = prompt + "\n\nMessages:\n" + messages_json
        data = _normalize_analysis_payload(
            _generate_json(full_prompt, max_output_tokens=2048 if not include_drafts else None)
        )
        return AnalysisResponse(**data)
    except Exception as e:
        if _is_quota_error(e):
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota exceeded. Wait a few minutes, enable billing, "
                    "or set GEMINI_MODEL=gemini-2.0-flash-lite in .env."
                ),
            ) from e
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/drafts", response_model=DraftsResponse)
async def drafts(request: DraftsRequest):
    try:
        messages_json = _prepare_messages_json(request.messages)
        triage_json = json.dumps(
            [t.model_dump(by_alias=True) for t in request.triage],
            separators=(",", ":"),
        )

        prompt = (
            "You are an AI Chief of Staff. Return ONLY valid JSON.\n\n"
            "Task: Generate drafted_response and delegate_to for each triage item.\n"
            "- For DELEGATE: drafted_response must be a ready-to-send handoff message and delegate_to must be a string.\n"
            "- For DECIDE: drafted_response must be a ready-to-send reply/action message and delegate_to must be null.\n"
            "- For IGNORE: drafted_response must be an empty string and delegate_to must be null.\n\n"
            "Return schema:\n"
            "{\"updates\":[{\"id\":1,\"drafted_response\":\"\",\"delegate_to\":null}]}\n"
        )

        full_prompt = (
            prompt
            + "\n\nMessages:\n"
            + messages_json
            + "\n\nTriage items:\n"
            + triage_json
        )
        data = _generate_json(full_prompt, max_output_tokens=4096)

        # Normalize delegate_to to string|null
        updates = data.get("updates")
        if isinstance(updates, list):
            for u in updates:
                if isinstance(u, dict) and "delegate_to" in u:
                    u["delegate_to"] = _delegate_to_to_string(u.get("delegate_to"))

        return DraftsResponse(**data)
    except Exception as e:
        if _is_quota_error(e):
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota exceeded while drafting responses. "
                    "Wait a bit or enable billing."
                ),
            ) from e
        raise HTTPException(status_code=500, detail=str(e)) from e
