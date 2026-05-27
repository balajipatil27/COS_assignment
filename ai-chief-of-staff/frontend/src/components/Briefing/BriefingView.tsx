import type { Briefing } from '../../types'
import BriefingSectionComponent from './BriefingSection'

interface BriefingViewProps {
  briefing: Briefing
}

function getBulletColor(heading: string): string {
  const lower = heading.toLowerCase()
  if (lower.includes('decision') || lower.includes('decide')) return '#C53030'
  if (lower.includes('delegat')) return '#B7791F'
  if (lower.includes('watch')) return '#DD6B20'
  if (lower.includes('ignore')) return '#718096'
  return '#1A1A2E'
}

export default function BriefingView({ briefing }: BriefingViewProps) {
  return (
    <div
      className="print-only-briefing"
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <button
        type="button"
        className="no-print"
        onClick={() => window.print()}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fontSize: '12px',
          padding: '6px 12px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontWeight: 500,
        }}
      >
        Print / Save PDF
      </button>

      <p
        style={{
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {briefing.date}
      </p>

      <h1
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginTop: '8px',
          lineHeight: 1.4,
          paddingRight: '140px',
        }}
      >
        {briefing.one_liner}
      </h1>

      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--border)',
          margin: '24px 0',
        }}
      />

      {briefing.sections.map((section) => (
        <BriefingSectionComponent
          key={section.heading}
          heading={section.heading}
          items={section.items}
          bulletColor={getBulletColor(section.heading)}
        />
      ))}

      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--border)',
          margin: '24px 0',
        }}
      />

      <div>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Bottom line
        </p>
        <div
          style={{
            marginTop: '8px',
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.7,
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: '3px solid var(--text-primary)',
          }}
        >
          {briefing.bottom_line}
        </div>
      </div>
    </div>
  )
}
