import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

export function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  rangeStart,
  rangeEnd,
  totalItems,
  pageSizeOptions = [5, 10, 20, 50],
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  rangeStart: number
  rangeEnd: number
  totalItems: number
  pageSizeOptions?: number[]
}) {
  if (totalItems === 0) return null

  return (
    <div
      className="card"
      style={{
        padding: '10px 14px',
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        borderRadius: 16,
      }}
    >
      <div style={{ fontSize: 12, color: '#64748B' }}>
        Showing <strong style={{ color: '#0F172A' }}>{rangeStart}</strong>–<strong style={{ color: '#0F172A' }}>{rangeEnd}</strong> of{' '}
        <strong style={{ color: '#0F172A' }}>{totalItems}</strong>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
          Rows
          <SearchableSelect
            className="input"
            placeholder="Rows"
            searchPlaceholder="Search..."
            ariaLabel="Rows per page"
            style={{ width: 'auto', height: 32, fontSize: 12 }}
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} style={{ height: 32 }}>
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: 12, color: '#475569', minWidth: 70, textAlign: 'center' }}>
            Page <strong style={{ color: '#0F172A' }}>{page}</strong> / {totalPages}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} style={{ height: 32 }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
