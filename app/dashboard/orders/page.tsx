'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, CalendarDays, Clock3, DollarSign, Package, Plus, ShoppingCart, Truck, X } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import type { PurchaseOrderDraft } from '@/lib/demo-system'

type PoForm = {
  supplierId: string
  productId: string
  quantity: string
  unitCost: string
  expectedDate: string
  notes: string
}

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY_FORM: PoForm = {
  supplierId: '',
  productId: '',
  quantity: '10',
  unitCost: '0',
  expectedDate: TODAY,
  notes: '',
}

export default function OrdersPage() {
  const { state, createPO, receivePO, formatCurrency } = useDemoSystem()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState<PoForm>(() => ({
    ...EMPTY_FORM,
    supplierId: state.suppliers[0]?.id ?? '',
    productId: state.products[0]?.id ?? '',
  }))

  const selectedProduct = useMemo(() => state.products.find((product) => product.id === form.productId), [form.productId, state.products])
  const selectedSupplier = useMemo(() => state.suppliers.find((supplier) => supplier.id === form.supplierId), [form.supplierId, state.suppliers])

  const summary = useMemo(() => {
    const totalOrders = state.purchaseOrders.length
    const draftOrders = state.purchaseOrders.filter((order) => order.status === 'draft').length
    const receivedOrders = state.purchaseOrders.filter((order) => order.status === 'received').length
    const pendingOrders = totalOrders - receivedOrders
    const orderValue = state.purchaseOrders.reduce((sum, order) => {
      const items = state.purchaseOrderItems.filter((item) => item.po_id === order.id)
      return sum + items.reduce((itemSum, item) => itemSum + Number(item.unit_cost ?? 0) * item.quantity_ordered, 0)
    }, 0)

    return [
      { label: 'Total POs', value: String(totalOrders), hint: 'All procurement records', icon: ShoppingCart, color: '#3B82F6', tint: '#DBEAFE' },
      { label: 'Drafts', value: String(draftOrders), hint: 'Not yet received', icon: Clock3, color: '#8B5CF6', tint: '#EDE9FE' },
      { label: 'Received', value: String(receivedOrders), hint: 'Already stocked in', icon: CheckCircle2, color: '#10B981', tint: '#D1FAE5' },
      { label: 'Pending', value: String(pendingOrders), hint: 'Still in progress', icon: Truck, color: '#F59E0B', tint: '#FEF3C7' },
      { label: 'PO Value', value: formatCurrency(orderValue), hint: 'Estimated total spend', icon: DollarSign, color: '#0F172A', tint: '#E2E8F0' },
    ]
  }, [state.purchaseOrders, state.purchaseOrderItems, formatCurrency])

  function resetForm() {
    setForm({
      supplierId: state.suppliers[0]?.id ?? '',
      productId: state.products[0]?.id ?? '',
      quantity: '10',
      unitCost: '0',
      expectedDate: TODAY,
      notes: '',
    })
  }

  function openCreate() {
    resetForm()
    setShowCreateModal(true)
  }

  function handleCreate() {
    if (!form.supplierId || !form.productId) return

    const draft: PurchaseOrderDraft = {
      supplier_id: form.supplierId,
      expected_date: form.expectedDate,
      notes: form.notes,
      items: [
        {
          product_id: form.productId,
          quantity_ordered: Number(form.quantity) || 0,
          unit_cost: Number(form.unitCost) || Number(selectedProduct?.unit_cost ?? 0),
        },
      ],
    }

    createPO(draft)
    setShowCreateModal(false)
    resetForm()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card" style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 760 }}>
            <div className="auth-badge" style={{ marginBottom: 14 }}>
              <ShoppingCart size={14} />
              Procurement workspace
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.05em', lineHeight: 1.05 }}>
              Purchase Orders
            </h2>
          </div>

          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} /> Create PO
          </button>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {summary.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="card"
              style={{
                padding: 18,
                borderRadius: 18,
                borderColor: item.tint,
                background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: item.tint,
                    color: item.color,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.65)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: item.label === 'PO Value' ? 18 : 24, fontWeight: 900, color: item.color, letterSpacing: '-0.04em', marginTop: 4 }}>
                    {item.value}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 10, lineHeight: 1.4 }}>{item.hint}</div>
            </div>
          )
        })}
      </section>

      <section className="card table-scroll" style={{ overflow: 'hidden', borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Purchase orders</h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Newest procurement records and receiving status.</p>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>Use Create PO to add a new record</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
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
                const statusColor = order.status === 'received' ? '#10B981' : order.status === 'ordered' ? '#3B82F6' : order.status === 'approved' ? '#8B5CF6' : '#F59E0B'

                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{order.po_number}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{supplier?.name ?? '-'}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{supplier?.lead_days ? `${supplier.lead_days} day lead time` : 'No lead time'}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${statusColor}14`, color: statusColor, textTransform: 'capitalize' }}>
                        {order.status.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: '#475569' }}>{order.expected_date ?? '-'}</td>
                    <td style={{ color: '#475569' }}>{items.length}</td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{formatCurrency(total)}</td>
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
              {state.purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                    <Package size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
                    <p>No purchase orders yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateModal && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <div>
                <div className="auth-badge" style={{ marginBottom: 10 }}>
                  <Plus size={14} />
                  Create purchase order
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>New PO</h3>
                <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Open a popup, enter the supplier and item details, then save the order.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <label className="auth-field">
                <span>Supplier</span>
                <select className="auth-select" value={form.supplierId} onChange={(event) => setForm((current) => ({ ...current, supplierId: event.target.value }))}>
                  {state.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>

              <label className="auth-field">
                <span>Product</span>
                <select className="auth-select" value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}>
                  {state.products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </label>

              <label className="auth-field">
                <span>Quantity</span>
                <div className="auth-input-wrap">
                  <input className="input" type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
                </div>
              </label>

              <label className="auth-field">
                <span>Unit cost</span>
                <div className="auth-input-wrap">
                  <input className="input" type="number" value={form.unitCost} onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value }))} />
                </div>
              </label>

              <label className="auth-field">
                <span>Expected date</span>
                <div className="auth-input-wrap">
                  <CalendarDays size={14} />
                  <input className="input" type="date" value={form.expectedDate} onChange={(event) => setForm((current) => ({ ...current, expectedDate: event.target.value }))} />
                </div>
              </label>

              <div className="auth-field">
                <span>Preview</span>
                <div className="auth-helper" style={{ minHeight: 52, display: 'flex', alignItems: 'center' }}>
                  {selectedProduct && selectedSupplier ? (
                    <span>
                      {form.quantity || 0} x {selectedProduct.name} from {selectedSupplier.name}
                    </span>
                  ) : (
                    <span>Select supplier and product to preview.</span>
                  )}
                </div>
              </div>

              <label className="auth-field" style={{ gridColumn: '1 / -1' }}>
                <span>Notes</span>
                <textarea
                  className="input"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional notes for the PO"
                  style={{ height: 90, resize: 'none' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>
                <ShoppingCart size={15} /> Create PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
