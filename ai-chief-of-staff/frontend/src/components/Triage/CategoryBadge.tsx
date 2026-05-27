interface CategoryBadgeProps {
  category: 'DECIDE' | 'DELEGATE' | 'IGNORE'
}

const categoryStyles: Record<
  CategoryBadgeProps['category'],
  { bg: string; text: string; border: string }
> = {
  DECIDE: { bg: 'var(--decide-bg)', text: 'var(--decide-text)', border: 'var(--decide-border)' },
  DELEGATE: {
    bg: 'var(--delegate-bg)',
    text: 'var(--delegate-text)',
    border: 'var(--delegate-border)',
  },
  IGNORE: { bg: 'var(--ignore-bg)', text: 'var(--ignore-text)', border: 'var(--ignore-border)' },
}

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const style = categoryStyles[category]

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: '6px',
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {category}
    </span>
  )
}
