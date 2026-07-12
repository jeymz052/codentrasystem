'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, DollarSign, Layers, Package, PieChart, TrendingDown, TrendingUp } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'

const TABS = ['Stock Balance', 'Cost of Goods Sold', 'Aging Inventory', 'Sales Summary'] as const

function exportCSV(data: Record<string, string | number | null | undefined>[], filename: string) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  const csv = [keys.join(','), ...data.map((row) => keys.map((key) => String(row[key] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

type SalesPoint = { label: string; sales: number; transactions: number; sortKey: string }

function SalesAreaChart({ rows, formatCurrency }: { rows: SalesPoint[]; formatCurrency: (value: number) => string }) {
  if (rows.length === 0) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
        No sales recorded in the selected date range.
      </div>
    )
  }

  const width = 760
  const height = 260
  const padX = 40
  const padY = 24
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const max = Math.max(...rows.map((row) => row.sales), 1)
  const stepX = rows.length > 1 ? innerW / (rows.length - 1) : 0
  const points = rows.map((row, index) => ({
    x: padX + stepX * index,
    y: padY + innerH - (row.sales / max) * innerH,
    sales: row.sales,
    label: row.label,
    transactions: row.transactions,
  }))
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const last = points[points.length - 1]
  const first = points[0]
  const areaPath = `${linePath} L${last.x},${padY + innerH} L${first.x},${padY + innerH} Z`
  const gridLines = [0.25, 0.5, 0.75, 1]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Sales trend chart">
      <defs>
        <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="salesLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>

      {gridLines.map((level) => (
        <g key={level}>
          <line x1={padX} y1={padY + innerH - level * innerH} x2={width - padX} y2={padY + innerH - level * innerH} stroke="#E2E8F0" strokeWidth={1} />
          <text x={8} y={padY + innerH - level * innerH + 4} fontSize={10} fill="#94A3B8">
            {formatCurrency(max * level)}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="url(#salesArea)" />
      <path d={linePath} fill="none" stroke="url(#salesLine)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

      {points.map((point, index) => (
        <g key={index}>
          <circle cx={point.x} cy={point.y} r={3.5} fill="#fff" stroke="#2563EB" strokeWidth={2} />
          <text x={point.x} y={height - 6} fontSize={10} fill="#64748B" textAnchor="middle">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ReportsPage() {
  const { state, formatCurrency } = useDemoSystem()
  const searchParams = useSearchParams()
  const initialTab = TABS.includes(searchParams.get('tab') as (typeof TABS)[number]) ? (searchParams.get('tab') as (typeof TABS)[number]) : 'Stock Balance'
  const initialRange = searchParams.get('range') === 'weekly' ? 'weekly' : 'daily'
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab)
  const [range, setRange] = useState<'daily' | 'weekly'>(initialRange)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return toLocalDateString(d)
  })
  const [dateTo, setDateTo] = useState(() => toLocalDateString(new Date()))

  const stockRows = useMemo(
    () =>
      state.products.map((product) => ({
        item_code: product.item_code,
        name: product.name,
        category: state.categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized',
        uom: product.uom?.abbreviation ?? 'pcs',
        qty: product.quantity_on_hand,
        unit_cost: Number(product.unit_cost ?? 0),
        total_value: Number(product.quantity_on_hand) * Number(product.unit_cost ?? 0),
        status: product.quantity_on_hand === 0 ? 'out' : product.quantity_on_hand <= product.reorder_point ? 'low' : 'ok',
      })),
    [state.categories, state.products]
  )

  const cogsRows = useMemo(
    () => {
      const inRangeTxIds = new Set(
        state.salesTransactions
          .filter((tx) => tx.status === 'completed' && toLocalDateString(new Date(tx.created_at)) >= dateFrom && toLocalDateString(new Date(tx.created_at)) <= dateTo)
          .map((tx) => tx.id)
      )
      return state.salesTransactionItems
        .filter((item) => inRangeTxIds.has(item.transaction_id))
        .map((item) => {
          const product = state.products.find((entry) => entry.id === item.product_id)
          const revenue = item.subtotal
          const cogs = Number(item.unit_cost ?? 0) * item.quantity
          const margin = revenue - cogs
          return {
            item_code: product?.item_code ?? item.product_id.slice(0, 6),
            name: product?.name ?? 'Unknown',
            qty_sold: item.quantity,
            unit_cost: Number(item.unit_cost ?? 0),
            cogs,
            revenue,
            margin,
            margin_pct: revenue === 0 ? 0 : Math.round((margin / revenue) * 1000) / 10,
          }
        })
    },
    [state.products, state.salesTransactionItems, state.salesTransactions, dateFrom, dateTo]
  )

  const agingRows = useMemo(() => {
    const rangeEnd = new Date(`${dateTo}T23:59:59`)
    const movementsInRange = state.stockMovements.filter((m) => toLocalDateString(new Date(m.created_at)) >= dateFrom && toLocalDateString(new Date(m.created_at)) <= dateTo)

    const latestByProduct = new Map<string, { movement: typeof movementsInRange[0]; date: Date }>()
    for (const movement of movementsInRange) {
      const d = new Date(movement.created_at)
      const existing = latestByProduct.get(movement.product_id)
      if (!existing || d > existing.date) {
        latestByProduct.set(movement.product_id, { movement, date: d })
      }
    }

    const latestEverByProduct = new Map<string, { movement: typeof state.stockMovements[0]; date: Date }>()
    for (const movement of state.stockMovements) {
      const d = new Date(movement.created_at)
      const existing = latestEverByProduct.get(movement.product_id)
      if (!existing || d > existing.date) {
        latestEverByProduct.set(movement.product_id, { movement, date: d })
      }
    }

    return state.products
      .map((product) => {
        const inRange = latestByProduct.get(product.id)
        const ever = latestEverByProduct.get(product.id)
        const source = inRange ?? ever
        if (!source) {
          const created = new Date(product.created_at)
          const daysNoMovement = Number.isNaN(created.getTime()) ? 0 : Math.max(Math.floor((rangeEnd.getTime() - created.getTime()) / 86400000), 0)
          return {
            item_code: product.item_code,
            name: product.name,
            category: state.categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized',
            qty: product.quantity_on_hand,
            uom: product.uom?.abbreviation ?? 'pcs',
            last_movement: toLocalDateString(created),
            days_no_movement: daysNoMovement,
          }
        }
        const lastMovementDate = source.date
        const daysNoMovement = Math.max(Math.floor((rangeEnd.getTime() - lastMovementDate.getTime()) / 86400000), 0)
        return {
          item_code: product.item_code,
          name: product.name,
          category: state.categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized',
          qty: product.quantity_on_hand,
          uom: product.uom?.abbreviation ?? 'pcs',
          last_movement: toLocalDateString(lastMovementDate),
          days_no_movement: daysNoMovement,
        }
      })
      .sort((a, b) => b.days_no_movement - a.days_no_movement)
  }, [dateFrom, dateTo, state.categories, state.products, state.stockMovements])

  const salesRows = useMemo<SalesPoint[]>(() => {
    const completed = state.salesTransactions.filter(
      (tx) => tx.status === 'completed' && toLocalDateString(new Date(tx.created_at)) >= dateFrom && toLocalDateString(new Date(tx.created_at)) <= dateTo
    )

    if (range === 'weekly') {
      const map = new Map<string, { label: string; sales: number; transactions: number; sortKey: string }>()
      for (const transaction of completed) {
        const created = new Date(transaction.created_at)
        const weekStart = new Date(created)
        weekStart.setDate(created.getDate() - created.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const key = toLocalDateString(weekStart)
        const entry = map.get(key) ?? {
          label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: 0,
          transactions: 0,
          sortKey: key,
        }
        entry.sales += Number(transaction.total_amount)
        entry.transactions += 1
        map.set(key, entry)
      }
      return [...map.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    }

    const start = new Date(`${dateFrom}T00:00:00`)
    const end = new Date(`${dateTo}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []

    const map = new Map<string, { label: string; sales: number; transactions: number; sortKey: string }>()
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = toLocalDateString(cursor)
      map.set(key, {
        label: cursor.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: 0,
        transactions: 0,
        sortKey: key,
      })
    }

    for (const transaction of completed) {
      const key = toLocalDateString(new Date(transaction.created_at))
      const entry = map.get(key)
      if (!entry) continue
      entry.sales += Number(transaction.total_amount)
      entry.transactions += 1
    }

    return [...map.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [range, dateFrom, dateTo, state.salesTransactions])

  const totalValue = stockRows.reduce((sum, row) => sum + row.total_value, 0)
  const totalCOGS = cogsRows.reduce((sum, row) => sum + row.cogs, 0)
  const totalRev = cogsRows.reduce((sum, row) => sum + row.revenue, 0)
  const totalMargin = totalRev - totalCOGS
  const marginPct = totalRev === 0 ? 0 : Math.round((totalMargin / totalRev) * 1000) / 10
  const totalTxn = salesRows.reduce((sum, row) => sum + row.transactions, 0)
  const totalSales = salesRows.reduce((sum, row) => sum + row.sales, 0)
  const aov = totalTxn === 0 ? 0 : totalSales / totalTxn

  const statusColor = (status: string) => (status === 'out' ? '#EF4444' : status === 'low' ? '#F59E0B' : '#10B981')
  const agingColor = (days: number) => (days > 20 ? '#EF4444' : days > 10 ? '#F59E0B' : '#10B981')

  const categoryValue = useMemo(() => {
    const colorOf = (name: string) => state.categories.find((entry) => entry.name === name)?.color ?? '#94A3B8'
    const byCat: Record<string, number> = {}
    for (const product of state.products) {
      const name = product.category?.name ?? 'Uncategorized'
      byCat[name] = (byCat[name] ?? 0) + Number(product.unit_cost ?? 0) * Number(product.quantity_on_hand ?? 0)
    }
    const all = Object.entries(byCat)
      .map(([name, value]) => ({ name, value, color: colorOf(name) }))
      .sort((a, b) => b.value - a.value)
    const total = all.reduce((sum, entry) => sum + entry.value, 0) || 1
    const top = all.slice(0, 5)
    const rest = all.slice(5)
    const segments = [...top]
    if (rest.length > 0) segments.push({ name: 'Other', value: rest.reduce((sum, entry) => sum + entry.value, 0), color: '#94A3B8' })
    let acc = 0
    const built = segments.map((segment) => {
      const start = (acc / total) * 360
      acc += segment.value
      const end = (acc / total) * 360
      return { ...segment, start, end, pct: Math.round((segment.value / total) * 100) }
    })
    const gradient = `conic-gradient(${built.map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`).join(', ')})`
    return { segments: built, total, gradient }
  }, [state.products, state.categories])

  const topStockProducts = useMemo(() => stockRows.slice().sort((a, b) => b.total_value - a.total_value).slice(0, 6), [stockRows])
  const topStockMax = Math.max(...topStockProducts.map((row) => row.total_value), 1)

  const topMarginProducts = useMemo(() => cogsRows.slice().sort((a, b) => b.margin - a.margin).slice(0, 6), [cogsRows])
  const topMarginMax = Math.max(...topMarginProducts.map((row) => row.margin), 1)

  const riskCounts = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0 }
    for (const row of agingRows) {
      if (row.days_no_movement > 20) counts.High += 1
      else if (row.days_no_movement > 10) counts.Medium += 1
      else counts.Low += 1
    }
    return counts
  }, [agingRows])
  const riskTotal = riskCounts.Low + riskCounts.Medium + riskCounts.High || 1
  const riskSegments = [
    { label: 'Low', value: riskCounts.Low, color: '#10B981' },
    { label: 'Medium', value: riskCounts.Medium, color: '#F59E0B' },
    { label: 'High', value: riskCounts.High, color: '#EF4444' },
  ]

  const kpiCards = [
    { label: 'Inventory Value', value: formatCurrency(totalValue), icon: <Package size={18} />, color: '#3B82F6', sub: `${stockRows.length} SKUs tracked` },
    { label: 'Total COGS', value: formatCurrency(totalCOGS), icon: <TrendingDown size={18} />, color: '#EF4444', sub: 'Cost of goods sold' },
    { label: 'Total Revenue', value: formatCurrency(totalRev), icon: <DollarSign size={18} />, color: '#10B981', sub: 'From completed sales' },
    { label: 'Gross Margin', value: formatCurrency(totalMargin), icon: <TrendingUp size={18} />, color: '#2563EB', sub: `${marginPct}% margin` },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {kpiCards.map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${stat.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, marginBottom: 10 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TABS.map((name) => (
            <button key={name} onClick={() => setTab(name)} style={{
              padding: '6px 14px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid transparent',
              background: tab === name ? '#3B82F6' : '#FFFFFF',
              color: tab === name ? '#fff' : '#475569',
            }}>{name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
          {tab !== 'Stock Balance' && (
            <>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="input" style={{ width: 150, height: 34, fontSize: 12 }} />
              <span style={{ color: '#64748B', fontSize: 12 }}>to</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="input" style={{ width: 150, height: 34, fontSize: 12 }} />
            </>
          )}
          <button
            className="btn btn-ghost btn-sm"
            style={{ gap: 5 }}
            onClick={() => {
              if (tab === 'Stock Balance') exportCSV(stockRows, 'stock_balance')
              else if (tab === 'Cost of Goods Sold') exportCSV(cogsRows, 'cogs_report')
              else if (tab === 'Aging Inventory') exportCSV(agingRows, 'aging_inventory')
              else exportCSV(salesRows, range === 'weekly' ? 'sales_summary_weekly' : 'sales_summary_daily')
            }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {tab === 'Stock Balance' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 18, borderRadius: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#EDE9FE', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PieChart size={16} /></div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Inventory Value by Category</h3>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Stock value distribution</p>
                </div>
              </div>
              {categoryValue.segments.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: 13 }}>No inventory yet.</p>
              ) : (
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: 132, height: 132, borderRadius: '50%', background: categoryValue.gradient, flexShrink: 0, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 26, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748B' }}>Total</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{formatCurrency(categoryValue.total)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 160 }}>
                    {categoryValue.segments.map((segment) => (
                      <div key={segment.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: segment.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{segment.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>{segment.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 18, borderRadius: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#DBEAFE', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={16} /></div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Top Products by Value</h3>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Highest stock value on hand</p>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {topStockProducts.map((row, index) => (
                  <div key={row.item_code}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #2563EB, #3B82F6)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{index + 1}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', flexShrink: 0 }}>{formatCurrency(row.total_value)}</span>
                    </div>
                    <div style={{ height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${(row.total_value / topStockMax) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #60A5FA, #2563EB)', borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card table-scroll" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr>
                  <th>Item Code</th><th>Name</th><th>Category</th><th>UOM</th><th>Qty on Hand</th><th>Unit Cost</th><th>Total Value</th><th>Status</th>
                </tr></thead>
              <tbody>
                {stockRows.map((row) => (
                  <tr key={row.item_code}>
                    <td><code style={{ fontSize: 11, background: '#EFF6FF', padding: '2px 6px', borderRadius: 4, color: '#3B82F6' }}>{row.item_code}</code></td>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.name}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{row.category}</span></td>
                    <td style={{ color: '#475569' }}>{row.uom}</td>
                    <td><span style={{ fontWeight: 700, color: statusColor(row.status) }}>{row.qty}</span></td>
                    <td>{formatCurrency(row.unit_cost)}</td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{formatCurrency(row.total_value)}</td>
                    <td><span className="badge" style={{ background: `${statusColor(row.status)}14`, color: statusColor(row.status) }}>{row.status === 'out' ? 'Out of Stock' : row.status === 'low' ? 'Low Stock' : 'In Stock'}</span></td>
                  </tr>
                ))}
                <tr style={{ background: '#F8FBFF' }}>
                  <td colSpan={6} style={{ fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>TOTAL INVENTORY VALUE</td>
                  <td style={{ fontWeight: 800, color: '#3B82F6', fontSize: 15 }}>{formatCurrency(totalValue)}</td>
                  <td />
                </tr></tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Cost of Goods Sold' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 18, borderRadius: 18 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>Revenue vs COGS</div>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: '#475569', fontWeight: 700 }}>Revenue</span>
                    <span style={{ color: '#10B981', fontWeight: 800 }}>{formatCurrency(totalRev)}</span>
                  </div>
                  <div style={{ height: 12, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: '#10B981', borderRadius: 999 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                    <span style={{ color: '#475569', fontWeight: 700 }}>COGS</span>
                    <span style={{ color: '#EF4444', fontWeight: 800 }}>{formatCurrency(totalCOGS)}</span>
                  </div>
                  <div style={{ height: 12, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${totalRev === 0 ? 0 : (totalCOGS / totalRev) * 100}%`, height: '100%', background: '#EF4444', borderRadius: 999 }} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>Gross margin</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#2563EB' }}>{marginPct}%</span>
              </div>
            </div>

            <div className="card" style={{ padding: 18, borderRadius: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#DBEAFE', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={16} /></div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Top Products by Margin</h3>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Highest gross profit</p>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {topMarginProducts.map((row) => (
                  <div key={`${row.item_code}-${row.qty_sold}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', flexShrink: 0, marginLeft: 8 }}>{formatCurrency(row.margin)}</span>
                    </div>
                    <div style={{ height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${(row.margin / topMarginMax) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #818CF8, #2563EB)', borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card table-scroll" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr>
                  <th>Item Code</th><th>Name</th><th>Qty Sold</th><th>Unit Cost</th><th>COGS</th><th>Revenue</th><th>Gross Margin</th><th>Margin %</th>
                </tr></thead>
              <tbody>
                {cogsRows.map((row) => (
                  <tr key={`${row.item_code}-${row.qty_sold}`}>
                    <td><code style={{ fontSize: 11, background: '#EFF6FF', padding: '2px 6px', borderRadius: 4, color: '#3B82F6' }}>{row.item_code}</code></td>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.name}</td>
                    <td style={{ fontWeight: 700 }}>{row.qty_sold}</td>
                    <td>{formatCurrency(row.unit_cost)}</td>
                    <td style={{ color: '#EF4444', fontWeight: 600 }}>{formatCurrency(row.cogs)}</td>
                    <td style={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(row.revenue)}</td>
                    <td style={{ fontWeight: 700, color: '#2563EB' }}>{formatCurrency(row.margin)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ height: '100%', width: `${Math.min(row.margin_pct, 100)}%`, background: row.margin_pct > 45 ? '#10B981' : row.margin_pct > 35 ? '#F59E0B' : '#EF4444', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', minWidth: 36 }}>{row.margin_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#F8FBFF' }}>
                  <td colSpan={4} style={{ fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>TOTALS</td>
                  <td style={{ fontWeight: 800, color: '#EF4444' }}>{formatCurrency(totalCOGS)}</td>
                  <td style={{ fontWeight: 800, color: '#10B981' }}>{formatCurrency(totalRev)}</td>
                  <td style={{ fontWeight: 800, color: '#2563EB' }}>{formatCurrency(totalMargin)}</td>
                  <td />
                </tr></tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Aging Inventory' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 18, borderRadius: 18 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>Risk distribution</div>
              <div style={{ display: 'flex', height: 22, borderRadius: 999, overflow: 'hidden', background: '#E2E8F0' }}>
                {riskSegments.map((segment) => (
                  <div key={segment.label} style={{ width: `${(segment.value / riskTotal) * 100}%`, background: segment.color }} title={`${segment.label}: ${segment.value}`} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
                {riskSegments.map((segment) => (
                  <div key={segment.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: segment.color, lineHeight: 1 }}>{segment.value}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{segment.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 18, borderRadius: 18 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>Slow movers (days without movement)</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {agingRows.slice(0, 6).map((row) => (
                  <div key={row.item_code}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: agingColor(row.days_no_movement), flexShrink: 0, marginLeft: 8 }}>{row.days_no_movement}d</span>
                    </div>
                    <div style={{ height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min((row.days_no_movement / 30) * 100, 100)}%`, height: '100%', background: agingColor(row.days_no_movement), borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card table-scroll" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr>
                  <th>Item Code</th><th>Name</th><th>Category</th><th>Qty</th><th>UOM</th><th>Last Movement</th><th>Days No Movement</th><th>Risk</th>
                </tr></thead>
              <tbody>
                {agingRows.map((row) => (
                  <tr key={row.item_code}>
                    <td><code style={{ fontSize: 11, background: '#EFF6FF', padding: '2px 6px', borderRadius: 4, color: '#3B82F6' }}>{row.item_code}</code></td>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.name}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{row.category}</span></td>
                    <td style={{ fontWeight: 700 }}>{row.qty}</td>
                    <td style={{ color: '#475569' }}>{row.uom}</td>
                    <td style={{ color: '#475569', fontSize: 12 }}>{row.last_movement}</td>
                    <td><span style={{ fontWeight: 800, color: agingColor(row.days_no_movement), fontSize: 15 }}>{row.days_no_movement}d</span></td>
                    <td><span className="badge" style={{ background: `${agingColor(row.days_no_movement)}14`, color: agingColor(row.days_no_movement) }}>{row.days_no_movement > 20 ? 'High Risk' : row.days_no_movement > 10 ? 'Medium' : 'Low'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Sales Summary' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>Total Sales</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981', marginTop: 4 }}>{formatCurrency(totalSales)}</div>
            </div>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>Transactions</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{totalTxn}</div>
            </div>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>Avg / Transaction</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', marginTop: 4 }}>{formatCurrency(aov)}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 18, borderRadius: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{range === 'weekly' ? 'Weekly Sales Trend' : 'Daily Sales Trend'}</h3>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Revenue across the selected period</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setRange('daily')} style={{ background: range === 'daily' ? '#DBEAFE' : '#fff', color: range === 'daily' ? '#2563EB' : '#475569' }}>Daily</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setRange('weekly')} style={{ background: range === 'weekly' ? '#DBEAFE' : '#fff', color: range === 'weekly' ? '#2563EB' : '#475569' }}>Weekly</button>
              </div>
            </div>
            <SalesAreaChart rows={salesRows} formatCurrency={formatCurrency} />
          </div>

          <div className="card table-scroll" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr><th>Period</th><th>Transactions</th><th>Total Sales</th><th>Avg per Transaction</th></tr></thead>
              <tbody>
                {salesRows.map((row) => (
                  <tr key={row.sortKey}>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.label}</td>
                    <td style={{ color: '#475569' }}>{row.transactions}</td>
                    <td style={{ fontWeight: 700, color: '#10B981' }}>{formatCurrency(row.sales)}</td>
                    <td style={{ color: '#475569' }}>{formatCurrency(row.transactions === 0 ? 0 : row.sales / row.transactions)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#F8FBFF' }}>
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>TOTAL</td>
                  <td style={{ fontWeight: 700 }}>{totalTxn}</td>
                  <td style={{ fontWeight: 800, color: '#10B981', fontSize: 15 }}>{formatCurrency(totalSales)}</td>
                  <td style={{ color: '#475569' }}>{formatCurrency(aov)}</td>
                </tr></tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
