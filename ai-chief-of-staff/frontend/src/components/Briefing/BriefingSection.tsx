interface BriefingSectionProps {
  heading: string
  items: string[]
  bulletColor: string
}

export default function BriefingSectionComponent({
  heading,
  items,
  bulletColor,
}: BriefingSectionProps) {
  return (
    <section style={{ marginBottom: '24px' }}>
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '12px',
        }}
      >
        {heading}
      </h3>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, index) => (
          <li
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: bulletColor,
                marginTop: '8px',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
              }}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
