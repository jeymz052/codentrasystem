import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { SortDirection } from '@/lib/use-table-state'

export function SortHeader({
  label,
  column,
  sortKey,
  direction,
  onToggle,
  align = 'left',
}: {
  label: string
  column: string
  sortKey: string
  direction: SortDirection
  onToggle: (key: string) => void
  align?: 'left' | 'right' | 'center'
}) {
  const active = sortKey === column
  return (
    <th
      onClick={() => onToggle(column)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        textAlign: align,
        color: active ? '#0F172A' : undefined,
      }}
      title={`Sort by ${label}`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start' }}>
        {label}
        {active ? (
          direction === 'asc' ? (
            <ArrowUp size={12} color="#3B82F6" />
          ) : (
            <ArrowDown size={12} color="#3B82F6" />
          )
        ) : (
          <ChevronsUpDown size={12} color="#CBD5E1" />
        )}
      </span>
    </th>
  )
}
