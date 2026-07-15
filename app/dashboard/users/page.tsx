'use client'

import { useState } from 'react'
import { Plus, Save, Users, UserCheck, X, Pencil, MailPlus } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { formatRoleLabel } from '@/lib/access-control'
import { formatTimestamp } from '@/lib/utils'
import type { User, UserRole } from '@/types/database'
import { useTableState } from '@/lib/use-table-state'
import { TableToolbar } from '@/components/ui/table/TableToolbar'
import { SortHeader } from '@/components/ui/table/SortHeader'
import { Pagination } from '@/components/ui/table/Pagination'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const EMPTY = {
  full_name: '',
  email: '',
  role: 'sales_staff' as UserRole,
}

export default function UsersPage() {
  const { state, addUser, editUser, toggleUser, resendInvite, notifySuccess } = useDemoSystem()
  const [form, setForm] = useState(EMPTY)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const table = useTableState({
    data: state.users,
    searchKeys: (user) => [user.full_name, user.email, formatRoleLabel(user.role)],
    filterFields: [
      {
        key: 'role',
        label: 'Role',
        options: [
          { value: 'all', label: 'All roles' },
          { value: 'admin', label: 'Tenant Admin' },
          { value: 'manager', label: 'Manager' },
          { value: 'supervisor', label: 'Supervisor' },
          { value: 'inventory_staff', label: 'Inventory Staff' },
          { value: 'sales_staff', label: 'Sales Staff' },
          { value: 'production_staff', label: 'Production Staff' },
          { value: 'purchasing_staff', label: 'Purchasing Staff' },
        ],
        getValue: (user) => user.role,
      },
    ],
  })

  const visibleUsers = table.sortedAndFiltered

  function handleSave() {
    if (!form.full_name || !form.email) return
    if (editingUser) {
      editUser(editingUser.id, form)
      notifySuccess('User updated successfully.')
    } else {
      // Success/error feedback is reported by the provider once the server
      // actually sends the invitation email.
      addUser(form)
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

      <TableToolbar
        search={table.search}
        onSearch={table.setSearch}
        searchPlaceholder="Search by name, email, or role..."
        filters={[
          {
            key: 'role',
            label: 'Role',
            value: table.filters.role,
            onChange: (value) => table.setFilter('role', value),
            options: [
              { value: 'all', label: 'All roles' },
              { value: 'admin', label: 'Tenant Admin' },
              { value: 'manager', label: 'Manager' },
              { value: 'supervisor', label: 'Supervisor' },
              { value: 'inventory_staff', label: 'Inventory Staff' },
              { value: 'sales_staff', label: 'Sales Staff' },
              { value: 'production_staff', label: 'Production Staff' },
              { value: 'purchasing_staff', label: 'Purchasing Staff' },
            ],
          },
        ]}
        showReset={table.totalItems !== state.users.length || Boolean(table.search)}
        onReset={table.resetFilters}
      />

      <div className="card table-scroll" style={{ overflow: 'hidden' }}>
        {table.paginated.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>No users found</h3>
            <p style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>
              {table.totalItems === 0 ? 'Invite a real team member to create their account and receive a password setup email.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
                <SortHeader label="Name" column="full_name" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <SortHeader label="Role" column="role" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <SortHeader label="Email" column="email" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <SortHeader label="Status" column="is_active" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
                <th style={{ width: 80, textAlign: 'right' }}>Action</th>
              </tr></thead>
            <tbody>
              {table.paginated.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>{user.full_name}</td>
                  <td><span className="badge badge-blue">{formatRoleLabel(user.role)}</span></td>
                  <td>{user.email}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {user.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}
                      {!user.last_login && <span className="badge badge-amber">Pending invite</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {!user.last_login && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px' }}
                          onClick={() => {
                            resendInvite({ full_name: user.full_name, email: user.email, role: user.role })
                          }}
                          title="Resend invitation email"
                        >
                          <MailPlus size={13} />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => openEdit(user)}
                        title="Edit user"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => {
                          toggleUser(user.id)
                          notifySuccess(user.is_active ? 'User deactivated successfully.' : 'User activated successfully.')
                        }}
                        title={user.is_active ? 'Deactivate user' : 'Activate user'}
                      >
                        <UserCheck size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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

      {showModal && (
        <div className="modal-overlay">
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
                <SearchableSelect
                  className="input"
                  placeholder="Role"
                  searchPlaceholder="Search roles..."
                  dropUp
                  value={form.role}
                  onChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))}
                   options={[
                     { value: 'admin', label: 'Tenant Admin' },
                     { value: 'manager', label: 'Manager' },
                     { value: 'supervisor', label: 'Supervisor' },
                     { value: 'inventory_staff', label: 'Inventory Staff' },
                     { value: 'sales_staff', label: 'Sales Staff' },
                     { value: 'production_staff', label: 'Production Staff' },
                     { value: 'purchasing_staff', label: 'Purchasing Staff' },
                   ]}
                />
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
          { label: 'Tenant Admins', value: state.users.filter((user) => user.role === 'admin').length, color: '#3B82F6' },
          { label: 'Managers', value: state.users.filter((user) => user.role === 'manager').length, color: '#8B5CF6' },
          { label: 'Supervisors', value: state.users.filter((user) => user.role === 'supervisor').length, color: '#0EA5E9' },
          { label: 'Inventory Staff', value: state.users.filter((user) => user.role === 'inventory_staff').length, color: '#10B981' },
          { label: 'Sales Staff', value: state.users.filter((user) => user.role === 'sales_staff').length, color: '#F59E0B' },
          { label: 'Production Staff', value: state.users.filter((user) => user.role === 'production_staff').length, color: '#EF4444' },
          { label: 'Purchasing Staff', value: state.users.filter((user) => user.role === 'purchasing_staff').length, color: '#6366F1' },
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
                     <div style={{ color: '#94A3B8', fontSize: 10 }}>{formatTimestamp(log.performed_at)}</div>
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
