'use client'

import { useMemo, useState } from 'react'
import { ArrowLeftRight, Filter } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'

export default function MovementsPage() {
  const { state, formatCurrency } = useDemoSystem()
  const [typeFilter, setTypeFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')

  const movements = useMemo(() => {
    return state.stockMovements
      .slice()
      .reverse()
      .filter((movement) => {
        const matchesType = typeFilter === 'all' || movement.movement_type === typeFilter
        const matchesProduct = productFilter === 'all' || movement.product_id === productFilter
        return matchesType && matchesProduct
      })
  }, [state.stockMovements, typeFilter, productFilter])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Stock Movements</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Every inbound, outbound, adjustment, and production event in one audit trail.</p>
        </div>
        <div className="card" style={{ padding: '10px 12px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} color="#64748B" />
          <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ width: 170, height: 34, fontSize: 12 }}>
            <option value="all">All Types</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="adjustment">Adjustment</option>
            <option value="return">Return</option>
            <option value="production">Production</option>
          </select>
          <select className="input" value={productFilter} onChange={(event) => setProductFilter(event.target.value)} style={{ width: 230, height: 34, fontSize: 12 }}>
            <option value="all">All Products</option>
            {state.products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
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
              const color = movement.movement_type === 'outbound' ? '#EF4444' : movement.movement_type === 'inbound' ? '#10B981' : '#8B5CF6'
              return (
                <tr key={movement.id}>
                  <td style={{ color: '#475569', fontSize: 12 }}>{new Date(movement.created_at).toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{product?.name ?? 'Unknown item'}</td>
                  <td><span className="badge" style={{ background: `${color}14`, color }}>{movement.movement_type}</span></td>
                  <td style={{ fontWeight: 700, color }}>{movement.quantity}</td>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 18 }}>
        {[
          { label: 'Inbound', value: state.stockMovements.filter((movement) => movement.movement_type === 'inbound').length, color: '#10B981' },
          { label: 'Outbound', value: state.stockMovements.filter((movement) => movement.movement_type === 'outbound').length, color: '#EF4444' },
          { label: 'Total Value', value: formatCurrency(state.products.reduce((sum, product) => sum + Number(product.unit_cost ?? 0) * Number(product.quantity_on_hand), 0)), color: '#3B82F6' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#64748B' }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
