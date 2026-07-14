'use client'

import { useMemo, useState } from 'react'
import { Building2, Clock3, Eye, Pencil, Plus, Save, Search, Truck, Trash2, Users, X } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { getRolePermissions } from '@/lib/access-control'
import { useTableState } from '@/lib/use-table-state'
import { TableToolbar } from '@/components/ui/table/TableToolbar'
import { SortHeader } from '@/components/ui/table/SortHeader'
import { Pagination } from '@/components/ui/table/Pagination'
import { SelectAllCheckbox, RowCheckbox, BulkActionBar } from '@/components/ui/table/TableSelection'

const EMPTY = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  lead_days: '7',
  notes: '',
}

type SupplierForm = typeof EMPTY

export default function SuppliersPage() {
  const { state, availableTenants, activeTenantId, addSupplier, editSupplier, removeSupplier, removeSuppliers, requestDeletion } = useDemoSystem()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? 'admin'
  const perms = getRolePermissions(role)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierForm>(EMPTY)
  const [showModal, setShowModal] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)

  const table = useTableState({
    data: state.suppliers,
    searchKeys: (supplier) => [
      supplier.name,
      supplier.contact_name,
      supplier.email,
      supplier.phone,
      supplier.address,
    ].filter(Boolean) as string[],
  })

  function handleDeleteSelected() {
    if (!perms.canDeleteRecords) {
      requestDeletion('removeSuppliers', 'supplier', table.selectedIds[0] ?? '', { supplier_ids: table.selectedIds })
      setBulkConfirm(false)
      table.clearSelection()
      return
    }
    removeSuppliers(table.selectedIds)
    setBulkConfirm(false)
    table.clearSelection()
  }

  const summary = useMemo(() => {
    const avgLead = state.suppliers.length
      ? Math.round(state.suppliers.reduce((sum, supplier) => sum + supplier.lead_days, 0) / state.suppliers.length)
      : 0
    return [
      { label: 'Suppliers', value: String(state.suppliers.length), hint: 'Total vendor records', icon: Truck, color: '#3B82F6', tint: '#DBEAFE' },
      { label: 'Filtered', value: String(table.totalItems), hint: 'Matches current search', icon: Users, color: '#8B5CF6', tint: '#EDE9FE' },
      { label: 'Avg lead time', value: `${avgLead} days`, hint: 'Across all suppliers', icon: Clock3, color: '#F59E0B', tint: '#FEF3C7' },
    ]
  }, [table.totalItems, state.suppliers])

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setShowModal(true)
  }

  function startEdit(id: string) {
    const supplier = state.suppliers.find((item) => item.id === id)
    if (!supplier) return
    setEditingId(id)
    setForm({
      name: supplier.name,
      contact_name: supplier.contact_name ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      lead_days: String(supplier.lead_days),
      notes: supplier.notes ?? '',
    })
    setShowModal(true)
  }

  function handleSave() {
    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      lead_days: Number(form.lead_days) || 7,
      notes: form.notes.trim(),
    }

    if (!payload.name) return

    if (editingId) editSupplier(editingId, payload)
    else addSupplier(payload)

    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card" style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 760 }}>
            <div className="auth-badge" style={{ marginBottom: 14 }}>
              <Truck size={14} />
              Supplier directory
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.05em', lineHeight: 1.05 }}>
              Suppliers
            </h2>
          </div>

          <button className="btn btn-primary" onClick={startCreate}>
            <Plus size={15} /> New Supplier
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
                  <div style={{ fontSize: item.label === 'Avg lead time' ? 18 : 24, fontWeight: 900, color: item.color, letterSpacing: '-0.04em', marginTop: 4 }}>
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
        searchPlaceholder="Search supplier name, contact, phone, email, or address..."
        showReset={table.totalItems !== state.suppliers.length || Boolean(table.search)}
        onReset={table.resetFilters}
      />

      <BulkActionBar
        count={table.selectedCount}
        onClear={table.clearSelection}
        onDelete={() => setBulkConfirm(true)}
        deleteLabel={`Delete ${table.selectedCount} selected`}
      />

      <section className="card" style={{ overflow: 'hidden', borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Suppliers</h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Manage contacts, lead times, and notes from one table.</p>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>Click Edit to open the popup</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
                <th style={{ width: 36 }}>
                  <SelectAllCheckbox
                    checked={table.isAllFilteredSelected}
                    indeterminate={table.isSomeFilteredSelected}
                    onToggle={table.selectAllFiltered}
                    disabled={table.totalItems === 0}
                  />
                </th>
                <SortHeader label="Name" column="name" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <th>Contact</th>
                <SortHeader label="Lead Time" column="lead_days" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} align="right" />
                <th>Phone</th>
                <th>Email</th>
                <th style={{ width: 80, textAlign: 'right' }}>Action</th>
              </tr></thead>
            <tbody>
              {table.paginated.map((supplier) => {
                const isSelected = table.selected.has(supplier.id)
                return (
                  <tr key={supplier.id} style={isSelected ? { background: '#EFF6FF' } : undefined}>
                    <td>
                      <RowCheckbox checked={isSelected} onToggle={() => table.toggleSelect(supplier.id)} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{supplier.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{supplier.address ?? 'No address'}</div>
                    </td>
                    <td>{supplier.contact_name ?? '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge badge-blue" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                        {supplier.lead_days} days
                      </span>
                    </td>
                    <td>{supplier.phone ?? '-'}</td>
                    <td>{supplier.email ?? '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => setViewId(supplier.id)} title="View supplier"><Eye size={13} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => startEdit(supplier.id)} title="Edit supplier">
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => {
                          if (!perms.canDeleteRecords) {
                            requestDeletion('removeSupplier', 'supplier', supplier.id, { name: supplier.name })
                            return
                          }
                          removeSupplier(supplier.id)
                        }} title="Delete supplier">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {table.paginated.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                    <Building2 size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
                    <p>No suppliers found</p>
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

      {bulkConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Delete {table.selectedCount} suppliers?</h3>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>This action cannot be undone. The selected suppliers will be permanently removed.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setBulkConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteSelected}>Delete Suppliers</button>
            </div>
          </div>
        </div>
      )}

      {viewId && (() => {
        const supplier = state.suppliers.find((entry) => entry.id === viewId)
        if (!supplier) return null
        const products = state.products.filter((product) => product.supplier_id === supplier.id)
        return (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 560 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div>
                  <div className="auth-badge" style={{ marginBottom: 10 }}>
                    <Eye size={14} />
                    Supplier details
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>{supplier.name}</h3>
                  <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Read-only view of this supplier.</p>
                </div>
                <button onClick={() => setViewId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Contact Person</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{supplier.contact_name ?? '-'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Lead Time</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{supplier.lead_days} days</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Phone</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{supplier.phone ?? '-'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Email</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{supplier.email ?? '-'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Address</div>
                  <div style={{ fontWeight: 600, color: '#475569', marginTop: 4 }}>{supplier.address ?? 'No address'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Notes</div>
                  <div style={{ fontWeight: 500, color: '#475569', marginTop: 4 }}>{supplier.notes ?? 'No notes'}</div>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Products supplied ({products.length})</div>
              <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: 8, border: '1px solid #D8E4F2' }}>
                <table className="data-table">
                  <thead><tr><th>Code</th><th>Product</th><th>UoM</th></tr></thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>No products linked to this supplier</td></tr>
                    ) : products.map((product) => (
                      <tr key={product.id}>
                        <td style={{ fontSize: 11, color: '#64748B' }}>{product.item_code}</td>
                        <td style={{ color: '#0F172A' }}>{product.name}</td>
                        <td style={{ color: '#475569' }}>{product.uom?.abbreviation ?? 'pcs'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => setViewId(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => { setViewId(null); startEdit(supplier.id) }}>Edit Supplier</button>
              </div>
            </div>
          </div>
        )
      })()}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <div>
                <div className="auth-badge" style={{ marginBottom: 10 }}>
                  <Truck size={14} />
                  {editingId ? 'Edit supplier' : 'Create supplier'}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>
                  {editingId ? 'Update supplier details' : 'New supplier'}
                </h3>
                <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                  Keep the page clean and use this popup for all add/edit actions.
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              <label className="auth-field">
                <span>Supplier name</span>
                <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Supplier name" />
              </label>
              <label className="auth-field">
                <span>Contact person</span>
                <input className="input" value={form.contact_name} onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))} placeholder="Contact person" />
              </label>
              <label className="auth-field">
                <span>Email</span>
                <input className="input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" />
              </label>
              <label className="auth-field">
                <span>Phone</span>
                <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone number" />
              </label>
              <label className="auth-field">
                <span>Address</span>
                <input className="input" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Address" />
              </label>
              <label className="auth-field">
                <span>Lead days</span>
                <input className="input" type="number" value={form.lead_days} onChange={(event) => setForm((current) => ({ ...current, lead_days: event.target.value }))} placeholder="7" />
              </label>
              <label className="auth-field" style={{ gridColumn: '1 / -1' }}>
                <span>Notes</span>
                <textarea
                  className="input"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional supplier notes"
                  style={{ height: 90, resize: 'none' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={15} /> {editingId ? 'Save Supplier' : 'Create Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
