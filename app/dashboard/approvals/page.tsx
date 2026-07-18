'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Package, Receipt, Trash2, XCircle } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { getRolePermissions, canActOnApprovalRequest } from '@/lib/access-control'
import type { DeletionRequest } from '@/types/database'

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  voidSale: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  refundSale: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  approvePurchaseOrder: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
}

const ACTION_LABELS: Record<string, string> = {
  voidSale: 'Void Sale',
  refundSale: 'Refund Sale',
  approvePurchaseOrder: 'PO Approval',
  removeProduct: 'Delete Product',
  removeSupplier: 'Delete Supplier',
  removeProducts: 'Delete Products',
  removeSuppliers: 'Delete Suppliers',
  deleteRecipe: 'Delete Recipe',
  deleteProductionTemplate: 'Delete Template',
  deleteLocation: 'Delete Location',
}

const ACTION_ICONS: Record<string, typeof Receipt> = {
  voidSale: Receipt,
  refundSale: Receipt,
  approvePurchaseOrder: Package,
}

type Tab = 'pending' | 'history'

export default function ApprovalsPage() {
  const { state, availableTenants, activeTenantId, approveDeletion, rejectDeletion, formatCurrency, notifySuccess, notifyError } = useDemoSystem()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? 'admin'

  const pending = state.deletionRequests.filter((req) => req.status === 'pending' && canActOnApprovalRequest(role, req, state.currentUserId))
  const history = state.deletionRequests.filter((req) => req.status !== 'pending')

  const [tab, setTab] = useState<Tab>('pending')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})

  const pendingPOs = useMemo(() => pending.filter((r) => r.action === 'approvePurchaseOrder'), [pending])
  const pendingVoidRefund = useMemo(() => pending.filter((r) => r.action === 'voidSale' || r.action === 'refundSale'), [pending])
  const pendingDeletions = useMemo(() => pending.filter((r) => r.action !== 'approvePurchaseOrder' && r.action !== 'voidSale' && r.action !== 'refundSale'), [pending])

  const filteredPending = useMemo(() => {
    if (actionFilter === 'all') return pending
    return pending.filter((r) => r.action === actionFilter)
  }, [pending, actionFilter])

  const filteredHistory = useMemo(() => {
    if (actionFilter === 'all') return history
    return history.filter((r) => r.action === actionFilter)
  }, [history, actionFilter])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      pending: pending.length,
      poPending: pendingPOs.length,
      voidRefundPending: pendingVoidRefund.length,
      deletionPending: pendingDeletions.length,
      approvedToday: history.filter((r) => r.status === 'approved' && r.reviewed_at?.startsWith(today)).length,
      rejectedToday: history.filter((r) => r.status === 'rejected' && r.reviewed_at?.startsWith(today)).length,
    }
  }, [pending, history, pendingPOs, pendingVoidRefund, pendingDeletions])

  const activeTabCount = tab === 'pending' ? filteredPending.length : filteredHistory.length

  function getUserName(id: string | undefined) {
    if (!id) return '-'
    return state.users.find((u) => u.id === id)?.full_name ?? state.users.find((u) => u.id === id)?.email ?? id
  }

  function getBadgeColor(action: string) {
    return BADGE_COLORS[action] ?? { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' }
  }

  function getActionIcon(action: string) {
    return ACTION_ICONS[action] ?? Trash2
  }

  function getActionLabel(action: string) {
    return ACTION_LABELS[action] ?? 'Delete'
  }

  function renderPODetails(req: DeletionRequest) {
    const po = state.purchaseOrders.find((p) => p.id === req.target_id)
    if (!po) return null
    const supplier = state.suppliers.find((s) => s.id === po.supplier_id)
    const items = state.purchaseOrderItems.filter((item) => item.po_id === po.id)
    const total = items.reduce((sum, item) => sum + Number(item.unit_cost ?? 0) * item.quantity_ordered, 0)
    const firstItem = items[0]
    const product = firstItem?.product ?? state.products.find((p) => p.id === firstItem?.product_id)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#475569' }}>
          <span><strong>Supplier:</strong> {supplier?.name ?? '-'}</span>
          <span><strong>Items:</strong> {items.length}</span>
          <span><strong>Total:</strong> {formatCurrency(total)}</span>
          {po.expected_date && <span><strong>Expected:</strong> {po.expected_date}</span>}
        </div>
        {items.length > 0 && (
          <div style={{ fontSize: 11, color: '#64748B', background: '#F8FAFC', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={13} color="#64748B" />
            {product?.name ?? 'Item'} × {firstItem.quantity_ordered} {product?.uom?.abbreviation ?? 'pcs'} @ {formatCurrency(Number(firstItem.unit_cost ?? 0))}
            {items.length > 1 && <span style={{ color: '#94A3B8', fontWeight: 600 }}>+{items.length - 1} more</span>}
          </div>
        )}
      </div>
    )
  }

  function renderVoidRefundDetails(req: DeletionRequest) {
    const tx = state.salesTransactions.find((t) => t.id === req.target_id)
    if (!tx) return null
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#475569', marginTop: 8, alignItems: 'center' }}>
        <span><strong>Receipt:</strong> {tx.receipt_number}</span>
        <span><strong>Amount:</strong> {formatCurrency(Number(tx.total_amount ?? 0))}</span>
        <span><strong>Date:</strong> {new Date(tx.created_at).toLocaleDateString()}</span>
        {typeof req.details.reason === 'string' && req.details.reason && <span style={{ color: '#64748B', fontStyle: 'italic' }}>&ldquo;{req.details.reason}&rdquo;</span>}
      </div>
    )
  }

  function renderDeletionDetails(req: DeletionRequest) {
    const itemCodes = Array.isArray(req.details.item_codes) ? (req.details.item_codes as string[]) : null
    const supplierIds = Array.isArray(req.details.supplier_ids) ? (req.details.supplier_ids as string[]) : null
    const targetName = itemCodes
      ? `${itemCodes.length} product${itemCodes.length === 1 ? '' : 's'}`
      : supplierIds
        ? `${supplierIds.length} supplier${supplierIds.length === 1 ? '' : 's'}`
        : String(req.details.item_code ?? req.details.name ?? req.target_id)
    const reason = typeof req.details.reason === 'string' ? req.details.reason : null
    return (
      <div style={{ fontSize: 12, color: '#475569', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span><strong>Type:</strong> {req.target_type}</span>
          <span><strong>Item:</strong> {targetName}</span>
        </div>
        {reason && (
          <div style={{ fontStyle: 'italic', color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '4px 8px' }}>
            Reason: &ldquo;{reason}&rdquo;
          </div>
        )}
      </div>
    )
  }

  function renderRequestDetails(req: DeletionRequest) {
    if (req.action === 'approvePurchaseOrder') return renderPODetails(req)
    if (req.action === 'voidSale' || req.action === 'refundSale') return renderVoidRefundDetails(req)
    return renderDeletionDetails(req)
  }

  function handleApprove(requestId: string, req: DeletionRequest) {
    if (!canActOnApprovalRequest(role, req, state.currentUserId)) {
      notifyError('You are not allowed to approve this request.')
      return
    }
    const notes = reviewNotes[requestId]?.trim() || undefined
    approveDeletion(requestId, notes)
    setReviewNotes((current) => { const next = { ...current }; delete next[requestId]; return next })
    if (req.action === 'voidSale') notifySuccess('Void confirmed.')
    else if (req.action === 'refundSale') notifySuccess('Refund confirmed.')
    else if (req.action === 'approvePurchaseOrder') notifySuccess('Purchase order approved.')
    else notifySuccess('Request approved.')
  }

  function handleReject(requestId: string, req: DeletionRequest) {
    if (!canActOnApprovalRequest(role, req, state.currentUserId)) {
      notifyError('You are not allowed to reject this request.')
      return
    }
    const notes = reviewNotes[requestId]?.trim() || undefined
    rejectDeletion(requestId, notes)
    setReviewNotes((current) => { const next = { ...current }; delete next[requestId]; return next })
    if (req.action === 'voidSale') notifySuccess('Void rejected — transaction reinstated and stock returned to the shelf.')
    else if (req.action === 'refundSale') notifySuccess('Refund rejected — transaction reinstated and stock returned to the shelf.')
    else if (req.action === 'approvePurchaseOrder') notifySuccess('Purchase order rejected.')
    else notifySuccess(`${getActionLabel(req.action)} request rejected.`)
  }

  function getStatusBadge(status: string) {
    if (status === 'approved') return { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0', label: 'Approved', icon: CheckCircle2 }
    if (status === 'rejected') return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', label: 'Rejected', icon: XCircle }
    return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', label: 'Pending', icon: Clock3 }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Approvals</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4, maxWidth: 520, lineHeight: 1.5 }}>
            Review purchase orders, voids, refunds, and deletion requests from your team.
          </p>
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {[
          { label: 'Pending', value: String(stats.pending), hint: `${stats.poPending} PO · ${stats.voidRefundPending} sales · ${stats.deletionPending} deletions`, icon: Clock3, color: '#D97706', tint: '#FEF3C7' },
          { label: 'Approved Today', value: String(stats.approvedToday), hint: 'Resolved requests', icon: CheckCircle2, color: '#10B981', tint: '#D1FAE5' },
          { label: 'Rejected Today', value: String(stats.rejectedToday), hint: 'Reinstated / denied', icon: XCircle, color: '#DC2626', tint: '#FEE2E2' },
          { label: 'PO Pending', value: String(stats.poPending), hint: 'Awaiting approval', icon: Package, color: '#2563EB', tint: '#DBEAFE' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="card"
              style={{
                padding: 16,
                borderRadius: 16,
                borderColor: item.tint,
                background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: item.tint, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: item.color, letterSpacing: '-0.04em', marginTop: 2 }}>{item.value}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8, lineHeight: 1.4 }}>{item.hint}</div>
            </div>
          )
        })}
      </section>

      <section className="card" style={{ padding: 16, borderRadius: 18, background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, background: '#F8FAFC', padding: 4, borderRadius: 12, border: '1px solid #E2E8F0' }}>
            {([
              { key: 'pending', label: 'Pending', icon: Clock3 },
              { key: 'history', label: 'History', icon: CheckCircle2 },
            ] as const).map((t) => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: active ? '#FFFFFF' : 'transparent',
                    color: active ? '#0F172A' : '#64748B',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: active ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                  }}
                >
                  <Icon size={14} />
                  {t.label}
                  {t.key === 'pending' && pending.length > 0 && (
                    <span style={{ background: '#D97706', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 999, minWidth: 20, textAlign: 'center' }}>{pending.length}</span>
                  )}
                </button>
              )
            })}
          </div>

          {pending.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'approvePurchaseOrder', label: 'PO' },
                { key: 'voidSale', label: 'Void' },
                { key: 'refundSale', label: 'Refund' },
                { key: 'removeProduct', label: 'Deletions' },
              ].map((f) => {
                const active = actionFilter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setActionFilter(f.key)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999,
                      border: `1px solid ${active ? '#3B82F6' : '#E2E8F0'}`,
                      background: active ? '#EFF6FF' : '#FFFFFF',
                      color: active ? '#2563EB' : '#475569',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {activeTabCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
            {tab === 'pending' ? (
              <>
                <CheckCircle2 size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>All caught up</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>No pending requests at the moment.</p>
              </>
            ) : (
              <>
                <Clock3 size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>No history yet</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Resolved requests will appear here.</p>
              </>
            )}
          </div>
        ) : tab === 'pending' ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {filteredPending.map((req) => {
              const badge = getBadgeColor(req.action)
              const Icon = getActionIcon(req.action)
              return (
                <div
                  key={req.id}
                  style={{
                    border: `1px solid ${badge.border}`,
                    borderRadius: 14,
                    padding: 16,
                    background: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: badge.bg, color: badge.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                          {req.action === 'voidSale' || req.action === 'refundSale'
                            ? `${getActionLabel(req.action)} ${String(req.details.receipt_number ?? req.target_id)}`
                            : req.action === 'approvePurchaseOrder'
                              ? `PO ${String(req.details.po_number ?? req.target_id)}`
                              : Array.isArray(req.details.item_codes)
                                ? `${req.details.item_codes.length} product${req.details.item_codes.length === 1 ? '' : 's'}`
                                : Array.isArray(req.details.supplier_ids)
                                  ? `${req.details.supplier_ids.length} supplier${req.details.supplier_ids.length === 1 ? '' : 's'}`
                                  : String(req.details.item_code ?? req.details.name ?? req.target_id)}
                        </span>
                        <span className="badge" style={{ background: `${badge.bg}`, color: `${badge.text}`, padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', border: `1px solid ${badge.border}` }}>
                          {getActionLabel(req.action)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 1.5 }}>
                        {req.action === 'voidSale' || req.action === 'refundSale' ? (
                          <>
                            {req.details.total_amount != null && <span>{formatCurrency(Number(req.details.total_amount))} · </span>}
                            requested by {getUserName(req.requested_by)}
                            {req.details.reason && <span> · &ldquo;{String(req.details.reason)}&rdquo;</span>}
                          </>
                        ) : req.action === 'approvePurchaseOrder' ? (
                          <>
                            {req.details.supplier_name && <span>{String(req.details.supplier_name)} · </span>}
                            {req.details.total != null && <span>{formatCurrency(Number(req.details.total))} · </span>}
                            requested by {getUserName(req.requested_by)}
                          </>
                        ) : (
                          <>{req.target_type} · requested by {getUserName(req.requested_by)} · {new Date(req.created_at).toLocaleString()}</>
                        )}
                      </div>
                    </div>
                  </div>
                  {renderRequestDetails(req)}
                  {canActOnApprovalRequest(role, req, state.currentUserId) ? (
                    <>
                      <textarea
                        className="input"
                        value={reviewNotes[req.id] ?? ''}
                        onChange={(event) => setReviewNotes((current) => ({ ...current, [req.id]: event.target.value }))}
                        placeholder="Add remarks / reason for your decision (optional)"
                        rows={2}
                        style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApprove(req.id, req)}
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReject(req.id, req)}
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center', padding: '6px 0' }}>Awaiting higher approval</div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredHistory.map((req) => {
              const statusBadge = getStatusBadge(req.status)
              const Icon = getActionIcon(req.action)
              const badge = getBadgeColor(req.action)
              return (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#F8FBFF',
                    border: `1px solid ${statusBadge.border}`,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: statusBadge.bg, color: statusBadge.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ color: '#64748B', textTransform: 'uppercase', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#F1F5F9' }}>
                        {getActionLabel(req.action)}
                      </span>
                      {req.action === 'voidSale' || req.action === 'refundSale'
                        ? String(req.details.receipt_number ?? req.target_id)
                        : req.action === 'approvePurchaseOrder'
                          ? String(req.details.po_number ?? req.target_id)
                          : Array.isArray(req.details.item_codes)
                            ? `${req.details.item_codes.length} product${req.details.item_codes.length === 1 ? '' : 's'}`
                            : Array.isArray(req.details.supplier_ids)
                              ? `${req.details.supplier_ids.length} supplier${req.details.supplier_ids.length === 1 ? '' : 's'}`
                              : String(req.details.item_code ?? req.details.name ?? req.target_id)}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      by {getUserName(req.requested_by)} · reviewed by {getUserName(req.reviewed_by ?? undefined)}
                    </div>
                    {req.review_notes ? (
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 3, fontStyle: 'italic', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '4px 8px' }}>
                        &ldquo;{req.review_notes}&rdquo;
                      </div>
                    ) : null}
                  </div>
                  <span className="badge" style={{ background: `${statusBadge.bg}`, color: `${statusBadge.text}`, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', border: `1px solid ${statusBadge.border}` }}>
                    {statusBadge.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
