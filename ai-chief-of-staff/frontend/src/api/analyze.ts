import type { AnalysisResponse, Message } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const lines = detail
      .map((item) => {
        if (!item || typeof item !== 'object') return String(item)
        const obj = item as { loc?: unknown; msg?: unknown }
        const loc = Array.isArray(obj.loc) ? obj.loc.join('.') : ''
        const msg = typeof obj.msg === 'string' ? obj.msg : JSON.stringify(item)
        return loc ? `${loc}: ${msg}` : msg
      })
      .filter(Boolean)
    return lines.join('\n')
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  return 'Request failed'
}

async function readErrorMessage(res: Response): Promise<string> {
  const raw = await res.text()
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown; error?: unknown }
    if ('detail' in parsed) return formatDetail(parsed.detail)
    if ('message' in parsed) return formatDetail(parsed.message)
    if ('error' in parsed) return formatDetail(parsed.error)
    return formatDetail(parsed)
  } catch {
    return raw || 'Request failed'
  }
}

export async function analyzeMessages(messages: Message[]): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return res.json() as Promise<AnalysisResponse>
}

interface DraftUpdate {
  id: number
  drafted_response: string
  delegate_to: string | null
}

interface DraftsResponse {
  updates: DraftUpdate[]
}

export async function generateDrafts(messages: Message[], triage: AnalysisResponse['triage']) {
  const res = await fetch(`${API_BASE}/api/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, triage }),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  return res.json() as Promise<DraftsResponse>
}
