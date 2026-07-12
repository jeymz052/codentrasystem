import { Check, Trash2 } from 'lucide-react'

export function SelectAllCheckbox({
  checked,
  indeterminate,
  onToggle,
  disabled = false,
}: {
  checked: boolean
  indeterminate?: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      checked={checked}
      ref={(element) => {
        if (element) element.indeterminate = Boolean(indeterminate) && !checked
      }}
      onChange={onToggle}
      disabled={disabled}
      style={{ width: 16, height: 16, cursor: disabled ? 'default' : 'pointer', accentColor: '#3B82F6' }}
    />
  )
}

export function RowCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean
  onToggle: () => void
}) {
  return (
    <input
      type="checkbox"
      aria-label="Select row"
      checked={checked}
      onChange={onToggle}
      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3B82F6' }}
    />
  )
}

export function BulkActionBar({
  count,
  onClear,
  onDelete,
  deleteLabel = 'Delete selected',
  deleting = false,
}: {
  count: number
  onClear: () => void
  onDelete: () => void
  deleteLabel?: string
  deleting?: boolean
}) {
  if (count === 0) return null

  return (
    <div
      className="card"
      style={{
        padding: '12px 16px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        borderRadius: 16,
        border: '1px solid #FECACA',
        background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
        {count} selected
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClear}>
          Clear
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete} disabled={deleting}>
          <Trash2 size={13} /> {deleteLabel}
        </button>
      </div>
    </div>
  )
}

export { Check }
