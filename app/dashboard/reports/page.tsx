'use client'

import { useMemo, useState } from 'react'
import { Download, DollarSign, Package, TrendingDown, TrendingUp } from 'lucide-react'
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

export default function ReportsPage() {
  const { state, formatCurrency } = useDemoSystem()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Stock Balance')
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))

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
    () =>
      state.salesTransactionItems.map((item) => {
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
      }),
    [state.products, state.salesTransactionItems]
  )

  const agingRows = useMemo(
    () =>
      state.stockMovements
        .slice()
        .reverse()
        .reduce<Array<{ item_code: string; name: string; category: string; qty: number; uom: string; last_movement: string; days_no_movement: number }>>((rows, movement) => {
          const product = state.products.find((entry) => entry.id === movement.product_id)
          if (!product || rows.some((row) => row.item_code === product.item_code)) return rows
          const lastMovementDate = new Date(movement.created_at)
          const daysNoMovement = Math.max(Math.floor((Date.now() - lastMovementDate.getTime()) / 86400000), 0)
          rows.push({
            item_code: product.item_code,
            name: product.name,
            category: state.categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized',
            qty: product.quantity_on_hand,
            uom: product.uom?.abbreviation ?? 'pcs',
            last_movement: movement.created_at.slice(0, 10),
            days_no_movement: daysNoMovement,
          })
          return rows
        }, []),
    [state.categories, state.products, state.stockMovements]
  )

  const dailySales = useMemo(() => {
    const map = new Map<string, { date: string; sales: number; transactions: number }>()
    for (const transaction of state.salesTransactions.filter((tx) => tx.status === 'completed')) {
      const key = transaction.created_at.slice(0, 10)
      const entry = map.get(key) ?? { date: key, sales: 0, transactions: 0 }
      entry.sales += Number(transaction.total_amount)
      entry.transactions += 1
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [state.salesTransactions])

  const totalValue = stockRows.reduce((sum, row) => sum + row.total_value, 0)
  const totalCOGS = cogsRows.reduce((sum, row) => sum + row.cogs, 0)
  const totalRev = cogsRows.reduce((sum, row) => sum + row.revenue, 0)
  const totalMargin = totalRev - totalCOGS
  const maxSales = Math.max(...dailySales.map((row) => row.sales), 1)

  const statusColor = (status: string) => (status === 'out' ? '#EF4444' : status === 'low' ? '#F59E0B' : '#10B981')
  const agingColor = (days: number) => (days > 20 ? '#EF4444' : days > 10 ? '#F59E0B' : '#10B981')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Inventory Value', value: formatCurrency(totalValue), icon: <Package size={18} />, color: '#3B82F6' },
          { label: 'Total COGS', value: formatCurrency(totalCOGS), icon: <TrendingDown size={18} />, color: '#EF4444' },
          { label: 'Total Revenue', value: formatCurrency(totalRev), icon: <DollarSign size={18} />, color: '#10B981' },
          { label: 'Gross Margin', value: formatCurrency(totalMargin), icon: <TrendingUp size={18} />, color: '#2563EB' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${stat.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, marginBottom: 10 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{stat.label}</div>
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
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="input" style={{ width: 150, height: 34, fontSize: 12 }} />
          <span style={{ color: '#64748B', fontSize: 12 }}>to</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="input" style={{ width: 150, height: 34, fontSize: 12 }} />
          <button
            className="btn btn-ghost btn-sm"
            style={{ gap: 5 }}
            onClick={() => {
              if (tab === 'Stock Balance') exportCSV(stockRows, 'stock_balance')
              else if (tab === 'Cost of Goods Sold') exportCSV(cogsRows, 'cogs_report')
              else if (tab === 'Aging Inventory') exportCSV(agingRows, 'aging_inventory')
              else exportCSV(dailySales, 'sales_summary')
            }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="card table-scroll" style={{ overflow: 'hidden' }}>
        {tab === 'Stock Balance' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Code</th><th>Name</th><th>Category</th><th>UOM</th><th>Qty on Hand</th><th>Unit Cost</th><th>Total Value</th><th>Status</th>
              </tr>
            </thead>
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
              </tr>
            </tbody>
          </table>
        )}

        {tab === 'Cost of Goods Sold' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Code</th><th>Name</th><th>Qty Sold</th><th>Unit Cost</th><th>COGS</th><th>Revenue</th><th>Gross Margin</th><th>Margin %</th>
              </tr>
            </thead>
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
                      <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
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
              </tr>
            </tbody>
          </table>
        )}

        {tab === 'Aging Inventory' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Code</th><th>Name</th><th>Category</th><th>Qty</th><th>UOM</th><th>Last Movement</th><th>Days No Movement</th><th>Risk</th>
              </tr>
            </thead>
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
        )}

        {tab === 'Sales Summary' && (
          <div style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>Daily Sales</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 200, marginBottom: 24, padding: '0 8px' }}>
              {dailySales.map((row) => (
                <div key={row.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{formatCurrency(row.sales)}</span>
                  <div style={{ width: '100%', background: '#EFF6FF', borderRadius: '6px 6px 0 0', position: 'relative', overflow: 'hidden', height: 160 }}>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(to top, #3B82F6, #60A5FA)',
                      borderRadius: '4px 4px 0 0',
                      height: `${(row.sales / maxSales) * 100}%`,
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#475569' }}>{row.date}</span>
                  <span style={{ fontSize: 10, color: '#64748B' }}>{row.transactions} txn</span>
                </div>
              ))}
            </div>

            <table className="data-table">
              <thead><tr><th>Date</th><th>Transactions</th><th>Total Sales</th><th>Avg per Transaction</th></tr></thead>
              <tbody>
                {dailySales.map((row) => (
                  <tr key={row.date}>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.date}</td>
                    <td style={{ color: '#475569' }}>{row.transactions}</td>
                    <td style={{ fontWeight: 700, color: '#10B981' }}>{formatCurrency(row.sales)}</td>
                    <td style={{ color: '#475569' }}>{formatCurrency(row.transactions === 0 ? 0 : row.sales / row.transactions)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#F8FBFF' }}>
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>TOTAL</td>
                  <td style={{ fontWeight: 700 }}>{dailySales.reduce((sum, row) => sum + row.transactions, 0)}</td>
                  <td style={{ fontWeight: 800, color: '#10B981', fontSize: 15 }}>{formatCurrency(dailySales.reduce((sum, row) => sum + row.sales, 0))}</td>
                  <td style={{ color: '#475569' }}>{formatCurrency(dailySales.reduce((sum, row) => sum + row.sales, 0) / Math.max(dailySales.reduce((sum, row) => sum + row.transactions, 0), 1))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
