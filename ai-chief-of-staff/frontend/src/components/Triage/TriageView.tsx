import { useState, useEffect } from 'react'
import type { TriageItem } from '../../types'
import TriageCard from './TriageCard'

interface TriageViewProps {
  items: TriageItem[]
}

type Category = 'DECIDE' | 'DELEGATE' | 'IGNORE'

const urgencyOrder: Record<TriageItem['urgency'], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
}

function sortByUrgency(items: TriageItem[]): TriageItem[] {
  return [...items].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
}

function filterByCategory(items: TriageItem[], category: Category): TriageItem[] {
  return sortByUrgency(items.filter((item) => item.category === category))
}

const columnAccent: Record<Category, string | undefined> = {
  DECIDE: 'var(--decide-border)',
  DELEGATE: 'var(--delegate-border)',
  IGNORE: undefined,
}

interface ColumnProps {
  category: Category
  items: TriageItem[]
}

function TriageColumn({ category, items }: ColumnProps) {
  const accent = columnAccent[category]

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          padding: '12px 0',
          marginBottom: '8px',
          borderLeft: accent ? `3px solid ${accent}` : 'none',
          paddingLeft: accent ? '12px' : '0',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {category}{' '}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({items.length})</span>
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {items.map((item) => (
          <TriageCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

export default function TriageView({ items }: TriageViewProps) {
  const [mobileTab, setMobileTab] = useState<Category>('DECIDE')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const categories: Category[] = ['DECIDE', 'DELEGATE', 'IGNORE']

  if (isMobile) {
    const activeItems = filterByCategory(items, mobileTab)
    return (
      <div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '8px',
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setMobileTab(cat)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: mobileTab === cat ? 'var(--bg-tertiary)' : 'transparent',
                color: mobileTab === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {cat} ({filterByCategory(items, cat).length})
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeItems.map((item) => (
            <TriageCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      {categories.map((cat) => (
        <TriageColumn key={cat} category={cat} items={filterByCategory(items, cat)} />
      ))}
    </div>
  )
}
