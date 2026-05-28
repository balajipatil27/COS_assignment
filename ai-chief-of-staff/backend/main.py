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

_api_key = os.getenv("GEMINI_API_KEY")
if not _api_key:
    raise RuntimeError("GEMINI_API_KEY is not set. Add it to backend/.env or Docker env.")
genai.configure(api_key=_api_key)

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

_cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:8080,http://localhost",
    ).split(",")
    if origin.strip()
]

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
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


def _coerce_id(value, fallback: int) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        match = re.search(r"\d+", value)
        if match:
            return int(match.group(0))
    return fallback


def _to_sender_string(value) -> str:
    if isinstance(value, str):
        return value.strip() or "Unknown sender"
    if isinstance(value, dict):
        name = str(value.get("name", "")).strip()
        email = str(value.get("email", "")).strip()
        handle = str(value.get("slack_handle", "")).strip()
        phone = str(value.get("phone", "")).strip()
        if name and email:
            return f"{name} <{email}>"
        if name:
            return name
        if email:
            return email
        if handle:
            return handle
        if phone:
            return phone
    return "Unknown sender"


def _to_text(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        parts = [str(v).strip() for v in value.values() if str(v).strip()]
        return ", ".join(parts) if parts else None
    if isinstance(value, list):
        parts = [str(v).strip() for v in value if str(v).strip()]
        return ", ".join(parts) if parts else None
    return str(value)


def _normalize_incoming_messages(raw_messages: list[dict]) -> list[Message]:
    normalized: list[Message] = []
    for idx, raw in enumerate(raw_messages, start=1):
        if not isinstance(raw, dict):
            raise HTTPException(
                status_code=422,
                detail=f"messages[{idx - 1}] must be an object",
            )

        payload = {
            "id": _coerce_id(raw.get("id"), idx),
            "channel": str(raw.get("channel", "email")).strip().lower() or "email",
            "from": _to_sender_string(raw.get("from")),
            "timestamp": str(raw.get("timestamp", "")).strip() or "1970-01-01T00:00:00Z",
            "body": _to_text(raw.get("body")) or _to_text(raw.get("text")) or "",
            "subject": _to_text(raw.get("subject")),
            "channel_name": _to_text(raw.get("channel_name")),
            "to": _to_text(raw.get("to")),
        }

        if not payload["body"]:
            payload["body"] = "(no body provided)"

        try:
            normalized.append(Message(**payload))
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"messages[{idx - 1}] could not be normalized: {e}",
            ) from e

    return normalized


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
            if not isinstance(item, dict):
                continue

            # Ensure required fields exist with safe defaults.
            if not isinstance(item.get("id"), int):
                item["id"] = 0
            if not isinstance(item.get("subject"), str):
                item["subject"] = "No subject"
            if not isinstance(item.get("reasoning"), str):
                item["reasoning"] = "No reasoning provided."
            if not isinstance(item.get("thread_ids"), list):
                item["thread_ids"] = []
            if not isinstance(item.get("drafted_response"), str):
                item["drafted_response"] = ""
            if not isinstance(item.get("from"), str):
                item["from"] = "Unknown sender"

            channel = str(item.get("channel", "")).strip().lower()
            if channel not in {"email", "slack", "whatsapp"}:
                item["channel"] = "email"
            else:
                item["channel"] = channel

            urgency = str(item.get("urgency", "")).strip().upper()
            if urgency not in {"HIGH", "MEDIUM", "LOW"}:
                item["urgency"] = "LOW"
            else:
                item["urgency"] = urgency

            if "delegate_to" in item:
                item["delegate_to"] = _delegate_to_to_string(item.get("delegate_to"))
            else:
                item["delegate_to"] = None

            # Some model responses incorrectly output a flag type in triage.category.
            # Coerce unknown categories to a safe fallback based on presence of delegate_to.
            category = str(item.get("category", "")).strip().upper()
            if category not in {"DECIDE", "DELEGATE", "IGNORE"}:
                item["category"] = "DELEGATE" if item.get("delegate_to") else "IGNORE"
            else:
                item["category"] = category

    flags = data.get("flags")
    if isinstance(flags, list):
        for flag in flags:
            if not isinstance(flag, dict):
                continue
            action = str(flag.get("recommended_action", "")).strip()
            if action:
                continue
            flag_type = str(flag.get("type", "")).strip()
            default_actions = {
                "SECURITY_RISK": "Do not click links; forward to IT/security and block sender domain.",
                "SCHEDULING_CONFLICT": "Resolve calendar clash now and send updated invites to all participants.",
                "LIVE_INCIDENT": "Assign incident lead, choose rollback/hotfix path, and post 30-min updates.",
                "RELATIONSHIP_RISK": "Contact stakeholder directly today with clear plan and owner.",
                "INTERNAL_MISALIGNMENT": "Align owners internally on one narrative before next external update.",
                "HARD_DEADLINE": "Assign owner immediately and confirm completion timeline before deadline.",
            }
            flag["recommended_action"] = default_actions.get(
                flag_type, "Assign an owner and execute the next concrete step now."
            )

    briefing = data.get("briefing")
    if isinstance(briefing, dict):
        sections = briefing.get("sections")
        if isinstance(sections, list):
            for section in sections:
                if not isinstance(section, dict):
                    continue
                items = section.get("items")
                if not isinstance(items, list):
                    continue
                coerced: list[str] = []
                for it in items:
                    if isinstance(it, str):
                        coerced.append(it)
                        continue
                    if isinstance(it, dict):
                        subject = str(it.get("subject", "")).strip()
                        sender = str(it.get("from", "")).strip()
                        mid = it.get("id")
                        # Keep briefing items clean: prefer subject; otherwise fall back to a short message ref.
                        if subject:
                            coerced.append(subject)
                        elif isinstance(mid, int):
                            coerced.append(f"Msg #{mid}")
                        else:
                            coerced.append(sender if sender else json.dumps(it, separators=(",", ":")))
                        continue
                    coerced.append(str(it))
                section["items"] = coerced
    return data


def _message_blurb_by_id(messages: list[Message]) -> dict[int, str]:
    blurbs: dict[int, str] = {}
    for m in messages:
        subject = (m.subject or "").strip()
        body = (m.body or "").strip().split("\n")[0]
        if subject:
            text = subject
        else:
            text = f"{body[:80]}{'…' if len(body) > 80 else ''}"
        blurbs[m.id] = text
    return blurbs


def _cleanup_briefing_items(data: dict, messages: list[Message]) -> dict:
    briefing = data.get("briefing")
    if not isinstance(briefing, dict):
        return data

    sections = briefing.get("sections")
    if not isinstance(sections, list):
        return data

    message_map = _message_blurb_by_id(messages)
    msg_ref_re = re.compile(r"^Msg\s*#\s*(\d+)\s*$", re.IGNORECASE)

    for section in sections:
        if not isinstance(section, dict):
            continue
        items = section.get("items")
        if not isinstance(items, list):
            continue

        cleaned: list[str] = []
        for item in items:
            text = item if isinstance(item, str) else str(item)
            match = msg_ref_re.match(text.strip())
            if match:
                mid = int(match.group(1))
                cleaned.append(message_map.get(mid, f"Message #{mid}"))
            else:
                cleaned.append(text)
        section["items"] = cleaned

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
            except json.JSONDecodeError as e:
                # Model emitted invalid JSON; retry quickly.
                last_error = e
                if attempt < 2:
                    continue
                break
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
        messages = _normalize_incoming_messages(request.messages)
        messages_json = _prepare_messages_json(messages)
        include_drafts = os.getenv("INCLUDE_DRAFTS_BY_DEFAULT", "0").strip() == "1"

        prompt = get_system_prompt()
        if not include_drafts:
            prompt += (
                "\n\nIMPORTANT: For this run, set drafted_response to an empty string "
                "and delegate_to to null for ALL triage items. Do not draft replies."
            )
        prompt += (
            "\n\nOUTPUT RULES: Return ONLY a single JSON object. Do not use markdown. "
            "No trailing commas. Escape any newlines inside strings as \\n. "
            "Prefer compact/minified JSON."
        )

        full_prompt = prompt + "\n\nMessages:\n" + messages_json
        data = _normalize_analysis_payload(
            _generate_json(full_prompt, max_output_tokens=2048 if not include_drafts else None)
        )
        data = _cleanup_briefing_items(data, messages)
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
        messages = _normalize_incoming_messages(request.messages)
        messages_json = _prepare_messages_json(messages)
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
            "Output rules: single JSON object only, no markdown, no trailing commas, escape newlines as \\n.\n\n"
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