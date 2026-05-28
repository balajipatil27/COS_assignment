# AI Chief of Staff

> A full-stack AI assistant that processes a CEO's communications and outputs actionable triage, strategic flags, and a daily executive briefing.

## Overview

This project ingests cross-channel messages (`email`, `slack`, `whatsapp`) and generates:

- **Triage**: `DECIDE`, `DELEGATE`, `IGNORE`
- **Flags**: security risks, incidents, conflicts, hard deadlines, and misalignment
- **Briefing**: concise executive summary with clear priorities

The UI is designed for fast decision-making, with a two-stage workflow:

1. **Fast analysis** (without drafted replies by default)
2. **On-demand draft generation** from a separate endpoint

This keeps initial load time low while still allowing detailed responses when needed.

## Project Structure

```text
ai-chief-of-staff/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── prompt.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── data/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: FastAPI, Pydantic v2, Python 3.11+
- **AI**: Google Gemini (`google-generativeai`)

## Prerequisites

- Python `3.11+` (recommended: `3.12`)
- Node.js `18+`
- npm
- Gemini API key

## Local Setup

### 1) Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Update `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash-lite
PROMPT_MODE=compact
MAX_MESSAGE_BODY_CHARS=600
INCLUDE_DRAFTS_BY_DEFAULT=0
```

Start API:

```bash
uvicorn main:app --reload
```

Health check:

- `GET http://localhost:8000/health` -> `{"status":"ok"}`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

- <http://localhost:5173>

## Usage Flow

1. Upload messages JSON **or** click **Use sample data**
2. App runs `/api/analyze` and shows:
   - Briefing
   - Triage
   - Flags
3. In Triage, click **Generate drafted responses** to call `/api/drafts` only when needed

## API Endpoints

### `POST /api/analyze`

Generates triage, flags, and briefing.

Request:

```json
{
  "messages": [
    {
      "id": 1,
      "channel": "email",
      "from": "sender",
      "timestamp": "2026-03-18T08:12:00Z",
      "body": "..."
    }
  ]
}
```

Response:

- `AnalysisResponse` (`triage`, `flags`, `briefing`)

### `POST /api/drafts`

Generates `drafted_response` and `delegate_to` for existing triage items.

Request:

```json
{
  "messages": [...],
  "triage": [...]
}
```

Response:

```json
{
  "updates": [
    {
      "id": 1,
      "drafted_response": "...",
      "delegate_to": "Name — Role"
    }
  ]
}
```

## Reliability Guards Included

The backend includes defensive normalization for model output:

- fixes malformed JSON extraction (`_safe_json_loads`)
- retries on JSON decode failures
- coerces `delegate_to` object -> string
- fills missing `flags[].recommended_action`
- coerces briefing section items to strings
- cleans `Msg #N` placeholders into readable briefing text

## Configuration Notes

- Use `PROMPT_MODE=compact` for speed.
- Use `PROMPT_MODE=full` for higher reasoning quality.
- Keep `INCLUDE_DRAFTS_BY_DEFAULT=0` for faster initial analysis.
- If you hit quota limits, switch to a model with available quota (for example `gemini-2.0-flash-lite`).

## Security

- Never commit real secrets.
- `.env` is intentionally ignored by git.
- If a key is exposed, revoke/rotate it immediately.

## Troubleshooting

- **403 leaked API key**: rotate key and update `.env`.
- **429 quota exceeded**: wait/reset quota, enable billing, or switch model.
- **JSON parse errors from model**: retry (handled internally), keep compact mode.
- **Pydantic validation errors**: most common model-shape mismatches are normalized in backend.

## License

Internal assignment/demo usage.
