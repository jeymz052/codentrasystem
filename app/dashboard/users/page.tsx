'use client'

import { useState } from 'react'
import { Save, Users, UserCheck } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import type { UserRole } from '@/types/database'

const EMPTY = {
  full_name: '',
  email: '',
  role: 'cashier' as UserRole,
}

export default function UsersPage() {
  const { state, addUser, toggleUser } = useDemoSystem()
  const [form, setForm] = useState(EMPTY)

  function handleSave() {
    if (!form.full_name || !form.email) return
    addUser(form)
    setForm(EMPTY)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Users</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Manage access by role and keep your team active.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <input className="input" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Full name" />
          <input className="input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
          <select className="input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-primary" onClick={handleSave}><Save size={15} /> Add User</button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.users.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 700, color: '#0F172A' }}>{user.full_name}</td>
                <td><span className="badge badge-blue">{user.role}</span></td>
                <td>{user.email}</td>
                <td>{user.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleUser(user.id)}>
                    <UserCheck size={13} /> {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 18 }}>
        {[
          { label: 'Admins', value: state.users.filter((user) => user.role === 'admin').length, color: '#3B82F6' },
          { label: 'Managers', value: state.users.filter((user) => user.role === 'manager').length, color: '#8B5CF6' },
          { label: 'Cashiers', value: state.users.filter((user) => user.role === 'cashier').length, color: '#10B981' },
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
