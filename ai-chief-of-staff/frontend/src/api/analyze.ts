import type { AnalysisResponse, Message } from '../types'

export async function analyzeMessages(messages: Message[]): Promise<AnalysisResponse> {
  const res = await fetch('http://localhost:8000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) {
    let detail = await res.text()
    try {
      const parsed = JSON.parse(detail) as { detail?: string }
      if (parsed.detail) detail = parsed.detail
    } catch {
      /* use raw text */
    }
    throw new Error(detail)
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
  const res = await fetch('http://localhost:8000/api/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, triage }),
  })
  if (!res.ok) {
    let detail = await res.text()
    try {
      const parsed = JSON.parse(detail) as { detail?: string }
      if (parsed.detail) detail = parsed.detail
    } catch {
      /* use raw text */
    }
    throw new Error(detail)
  }
  return res.json() as Promise<DraftsResponse>
}
