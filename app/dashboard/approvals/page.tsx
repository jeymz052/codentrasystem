'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { getRolePermissions } from '@/lib/access-control'

export default function ApprovalsPage() {
  const { state, availableTenants, activeTenantId, approveDeletion, rejectDeletion, notifySuccess, notifyError } = useDemoSystem()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? 'admin'
  const perms = getRolePermissions(role)
  const canApprove = perms.canDeleteRecords

  const pending = state.deletionRequests.filter((req) => req.status === 'pending')
  const history = state.deletionRequests.filter((req) => req.status !== 'pending')

  function getUserName(id: string | undefined) {
    if (!id) return '-'
    return state.users.find((u) => u.id === id)?.full_name ?? state.users.find((u) => u.id === id)?.email ?? id
  }

  function handleApprove(requestId: string) {
    if (!canApprove) {
      notifyError('Only a manager or admin can approve deletions.')
      return
    }
    approveDeletion(requestId)
    notifySuccess('Deletion approved.')
  }

  function handleReject(requestId: string) {
    if (!canApprove) {
      notifyError('Only a manager or admin can reject deletions.')
      return
    }
    rejectDeletion(requestId)
    notifySuccess('Deletion rejected.')
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Approvals</h2>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Review deletion requests from your team.</p>
      </div>

      <div className="card" style={{ padding: 18, borderRadius: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending Requests</div>
        {pending.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: 13 }}>No pending deletion requests.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {pending.map((req) => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                    {String(req.details.item_code ?? req.details.name ?? req.target_id)}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {req.target_type} · requested by {getUserName(req.requested_by)} · {new Date(req.created_at).toLocaleString()}
                  </div>
                </div>
                {canApprove ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleApprove(req.id)}>
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(req.id)}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>Awaiting manager review</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 18, borderRadius: 18 }}>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>History</div>
        {history.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: 13 }}>No resolved requests yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {history.map((req) => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                    {String(req.details.item_code ?? req.details.name ?? req.target_id)}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {req.target_type} · by {getUserName(req.requested_by)} · reviewed by {getUserName(req.reviewed_by ?? undefined)}
                  </div>
                </div>
                <span className={`badge ${req.status === 'approved' ? 'badge-green' : 'badge-red'}`}>{req.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
