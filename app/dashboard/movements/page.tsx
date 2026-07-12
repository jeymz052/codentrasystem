'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeftRight, Filter, Package, Search, SlidersHorizontal } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { formatTimestamp } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  adjustment: 'Adjustment',
  return: 'Return',
  production: 'Production',
  waste: 'Waste',
  defect: 'Defect',
  reject: 'Reject',
}

const TYPE_COLORS: Record<string, string> = {
  inbound: '#10B981',
  outbound: '#EF4444',
  adjustment: '#8B5CF6',
  return: '#F59E0B',
  production: '#3B82F6',
  waste: '#F97316',
  defect: '#EF4444',
  reject: '#F43F5E',
}

export default function MovementsPage() {
  const { state } = useDemoSystem()
  const [typeFilter, setTypeFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [search, setSearch] = useState('')

  const movements = useMemo(() => {
    const query = search.trim().toLowerCase()

    return state.stockMovements
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .filter((movement) => {
        const matchesType = typeFilter === 'all' || movement.movement_type === typeFilter
        const matchesProduct = productFilter === 'all' || movement.product_id === productFilter
        const product = state.products.find((entry) => entry.id === movement.product_id)
        const haystack = [
          product?.name,
          product?.item_code,
          movement.reference_type,
          movement.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        const matchesSearch = !query || haystack.includes(query)

        return matchesType && matchesProduct && matchesSearch
      })
  }, [state.stockMovements, state.products, typeFilter, productFilter, search])

  const summary = useMemo(() => {
    const inbound = state.stockMovements.filter((movement) => movement.movement_type === 'inbound')
    const outbound = state.stockMovements.filter((movement) => movement.movement_type === 'outbound')
    const adjustments = state.stockMovements.filter((movement) => movement.movement_type === 'adjustment')
    const production = state.stockMovements.filter((movement) => movement.movement_type === 'production')
    const waste = state.stockMovements.filter(
      (movement) => movement.movement_type === 'waste' || movement.movement_type === 'defect' || movement.movement_type === 'reject'
    )
    const totalUnits = state.stockMovements.reduce((sum, movement) => sum + Number(movement.quantity ?? 0), 0)

    return [
      { label: 'Total movements', value: String(state.stockMovements.length), hint: 'Audit trail entries', color: '#0F172A' },
      { label: 'Inbound', value: String(inbound.length), hint: `${inbound.reduce((sum, movement) => sum + Number(movement.quantity ?? 0), 0)} units`, color: '#10B981' },
      { label: 'Outbound', value: String(outbound.length), hint: `${outbound.reduce((sum, movement) => sum + Number(movement.quantity ?? 0), 0)} units`, color: '#EF4444' },
      { label: 'Adjustments', value: String(adjustments.length), hint: `${adjustments.reduce((sum, movement) => sum + Number(movement.quantity ?? 0), 0)} units adjusted`, color: '#8B5CF6' },
      { label: 'Production', value: String(production.length), hint: `${production.reduce((sum, movement) => sum + Number(movement.quantity ?? 0), 0)} units made`, color: '#3B82F6' },
      { label: 'Waste / Defect / Reject', value: String(waste.length), hint: `${waste.reduce((sum, movement) => sum + Number(movement.quantity ?? 0), 0)} units written off`, color: '#F97316' },
      { label: 'Units moved', value: String(totalUnits), hint: 'All movement quantities', color: '#0EA5E9' },
    ]
  }, [state.stockMovements, state.products])

  const latestMovements = movements.slice(0, 3)

  function clearFilters() {
    setTypeFilter('all')
    setProductFilter('all')
    setSearch('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card" style={{ padding: 24, borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 720 }}>
            <div className="auth-badge" style={{ marginBottom: 14 }}>
              <ArrowLeftRight size={14} />
              Stock movement ledger
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.05em', lineHeight: 1.05 }}>
              Stock Movements
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/dashboard/inventory" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              <Package size={15} /> Inventory
            </Link>
            <button className="btn btn-primary" type="button" onClick={clearFilters}>
              <SlidersHorizontal size={15} /> Reset filters
            </button>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        {summary.map((item) => (
          <div key={item.label} className="card" style={{ padding: '16px 18px', borderRadius: 18 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>
              {item.value}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{item.hint}</div>
          </div>
        ))}
      </section>

      <section className="card" style={{ padding: 16, borderRadius: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              className="input"
              placeholder="Search by product, code, notes, or reference..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ height: 42, paddingLeft: 38, borderRadius: 12, background: '#fff' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Filter size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <select
              className="input"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              style={{ height: 42, paddingLeft: 38, borderRadius: 12 }}
            >
              <option value="all">All types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <select
            className="input"
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            style={{ height: 42, borderRadius: 12 }}
          >
            <option value="all">All products</option>
            {state.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card" style={{ overflow: 'hidden', borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Movement history</h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
              Showing {movements.length} filtered record{movements.length === 1 ? '' : 's'}.
            </p>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>Newest first</div>
        </div>

        {movements.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <ArrowLeftRight size={36} style={{ color: '#CBD5E1', marginBottom: 10 }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>No movements found</h4>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>Try clearing filters or check back after sales, receiving, or adjustments.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const product = state.products.find((entry) => entry.id === movement.product_id)
                  const color = TYPE_COLORS[movement.movement_type] ?? '#64748B'
                  return (
                    <tr key={movement.id}>
                      <td style={{ color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>{formatTimestamp(movement.created_at)}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{product?.name ?? 'Unknown item'}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{product?.item_code ?? 'No code'}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: `${color}14`, color, textTransform: 'capitalize' }}>
                          {TYPE_LABELS[movement.movement_type] ?? movement.movement_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color, whiteSpace: 'nowrap' }}>{movement.quantity}</td>
                      <td>{movement.quantity_before}</td>
                      <td>{movement.quantity_after}</td>
                      <td style={{ color: '#475569' }}>{movement.reference_type ?? '-'}</td>
                      <td style={{ color: '#475569' }}>{movement.notes ?? '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {latestMovements.map((movement) => {
          const product = state.products.find((entry) => entry.id === movement.product_id)
          const color = TYPE_COLORS[movement.movement_type] ?? '#64748B'
          return (
            <div key={movement.id} className="card" style={{ padding: 16, borderRadius: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{formatTimestamp(movement.created_at)}</div>
                  <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{product?.name ?? 'Unknown item'}</div>
                  <div style={{ marginTop: 2, fontSize: 12, color: '#64748B' }}>{movement.reference_type ?? 'Manual movement'}</div>
                </div>
                <span className="badge" style={{ background: `${color}14`, color, textTransform: 'capitalize' }}>
                  {TYPE_LABELS[movement.movement_type] ?? movement.movement_type}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 16 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color }}>{movement.quantity}</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>units moved</span>
              </div>

              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, fontSize: 12 }}>
                <div style={{ padding: 12, borderRadius: 12, background: '#F8FAFC' }}>
                  <div style={{ color: '#94A3B8' }}>Before</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{movement.quantity_before}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: '#F8FAFC' }}>
                  <div style={{ color: '#94A3B8' }}>After</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{movement.quantity_after}</div>
                </div>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
