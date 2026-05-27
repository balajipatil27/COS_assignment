import type { Flag } from '../../types'
import FlagCard from './FlagCard'

interface FlagsViewProps {
  flags: Flag[]
}

const severityOrder: Record<Flag['severity'], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
}

export default function FlagsView({ flags }: FlagsViewProps) {
  const sorted = [...flags].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  )

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Flags</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {flags.length} {flags.length === 1 ? 'issue' : 'issues'} requiring attention
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sorted.map((flag, index) => (
          <FlagCard key={`${flag.type}-${index}`} flag={flag} />
        ))}
      </div>
    </div>
  )
}
