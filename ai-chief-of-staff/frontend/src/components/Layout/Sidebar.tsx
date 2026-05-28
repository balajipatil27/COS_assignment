interface SidebarProps {
  activeSection: 'briefing' | 'triage' | 'flags'
  onNavigate: (section: 'briefing' | 'triage' | 'flags') => void
  onNewAnalysis: () => void
  decideCount: number
  flagsCount: number
}

function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 12h-6l-2 3H10l-2-3H2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

interface NavItemProps {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  badge?: { count: number; color: string }
}

function NavItem({ label, icon, active, onClick, badge }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nav-item ${active ? 'nav-item-active' : ''}`}
    >
      <span
        style={{
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          marginRight: '10px',
          display: 'flex',
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          flex: 1,
        }}
      >
        {label}
      </span>
      {badge && badge.count > 0 && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '12px',
            background: badge.color === 'red' ? 'var(--decide-bg)' : 'var(--delegate-bg)',
            color: badge.color === 'red' ? 'var(--decide-text)' : 'var(--delegate-text)',
          }}
        >
          {badge.count}
        </span>
      )}
    </button>
  )
}

export default function Sidebar({
  activeSection,
  onNavigate,
  onNewAnalysis,
  decideCount,
  flagsCount,
}: SidebarProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <aside className="no-print">
      <div className="sidebar-shell">
        <div className="sidebar-brand">
          <h1 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Chief of Staff
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{today}</p>
        </div>

        <nav style={{ flex: 1 }}>
          <NavItem
            label="Briefing"
            icon={<DocumentIcon />}
            active={activeSection === 'briefing'}
            onClick={() => onNavigate('briefing')}
          />
          <NavItem
            label="Triage"
            icon={<InboxIcon />}
            active={activeSection === 'triage'}
            onClick={() => onNavigate('triage')}
            badge={{ count: decideCount, color: 'red' }}
          />
          <NavItem
            label="Flags"
            icon={<WarningIcon />}
            active={activeSection === 'flags'}
            onClick={() => onNavigate('flags')}
            badge={{ count: flagsCount, color: 'amber' }}
          />
        </nav>

        <div style={{ padding: '12px 12px 24px' }}>
          <button
            type="button"
            onClick={onNewAnalysis}
            className="btn"
            style={{
              width: '100%',
              height: '36px',
              fontSize: '13px',
            }}
          >
            New analysis
          </button>
        </div>
      </div>
    </aside>
  )
}
