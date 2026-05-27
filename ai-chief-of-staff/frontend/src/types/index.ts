export interface TriageItem {
  id: number
  category: 'DECIDE' | 'DELEGATE' | 'IGNORE'
  channel: 'email' | 'slack' | 'whatsapp'
  from: string
  subject: string
  reasoning: string
  thread_ids: number[]
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  drafted_response: string
  delegate_to: string | null
}

export interface Flag {
  type:
    | 'SECURITY_RISK'
    | 'SCHEDULING_CONFLICT'
    | 'LIVE_INCIDENT'
    | 'RELATIONSHIP_RISK'
    | 'INTERNAL_MISALIGNMENT'
    | 'HARD_DEADLINE'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  summary: string
  related_message_ids: number[]
  recommended_action: string
}

export interface BriefingSection {
  heading: string
  items: string[]
}

export interface Briefing {
  date: string
  one_liner: string
  sections: BriefingSection[]
  bottom_line: string
}

export interface AnalysisResponse {
  triage: TriageItem[]
  flags: Flag[]
  briefing: Briefing
}

export interface Message {
  id: number
  channel: string
  from: string
  timestamp: string
  body: string
  subject?: string
  channel_name?: string
  to?: string
}
