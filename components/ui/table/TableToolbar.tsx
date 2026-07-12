import { Search, SlidersHorizontal, X } from 'lucide-react'

export type FilterOption = { value: string; label: string }

export type ToolbarFilter = {
  key: string
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

export function TableToolbar({
  search,
  onSearch,
  searchPlaceholder = 'Search...',
  filters = [],
  onReset,
  showReset = false,
  rightSlot,
}: {
  search: string
  onSearch: (value: string) => void
  searchPlaceholder?: string
  filters?: ToolbarFilter[]
  onReset?: () => void
  showReset?: boolean
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input
          className="input"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          style={{ paddingLeft: 36, height: 36, fontSize: 13 }}
        />
      </div>
      {filters.map((filter) => (
        <div key={filter.key} style={{ position: 'relative' }}>
          <SlidersHorizontal size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          <select
            className="input"
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
            style={{ width: 'auto', height: 36, fontSize: 13, paddingLeft: 34 }}
            aria-label={filter.label}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {showReset && (
        <button className="btn btn-ghost btn-sm" onClick={onReset} style={{ height: 36 }}>
          <X size={13} /> Clear
        </button>
      )}
      {rightSlot}
    </div>
  )
}
