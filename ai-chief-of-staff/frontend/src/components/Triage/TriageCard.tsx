import { useState } from 'react'
import type { TriageItem } from '../../types'

interface TriageCardProps {
  item: TriageItem
}

const urgencyStyles: Record<
  TriageItem['urgency'],
  { bg: string; text: string }
> = {
  HIGH: { bg: 'var(--urgency-high-bg)', text: 'var(--urgency-high-text)' },
  MEDIUM: { bg: 'var(--urgency-medium-bg)', text: 'var(--urgency-medium-text)' },
  LOW: { bg: 'var(--urgency-low-bg)', text: 'var(--urgency-low-text)' },
}

const channelColors: Record<TriageItem['channel'], string> = {
  email: 'var(--channel-email)',
  slack: 'var(--channel-slack)',
  whatsapp: 'var(--channel-whatsapp)',
}

function ChannelIcon({ channel }: { channel: TriageItem['channel'] }) {
  const color = channelColors[channel]
  if (channel === 'email') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6h16v12H4V6zm0 0l8 6 8-6"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (channel === 'slack') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <rect x="4" y="9" width="4" height="4" rx="1" />
        <rect x="9" y="4" width="4" height="4" rx="1" />
        <rect x="16" y="9" width="4" height="4" rx="1" />
        <rect x="9" y="16" width="4" height="4" rx="1" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.02 2 11c0 1.66.48 3.21 1.32 4.54L2 22l6.82-1.28C10.12 21.52 11.03 22 12 22c5.52 0 10-4.02 10-9s-4.48-9-10-9z" />
    </svg>
  )
}

export default function TriageCard({ item }: TriageCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const showDraft =
    item.category !== 'IGNORE' || item.drafted_response.trim().length > 0

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(item.drafted_response)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const urgency = urgencyStyles[item.urgency]

  return (
    <article
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        transition: 'box-shadow 200ms ease, border-color 200ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)'
        e.currentTarget.style.borderColor = 'var(--border-strong)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChannelIcon channel={item.channel} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {item.from}
          </span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: '12px',
            background: urgency.bg,
            color: urgency.text,
          }}
        >
          {item.urgency}
        </span>
      </div>

      <h3
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginTop: '6px',
        }}
      >
        {item.subject}
      </h3>

      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginTop: '4px',
          lineHeight: 1.5,
        }}
      >
        {item.reasoning}
      </p>

      {item.thread_ids.length > 1 && (
        <span
          style={{
            display: 'inline-block',
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            background: 'var(--bg-tertiary)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          Thread: {item.thread_ids.length} messages
        </span>
      )}

      {showDraft && (
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Drafted response
            </span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy drafted response"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: copied ? '#276749' : 'var(--text-muted)',
              }}
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="9"
                    y="9"
                    width="13"
                    height="13"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </button>
          </button>
          <div
            style={{
              maxHeight: expanded ? '500px' : '0',
              overflow: 'hidden',
              transition: 'max-height 200ms ease',
            }}
          >
            <pre
              style={{
                marginTop: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontFamily: 'ui-monospace, monospace',
                background: 'var(--bg-secondary)',
                padding: '10px',
                borderRadius: '6px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {item.drafted_response}
            </pre>
            {item.category === 'DELEGATE' && item.delegate_to && (
              <p
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--delegate-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span aria-hidden="true">→</span> {item.delegate_to}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
