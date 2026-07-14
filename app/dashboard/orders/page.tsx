'use client'

import { useMemo, useState } from 'react'
import { Ban, CalendarDays, CalendarCheck, CheckCircle2, Clock3, DollarSign, Edit2, Eye, Package, Plus, ShoppingCart, Truck, X } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import type { PurchaseOrderDraft } from '@/lib/demo-system'
import type { PurchaseOrder } from '@/types/database'
import { useTableState } from '@/lib/use-table-state'
import { TableToolbar } from '@/components/ui/table/TableToolbar'
import { SortHeader } from '@/components/ui/table/SortHeader'
import { Pagination } from '@/components/ui/table/Pagination'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

type PoForm = {
  supplierId: string
  productId: string
  quantity: string
  unitCost: string
  expectedDate: string
  deliveryDate: string
  notes: string
}

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY_FORM: PoForm = {
  supplierId: '',
  productId: '',
  quantity: '10',
  unitCost: '',
  expectedDate: TODAY,
  deliveryDate: '',
  notes: '',
}

export default function OrdersPage() {
  const { state, createPO, receivePO, updatePO, cancelPO, formatCurrency } = useDemoSystem()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState<PoForm>(() => ({
    ...EMPTY_FORM,
    supplierId: state.suppliers[0]?.id ?? '',
    productId: state.products[0]?.id ?? '',
  }))
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PoForm>(() => ({
    ...EMPTY_FORM,
    supplierId: state.suppliers[0]?.id ?? '',
    productId: state.products[0]?.id ?? '',
  }))
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)

  const ordersWithTotals = useMemo(
    () =>
      [...state.purchaseOrders]
        .map((order) => ({
          ...order,
          total: state.purchaseOrderItems
            .filter((item) => item.po_id === order.id)
            .reduce((sum, item) => sum + Number(item.unit_cost ?? 0) * item.quantity_ordered, 0),
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [state.purchaseOrders, state.purchaseOrderItems]
  )

  const STATUS_FILTERS = [
    { value: 'all', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_approval', label: 'Pending approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'partially_received', label: 'Partially received' },
    { value: 'received', label: 'Received' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const table = useTableState({
    data: ordersWithTotals,
    initialSort: { key: 'created_at', direction: 'desc' },
    searchKeys: (order) => {
      const supplier = state.suppliers.find((entry) => entry.id === order.supplier_id)
      return [supplier?.name ?? '', order.po_number, order.notes ?? '']
    },
    filterFields: [
      {
        key: 'status',
        label: 'Status',
        options: STATUS_FILTERS,
        getValue: (order) => order.status,
      },
    ],
  })

  const selectedProduct = useMemo(() => state.products.find((product) => product.id === form.productId), [form.productId, state.products])
  const selectedSupplier = useMemo(() => state.suppliers.find((supplier) => supplier.id === form.supplierId), [form.supplierId, state.suppliers])
  const selectedEditProduct = useMemo(() => state.products.find((product) => product.id === editForm.productId), [editForm.productId, state.products])

  // Only suggest products that belong to the selected supplier.
  const productsForSupplier = useMemo(() => {
    const map = new Map<string, typeof state.products>()
    for (const supplier of state.suppliers) {
      map.set(supplier.id, state.products.filter((product) => product.supplier_id === supplier.id))
    }
    return map
  }, [state.suppliers, state.products])

  const filteredProducts = productsForSupplier.get(form.supplierId) ?? []
  const filteredEditProducts = productsForSupplier.get(editForm.supplierId) ?? []

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
      unitCost: '',
      expectedDate: TODAY,
      deliveryDate: '',
      notes: '',
    })
  }

  function handleSupplierChange(value: string) {
    setForm((current) => {
      const supplierProducts = productsForSupplier.get(value) ?? []
      const stillValid = supplierProducts.some((product) => product.id === current.productId)
      return { ...current, supplierId: value, productId: stillValid ? current.productId : '' }
    })
  }

  function handleEditSupplierChange(value: string) {
    setEditForm((current) => {
      const supplierProducts = productsForSupplier.get(value) ?? []
      const stillValid = supplierProducts.some((product) => product.id === current.productId)
      return { ...current, supplierId: value, productId: stillValid ? current.productId : '' }
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
      delivery_date: form.deliveryDate,
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

  const filtered = table.sortedAndFiltered

  function openEdit(order: PurchaseOrder) {
    const items = state.purchaseOrderItems.filter((item) => item.po_id === order.id)
    const first = items[0]
    setEditId(order.id)
    setEditForm({
      supplierId: order.supplier_id,
      productId: first?.product_id ?? state.products[0]?.id ?? '',
      quantity: String(first?.quantity_ordered ?? 10),
      unitCost: String(first?.unit_cost ?? 0),
      expectedDate: order.expected_date ?? TODAY,
      deliveryDate: order.delivery_date ?? '',
      notes: order.notes ?? '',
    })
  }

  function handleEditSave() {
    if (!editId || !editForm.supplierId || !editForm.productId) return
    const draft: PurchaseOrderDraft = {
      supplier_id: editForm.supplierId,
      expected_date: editForm.expectedDate,
      delivery_date: editForm.deliveryDate,
      notes: editForm.notes,
      items: [
        {
          product_id: editForm.productId,
          quantity_ordered: Number(editForm.quantity) || 0,
          unit_cost: Number(editForm.unitCost) || Number(selectedEditProduct?.unit_cost ?? 0),
        },
      ],
    }
    updatePO(editId, draft)
    setEditId(null)
  }

  function confirmCancel() {
    if (cancelId) cancelPO(cancelId)
    setCancelId(null)
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

      <TableToolbar
        search={table.search}
        onSearch={table.setSearch}
        searchPlaceholder="Search by supplier, PO number, or notes..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: table.filters.status,
            onChange: (value) => table.setFilter('status', value),
            options: STATUS_FILTERS,
          },
        ]}
        showReset={table.totalItems !== state.purchaseOrders.length || Boolean(table.search)}
        onReset={table.resetFilters}
      />

      <section className="card table-scroll" style={{ overflow: 'hidden', borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Purchase orders</h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Newest procurement records and receiving status.</p>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{table.totalItems} of {state.purchaseOrders.length}</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
                <SortHeader label="PO Number" column="po_number" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <th>Supplier</th>
                <SortHeader label="Status" column="status" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <th>Material Description</th>
                <th>UoM</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <SortHeader label="Expected" column="expected_date" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <SortHeader label="Delivery" column="delivery_date" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <SortHeader label="Total" column="total" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <th style={{ width: 140, textAlign: 'left' }}>Action</th>
              </tr></thead>
            <tbody>
              {table.paginated.map((order) => {
                const supplier = state.suppliers.find((item) => item.id === order.supplier_id)
                const items = state.purchaseOrderItems.filter((item) => item.po_id === order.id)
                const total = items.reduce((sum, item) => sum + Number(item.unit_cost ?? 0) * item.quantity_ordered, 0)
                const statusColor = order.status === 'received' ? '#10B981' : order.status === 'ordered' ? '#3B82F6' : order.status === 'approved' ? '#8B5CF6' : order.status === 'cancelled' ? '#DC2626' : '#F59E0B'
                const firstItem = items[0]
                const material = firstItem?.product ?? state.products.find((product) => product.id === firstItem?.product_id)
                const uom = material?.uom?.abbreviation ?? 'pcs'

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
                    <td>
                      {material ? (
                        <div style={{ minWidth: 160 }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{material.name}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{material.description ?? material.item_code}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: '#475569' }}>{uom}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>{firstItem ? firstItem.quantity_ordered : 0}</td>
                    <td style={{ color: '#475569' }}>{order.expected_date ?? '-'}</td>
                    <td style={{ color: '#475569' }}>{order.delivery_date ?? '-'}</td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{formatCurrency(total)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewId(order.id)} style={{ padding: '4px 8px' }} title="View purchase order"><Eye size={14} /></button>
                        {order.status === 'received' ? (
                          <span className="badge badge-green">Received</span>
                        ) : order.status === 'cancelled' ? (
                          <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>Cancelled</span>
                        ) : (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(order)} style={{ padding: '4px 8px' }} title="Edit purchase order"><Edit2 size={14} /></button>
                            <button className="btn btn-ghost btn-sm" onClick={() => receivePO(order.id)} style={{ padding: '4px 8px', color: '#10B981' }} title="Receive purchase order"><CheckCircle2 size={14} /></button>
                            <button className="btn btn-danger btn-sm" onClick={() => setCancelId(order.id)} style={{ padding: '4px 8px' }} title="Cancel purchase order"><Ban size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {table.paginated.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                    <Package size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
                    <p>No purchase orders found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Pagination
        page={table.page}
        totalPages={table.totalPages}
        onPageChange={table.setPage}
        pageSize={table.pageSize}
        onPageSizeChange={table.setPageSize}
        rangeStart={table.range.start}
        rangeEnd={table.range.end}
        totalItems={table.totalItems}
      />

      {showCreateModal && (
        <div className="modal-overlay">
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
                <SearchableSelect
                  className="auth-select"
                  placeholder="Supplier"
                  searchPlaceholder="Search suppliers..."
                  value={form.supplierId}
                  onChange={handleSupplierChange}
                  options={state.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                />
              </label>

              <label className="auth-field">
                <span>Product</span>
                <SearchableSelect
                  className="auth-select"
                  placeholder={form.supplierId ? 'Product' : 'Select a supplier first'}
                  searchPlaceholder="Search products..."
                  value={form.productId}
                  onChange={(value) => setForm((current) => ({ ...current, productId: value }))}
                  options={filteredProducts.map((product) => ({ value: product.id, label: product.name }))}
                />
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

              <label className="auth-field">
                <span>Delivery date</span>
                <div className="auth-input-wrap">
                  <CalendarCheck size={14} />
                  <input className="input" type="date" value={form.deliveryDate} onChange={(event) => setForm((current) => ({ ...current, deliveryDate: event.target.value }))} />
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

      {editId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <div>
                <div className="auth-badge" style={{ marginBottom: 10 }}>
                  <Edit2 size={14} />
                  Edit purchase order
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>Edit PO</h3>
                <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Update supplier, item, and delivery details before receiving.</p>
              </div>
              <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <label className="auth-field">
                <span>Supplier</span>
                <SearchableSelect
                  className="auth-select"
                  placeholder="Supplier"
                  searchPlaceholder="Search suppliers..."
                  value={editForm.supplierId}
                  onChange={handleEditSupplierChange}
                  options={state.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                />
              </label>

              <label className="auth-field">
                <span>Product</span>
                <SearchableSelect
                  className="auth-select"
                  placeholder={editForm.supplierId ? 'Product' : 'Select a supplier first'}
                  searchPlaceholder="Search products..."
                  value={editForm.productId}
                  onChange={(value) => setEditForm((current) => ({ ...current, productId: value }))}
                  options={filteredEditProducts.map((product) => ({ value: product.id, label: product.name }))}
                />
              </label>

              <label className="auth-field">
                <span>Quantity</span>
                <div className="auth-input-wrap">
                  <input className="input" type="number" value={editForm.quantity} onChange={(event) => setEditForm((current) => ({ ...current, quantity: event.target.value }))} />
                </div>
              </label>

              <label className="auth-field">
                <span>Unit cost</span>
                <div className="auth-input-wrap">
                  <input className="input" type="number" value={editForm.unitCost} onChange={(event) => setEditForm((current) => ({ ...current, unitCost: event.target.value }))} />
                </div>
              </label>

              <label className="auth-field">
                <span>Expected date</span>
                <div className="auth-input-wrap">
                  <CalendarDays size={14} />
                  <input className="input" type="date" value={editForm.expectedDate} onChange={(event) => setEditForm((current) => ({ ...current, expectedDate: event.target.value }))} />
                </div>
              </label>

              <label className="auth-field">
                <span>Delivery date</span>
                <div className="auth-input-wrap">
                  <CalendarCheck size={14} />
                  <input className="input" type="date" value={editForm.deliveryDate} onChange={(event) => setEditForm((current) => ({ ...current, deliveryDate: event.target.value }))} />
                </div>
              </label>

              <label className="auth-field" style={{ gridColumn: '1 / -1' }}>
                <span>Notes</span>
                <textarea
                  className="input"
                  value={editForm.notes}
                  onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional notes for the PO"
                  style={{ height: 90, resize: 'none' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave}>
                <ShoppingCart size={15} /> Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Ban size={24} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Cancel Purchase Order?</h3>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>This marks the order as cancelled. It can no longer be received.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setCancelId(null)}>Keep open</button>
              <button className="btn btn-danger" onClick={confirmCancel}>Cancel order</button>
            </div>
          </div>
        </div>
      )}

      {viewId && (() => {
        const order = state.purchaseOrders.find((entry) => entry.id === viewId)
        if (!order) return null
        const supplier = state.suppliers.find((entry) => entry.id === order.supplier_id)
        const items = state.purchaseOrderItems.filter((item) => item.po_id === order.id)
        const statusColor = order.status === 'received' ? '#10B981' : order.status === 'ordered' ? '#3B82F6' : order.status === 'approved' ? '#8B5CF6' : order.status === 'cancelled' ? '#DC2626' : '#F59E0B'
        const total = items.reduce((sum, item) => sum + Number(item.unit_cost ?? 0) * item.quantity_ordered, 0)
        return (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 720 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div>
                  <div className="auth-badge" style={{ marginBottom: 10 }}>
                    <Eye size={14} />
                    Purchase order details
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>{order.po_number}</h3>
                  <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Read-only view of this purchase order.</p>
                </div>
                <button onClick={() => setViewId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Supplier</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{supplier?.name ?? '-'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Status</div>
                  <div style={{ marginTop: 4 }}><span className="badge" style={{ background: `${statusColor}14`, color: statusColor, textTransform: 'capitalize' }}>{order.status.replaceAll('_', ' ')}</span></div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Expected Date</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{order.expected_date ?? '-'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Delivery Date</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{order.delivery_date ?? '-'}</div>
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Notes</div>
                <div style={{ fontWeight: 500, color: '#475569', marginTop: 4 }}>{order.notes ?? 'No notes'}</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Items ({items.length})</div>
              <div style={{ maxHeight: 280, overflowY: 'auto', borderRadius: 8, border: '1px solid #D8E4F2' }}>
                <table className="data-table">
                  <thead><tr>
                      <th>Material</th>
                      <th>Description</th>
                      <th>UoM</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ textAlign: 'right' }}>Line Total</th>
                    </tr></thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#94A3B8' }}>No items</td></tr>
                    ) : items.map((item) => {
                      const product = item.product ?? state.products.find((entry) => entry.id === item.product_id)
                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600, color: '#0F172A' }}>{product?.name ?? 'Unknown'}</td>
                          <td style={{ fontSize: 12, color: '#64748B' }}>{product?.description ?? product?.item_code ?? '-'}</td>
                          <td style={{ color: '#475569' }}>{product?.uom?.abbreviation ?? 'pcs'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity_ordered}</td>
                          <td style={{ textAlign: 'right', color: '#475569' }}>{formatCurrency(Number(item.unit_cost ?? 0))}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>{formatCurrency(Number(item.unit_cost ?? 0) * item.quantity_ordered)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>{formatCurrency(total)}</span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button className="btn btn-primary" onClick={() => setViewId(null)}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
