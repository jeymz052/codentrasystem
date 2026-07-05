'use client'

import { useMemo, useState } from 'react'
import { Building2, Clock3, Plus, Save, Search, Truck, Trash2, Users, X } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'

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
  const { state, addSupplier, editSupplier, removeSupplier } = useDemoSystem()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierForm>(EMPTY)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return state.suppliers.filter((supplier) => {
      if (!query) return true
      return [supplier.name, supplier.contact_name, supplier.email, supplier.phone, supplier.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [search, state.suppliers])

  const summary = useMemo(() => {
    const avgLead = state.suppliers.length
      ? Math.round(state.suppliers.reduce((sum, supplier) => sum + supplier.lead_days, 0) / state.suppliers.length)
      : 0
    return [
      { label: 'Suppliers', value: String(state.suppliers.length), hint: 'Total vendor records', icon: Truck, color: '#3B82F6', tint: '#DBEAFE' },
      { label: 'Filtered', value: String(filteredSuppliers.length), hint: 'Matches current search', icon: Users, color: '#8B5CF6', tint: '#EDE9FE' },
      { label: 'Avg lead time', value: `${avgLead} days`, hint: 'Across all suppliers', icon: Clock3, color: '#F59E0B', tint: '#FEF3C7' },
    ]
  }, [filteredSuppliers.length, state.suppliers])

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

      <section className="card" style={{ padding: 16, borderRadius: 20 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search supplier name, contact, phone, email, or address..."
            style={{ height: 42, paddingLeft: 38, borderRadius: 12 }}
          />
        </div>
      </section>

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
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Lead Time</th>
                <th>Phone</th>
                <th>Email</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{supplier.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{supplier.address ?? 'No address'}</div>
                  </td>
                  <td>{supplier.contact_name ?? '-'}</td>
                  <td>
                    <span className="badge badge-blue" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                      {supplier.lead_days} days
                    </span>
                  </td>
                  <td>{supplier.phone ?? '-'}</td>
                  <td>{supplier.email ?? '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(supplier.id)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => removeSupplier(supplier.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                    <Building2 size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
                    <p>No suppliers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
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
