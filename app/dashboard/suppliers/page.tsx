'use client'

import { useState } from 'react'
import { Save, Truck, Trash2 } from 'lucide-react'
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

export default function SuppliersPage() {
  const { state, addSupplier, editSupplier, removeSupplier } = useDemoSystem()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY)
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
  }

  function handleSave() {
    const payload = {
      name: form.name,
      contact_name: form.contact_name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      lead_days: Number(form.lead_days) || 7,
      notes: form.notes,
    }
    if (editingId) editSupplier(editingId, payload)
    else addSupplier(payload)
    startCreate()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Suppliers</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Keep lead times and contact details in one place.</p>
        </div>
        <button className="btn btn-primary" onClick={startCreate}>
          <Truck size={15} /> New Supplier
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Supplier name" />
          <input className="input" value={form.contact_name} onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))} placeholder="Contact person" />
          <input className="input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
          <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" />
          <input className="input" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Address" />
          <input className="input" type="number" value={form.lead_days} onChange={(event) => setForm((current) => ({ ...current, lead_days: event.target.value }))} placeholder="Lead days" />
          <textarea className="input" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" style={{ gridColumn: '1/-1', height: 72 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-primary" onClick={handleSave}><Save size={15} /> Save Supplier</button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
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
            {state.suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td style={{ fontWeight: 700, color: '#0F172A' }}>{supplier.name}</td>
                <td>{supplier.contact_name ?? '-'}</td>
                <td>{supplier.lead_days} days</td>
                <td>{supplier.phone ?? '-'}</td>
                <td>{supplier.email ?? '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(supplier.id)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeSupplier(supplier.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
