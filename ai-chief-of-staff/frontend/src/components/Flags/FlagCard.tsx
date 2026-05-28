import type { Flag } from '../../types'

interface FlagCardProps {
  flag: Flag
}

const severityColors: Record<Flag['severity'], string> = {
  HIGH: '#C53030',
  MEDIUM: '#B7791F',
  LOW: '#276749',
}

const urgencyStyles: Record<
  Flag['severity'],
  { bg: string; text: string }
> = {
  HIGH: { bg: 'var(--urgency-high-bg)', text: 'var(--urgency-high-text)' },
  MEDIUM: { bg: 'var(--urgency-medium-bg)', text: 'var(--urgency-medium-text)' },
  LOW: { bg: 'var(--urgency-low-bg)', text: 'var(--urgency-low-text)' },
}

export default function FlagCard({ flag }: FlagCardProps) {
  const accentColor = severityColors[flag.severity]
  const severityStyle = urgencyStyles[flag.severity]

  return (
    <article
      className="elevated-card"
      style={{
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '3px',
          flexShrink: 0,
          background: accentColor,
          borderRadius: '0 4px 4px 0',
        }}
      />
      <div style={{ flex: 1, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              padding: '3px 8px',
              borderRadius: '4px',
              background: `${accentColor}26`,
              color: accentColor,
            }}
          >
            {flag.type.replace(/_/g, ' ')}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '12px',
              background: severityStyle.bg,
              color: severityStyle.text,
            }}
          >
            {flag.severity}
          </span>
        </div>

        <p
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginTop: '8px',
            lineHeight: 1.5,
          }}
        >
          {flag.summary}
        </p>

        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Recommended action
          </p>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              lineHeight: 1.5,
            }}
          >
            {flag.recommended_action}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          {flag.related_message_ids.map((id) => (
            <span
              key={id}
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'var(--bg-tertiary)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              Msg #{id}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
