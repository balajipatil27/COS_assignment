# AI Chief of Staff

> Processes a CEO's morning communications and produces triage, 
> flags, and a daily briefing.

## Setup

### Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your GEMINI_API_KEY to .env
# If you hit 429 quota errors on gemini-2.0-flash, add to .env:
#   GEMINI_MODEL=gemini-2.0-flash-lite
# (Do not use gemini-1.5-flash — it is no longer available on the API.)
uvicorn main:app --reload

### Frontend
cd frontend
npm install
npm run dev

Visit http://localhost:5173

## Usage
Upload any JSON file containing an array of message objects, or 
click "Use sample data" to load the included demo dataset.

## Stack
- Frontend: React 18, TypeScript, Vite
- Backend: FastAPI, Python 3.11+
- AI: Google Gemini 2.0 Flash
