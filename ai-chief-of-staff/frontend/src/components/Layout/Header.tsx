interface HeaderProps {
  section: 'briefing' | 'triage' | 'flags'
  decideCount: number
  delegatedCount: number
  flags: { severity: 'HIGH' | 'MEDIUM' | 'LOW' }[]
}

const sectionTitles: Record<HeaderProps['section'], string> = {
  briefing: 'Daily Briefing',
  triage: 'Triage',
  flags: 'Flags',
}

function getFlagPillColor(flags: { severity: 'HIGH' | 'MEDIUM' | 'LOW' }[]): { bg: string; text: string } {
  if (flags.some((f) => f.severity === 'HIGH')) {
    return { bg: 'var(--urgency-high-bg)', text: 'var(--urgency-high-text)' }
  }
  if (flags.some((f) => f.severity === 'MEDIUM')) {
    return { bg: 'var(--urgency-medium-bg)', text: 'var(--urgency-medium-text)' }
  }
  return { bg: 'var(--urgency-low-bg)', text: 'var(--urgency-low-text)' }
}

export default function Header({ section, decideCount, delegatedCount, flags }: HeaderProps) {
  const flagPill = getFlagPillColor(flags)

  return (
    <header className="no-print">
      <div className="header-shell" style={{ width: '100%' }}>
      <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {sectionTitles[section]}
      </h1>
      <div style={{ display: 'flex', gap: '8px' }}>
        <span
          style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: 'var(--decide-bg)',
            color: 'var(--decide-text)',
            fontWeight: 500,
          }}
        >
          {decideCount} to decide
        </span>
        <span
          style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: 'var(--delegate-bg)',
            color: 'var(--delegate-text)',
            fontWeight: 500,
          }}
        >
          {delegatedCount} delegated
        </span>
        <span
          style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: flagPill.bg,
            color: flagPill.text,
            fontWeight: 500,
          }}
        >
          {flags.length} flagged
        </span>
      </div>
      </div>
    </header>
  )
}
