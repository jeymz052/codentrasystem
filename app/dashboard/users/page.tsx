'use client'

import { useState } from 'react'
import { Plus, Save, Users, UserCheck, X, Pencil } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { formatRoleLabel } from '@/lib/access-control'
import type { User, UserRole } from '@/types/database'

const EMPTY = {
  full_name: '',
  email: '',
  role: 'cashier' as UserRole,
}

export default function UsersPage() {
  const { state, addUser, editUser, toggleUser, notifySuccess } = useDemoSystem()
  const [form, setForm] = useState(EMPTY)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const visibleUsers = state.users

  function handleSave() {
    if (!form.full_name || !form.email) return
    if (editingUser) {
      editUser(editingUser.id, form)
      notifySuccess('User updated successfully.')
    } else {
      addUser(form)
      notifySuccess('User invited successfully.')
    }
    setForm(EMPTY)
    setShowModal(false)
    setEditingUser(null)
  }

  function openCreate() {
    setEditingUser(null)
    setForm(EMPTY)
    setShowModal(true)
  }

  function openEdit(user: User) {
    setEditingUser(user)
    setForm({ full_name: user.full_name, email: user.email, role: user.role })
    setShowModal(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Users</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Manage access by role and keep your team active.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Create User
        </button>
      </div>

      <div className="card table-scroll" style={{ overflow: 'hidden' }}>
        {visibleUsers.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>No real users yet</h3>
            <p style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>
              Invite a real team member to create their account and receive a password setup email.
            </p>
          </div>
        ) : (
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
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>{user.full_name}</td>
                  <td><span className="badge badge-blue">{formatRoleLabel(user.role)}</span></td>
                  <td>{user.email}</td>
                  <td>{user.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(user)}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          toggleUser(user.id)
                          notifySuccess(user.is_active ? 'User deactivated successfully.' : 'User activated successfully.')
                        }}
                      >
                        <UserCheck size={13} /> {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <div>
                <div className="auth-badge" style={{ marginBottom: 10 }}>
                {editingUser ? <Pencil size={14} /> : <Users size={14} />}
                {editingUser ? 'Edit user' : 'Invite user'}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>{editingUser ? 'Update team member' : 'New team member'}</h3>
              <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                {editingUser ? 'Update name, email, or role for this user.' : 'Add a team member, assign a role, and we’ll email them a password setup link.'}
              </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <label className="auth-field">
                <span>Full name</span>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                  placeholder="Full name"
                />
              </label>

              <label className="auth-field">
                <span>Email</span>
                <input
                  className="input"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email"
                />
              </label>

              <label className="auth-field">
                <span>Role</span>
                <select className="input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}>
                  <option value="admin">Tenant Admin</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingUser ? <><Save size={15} /> Save Changes</> : <><Save size={15} /> Send Invite</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginTop: 18 }}>
        {[
          { label: 'Tenant Admins', value: visibleUsers.filter((user) => user.role === 'admin').length, color: '#3B82F6' },
          { label: 'Managers', value: visibleUsers.filter((user) => user.role === 'manager').length, color: '#8B5CF6' },
          { label: 'Cashiers', value: visibleUsers.filter((user) => user.role === 'cashier').length, color: '#10B981' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#64748B' }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 18, borderRadius: 18, marginTop: 18 }}>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>Audit trail</div>
        <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
          {state.auditLogs.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13 }}>No actions recorded yet.</p>
          ) : (
            [...state.auditLogs].reverse().slice(0, 20).map((log) => {
              const actor = log.performed_by ? state.users.find((u) => u.id === log.performed_by) : null
              const target = state.users.find((u) => u.id === log.target_id)
              const label = log.action.replace('user.', '')
              return (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0', fontSize: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{label}</span>
                    <span style={{ color: '#64748B', marginLeft: 6 }}>{target ? target.full_name : log.target_id}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#475569' }}>{actor ? actor.full_name : 'System'}</div>
                    <div style={{ color: '#94A3B8', fontSize: 10 }}>{new Date(log.performed_at).toLocaleString()}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
