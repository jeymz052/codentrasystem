'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ShoppingCart, Plus } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import type { PurchaseOrderDraft } from '@/lib/demo-system'

export default function OrdersPage() {
  const { state, createPO, receivePO, formatCurrency } = useDemoSystem()
  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id ?? '')
  const [productId, setProductId] = useState(state.products[0]?.id ?? '')
  const [quantity, setQuantity] = useState('10')
  const [unitCost, setUnitCost] = useState('0')
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const selectedProduct = useMemo(() => state.products.find((product) => product.id === productId), [productId, state.products])

  function handleCreate() {
    if (!supplierId || !productId) return
    const draft: PurchaseOrderDraft = {
      supplier_id: supplierId,
      expected_date: expectedDate,
      notes,
      items: [{
        product_id: productId,
        quantity_ordered: Number(quantity) || 0,
        unit_cost: Number(unitCost) || Number(selectedProduct?.unit_cost ?? 0),
      }],
    }
    createPO(draft)
    setNotes('')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Purchase Orders</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Procurement flow from draft to receiving to stock replenishment.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
          <select className="input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
            {state.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
          <select className="input" value={productId} onChange={(event) => setProductId(event.target.value)}>
            {state.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          <input className="input" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Qty" />
          <input className="input" type="number" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} placeholder="Unit cost" />
          <input className="input" type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginTop: 12 }}>
          <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for the PO" />
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={15} /> Create PO
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Expected</th>
              <th>Items</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.purchaseOrders.map((order) => {
              const supplier = state.suppliers.find((item) => item.id === order.supplier_id)
              const items = state.purchaseOrderItems.filter((item) => item.po_id === order.id)
              const total = items.reduce((sum, item) => sum + Number(item.unit_cost ?? 0) * item.quantity_ordered, 0)
              return (
                <tr key={order.id}>
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>{order.po_number}</td>
                  <td>{supplier?.name ?? '-'}</td>
                  <td><span className="badge badge-blue">{order.status}</span></td>
                  <td>{order.expected_date ?? '-'}</td>
                  <td>{items.length}</td>
                  <td>{formatCurrency(total)}</td>
                  <td>
                    {order.status !== 'received' ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => receivePO(order.id)}>
                        <CheckCircle2 size={14} /> Receive
                      </button>
                    ) : (
                      <span className="badge badge-green">Received</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
