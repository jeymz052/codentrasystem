'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Users,
  Package,
  MapPin,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Crown,
  Timer,
} from 'lucide-react'
import { SUBSCRIPTION_PLANS, formatPlanPrice } from '@/lib/subscription-plans'
import type { BillingInterval, BillingSummary, SubscriptionPlan } from '@/types/database'

type Props = {
  tenantId: string
  canManage: boolean
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', color: '#047857', bg: '#ECFDF5', icon: CheckCircle2 },
  trial: { label: 'Free trial', color: '#B45309', bg: '#FFFBEB', icon: ShieldCheck },
  past_due: { label: 'Payment overdue', color: '#B91C1C', bg: '#FEF2F2', icon: AlertTriangle },
  suspended: { label: 'Suspended', color: '#B91C1C', bg: '#FEF2F2', icon: XCircle },
  inactive: { label: 'Inactive', color: '#475569', bg: '#F1F5F9', icon: Info },
}

const EVENT_ICON: Record<string, typeof CheckCircle2> = {
  trial_started: ShieldCheck,
  subscription_started: CheckCircle2,
  payment_succeeded: CheckCircle2,
  subscription_renewed: RefreshCw,
  payment_failed: XCircle,
  grace_started: AlertTriangle,
  card_expiring: CreditCard,
  card_updated: CheckCircle2,
  subscription_cancelled: XCircle,
  subscription_ended: XCircle,
  plan_changed: RefreshCw,
  invoice_upcoming: Receipt,
  trial_will_end: ShieldCheck,
}

export function BillingPanel({ tenantId, canManage, notifySuccess, notifyError }: Props) {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('starter')
  const [interval, setInterval] = useState<BillingInterval>('month')
  const [showHistory, setShowHistory] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [proration, setProration] = useState<any>(null)
  const [loadingProration, setLoadingProration] = useState(false)

  const planInitializedRef = useRef(false)
  const userChangedSelectionRef = useRef(false)

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/billing/summary?tenantId=${encodeURIComponent(tenantId)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as BillingSummary
      setSummary(data)
      if (!planInitializedRef.current && !userChangedSelectionRef.current) {
        planInitializedRef.current = true
        setSelectedPlan(data.plan)
        if (data.billing_interval) setInterval(data.billing_interval)
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }, [tenantId, notifyError])

  useEffect(() => {
    planInitializedRef.current = false
    userChangedSelectionRef.current = false
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    if (!summary?.has_active_subscription) {
      setProration(null)
      return
    }
    if (selectedPlan === summary.plan && interval === (summary.billing_interval ?? 'month')) {
      setProration(null)
      return
    }

    let cancelled = false
    setLoadingProration(true)
    fetch('/api/billing/proration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, plan: selectedPlan, interval }),
    })
      .then(async (res) => {
        const data = res.ok ? await res.json() : { error: `Proration failed (${res.status})` }
        if (!cancelled) setProration(data)
      })
      .catch((err) => { if (!cancelled) setProration({ error: err instanceof Error ? err.message : 'Proration failed' }) })
      .finally(() => { if (!cancelled) setLoadingProration(false) })

    return () => { cancelled = true }
  }, [selectedPlan, interval, summary?.has_active_subscription, summary?.plan, summary?.billing_interval, tenantId])

  async function startCheckoutOrChange(plan: SubscriptionPlan, chosenInterval: BillingInterval) {
    if (!canManage) return
    setBusy('checkout')
    try {
      const res = await fetch('/api/billing-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, plan, interval: chosenInterval }),
      })
      if (!res.ok) throw new Error((await res.text()) || 'Checkout failed')
      const data = (await res.json()) as { url?: string; changed?: boolean; message?: string }
      if (data.url) {
        window.location.href = data.url
        return
      }
      notifySuccess(data.message ?? 'Subscription updated.')
      await loadSummary()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setBusy(null)
    }
  }

  async function openPortal() {
    if (!canManage) return
    setBusy('portal')
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })
      if (!res.ok) throw new Error((await res.text()) || 'Failed to open portal')
      const data = (await res.json()) as { url?: string }
      if (data.url) window.location.href = data.url
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to open billing portal')
    } finally {
      setBusy(null)
    }
  }

  async function toggleCancel(action: 'cancel' | 'reactivate') {
    if (!canManage) return
    setBusy(action)
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, action }),
      })
      if (!res.ok) throw new Error((await res.text()) || 'Failed to update subscription')
      notifySuccess(action === 'cancel' ? 'Cancellation scheduled for period end.' : 'Subscription reactivated.')
      await loadSummary()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update subscription')
    } finally {
      setBusy(null)
    }
  }

  const statusMeta = STATUS_META[summary?.subscription_status ?? 'inactive'] ?? STATUS_META.inactive
  const trialDays = daysUntil(summary?.trial_ends_at ?? null)
  const graceDays = daysUntil(summary?.grace_period_ends_at ?? null)
  const renewalDays = daysUntil(summary?.current_period_end ?? null)
  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.plan === summary?.plan)
  const currentPrice = summary?.billing_interval === 'year' ? currentPlan?.yearly : currentPlan?.monthly

  const banner = useMemo(() => {
    if (!summary) return null
    if (summary.subscription_status === 'trial' && summary.trial_ends_at) {
      return { tone: 'warning' as const, text: `You're on a free trial — ${trialDays} day${trialDays === 1 ? '' : 's'} left. Subscribe before ${formatDate(summary.trial_ends_at)} to keep access.` }
    }
    if (summary.subscription_status === 'past_due' && summary.grace_period_ends_at) {
      return { tone: 'danger' as const, text: `Payment failed. Update your card before ${formatDate(summary.grace_period_ends_at)} (${graceDays} day${graceDays === 1 ? '' : 's'} left) or your subscription will end. We retry automatically every other day.` }
    }
    if (summary.subscription_status === 'suspended') {
      return { tone: 'danger' as const, text: 'Your subscription is suspended. Subscribe to restore full access.' }
    }
    if (summary.cancel_at_period_end && summary.current_period_end) {
      return { tone: 'warning' as const, text: `Your subscription is set to cancel on ${formatDate(summary.current_period_end)}.` }
    }
    return null
  }, [summary, trialDays, graceDays])

  if (loading) {
    return (
      <div className="card" style={{ padding: 24, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#64748B' }}>
        <Loader2 size={18} className="spin" /> Loading billing…
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="card" style={{ padding: 24, borderRadius: 20, color: '#64748B' }}>
        Billing information is unavailable right now.
        <button className="btn btn-secondary" style={{ marginLeft: 12 }} onClick={() => void loadSummary()}>Retry</button>
      </div>
    )
  }

  const StatusIcon = statusMeta.icon

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {banner && (
        <div style={{ padding: '14px 18px', borderRadius: 14, display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: banner.tone === 'danger' ? '#B91C1C' : '#B45309', background: banner.tone === 'danger' ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${banner.tone === 'danger' ? '#FECACA' : '#FDE68A'}` }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{banner.text}</span>
        </div>
      )}

      {/* Subscription at a glance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: '18px 20px', borderRadius: 18, background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FBFF 100%)', border: '1px solid #D8E4F2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3B82F6', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            <Crown size={14} /> Current plan
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', textTransform: 'capitalize' }}>{summary.plan}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, color: statusMeta.color, background: statusMeta.bg }}>{statusMeta.label}</span>
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>{summary.billing_interval === 'year' ? 'Yearly' : summary.billing_interval === 'month' ? 'Monthly' : '—'}</span>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 18, background: 'linear-gradient(135deg, #ECFDF5 0%, #F8FBFF 100%)', border: '1px solid #D8E4F2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#047857', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            <CalendarClock size={14} /> {summary.subscription_status === 'trial' ? 'Trial ends' : 'Next billing'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>{formatDate(summary.subscription_status === 'trial' ? summary.trial_ends_at : summary.current_period_end)}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 6, fontWeight: 600 }}>
            {renewalDays != null ? `${renewalDays} day${renewalDays === 1 ? '' : 's'} left` : 'No date set'}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 18, background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FBFF 100%)', border: '1px solid #D8E4F2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3B82F6', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            <CreditCard size={14} /> Price
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A' }}>{formatPlanPrice(currentPrice ?? 0)}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 6, fontWeight: 600 }}>{summary.billing_interval === 'year' ? 'per year' : 'per month'}</div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderRadius: 18, background: 'linear-gradient(135deg, #F8FBFF 0%, #FFFFFF 100%)', border: '1px solid #D8E4F2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            <Package size={14} /> Plan limits
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <LimitRow icon={Users} label="Users" used={summary.usage?.users ?? 0} max={Number(currentPlan?.users ?? 0)} />
          <LimitRow icon={Package} label="Products" used={summary.usage?.products ?? 0} max={Number(currentPlan?.products ?? 0)} />
          <LimitRow icon={MapPin} label="Locations" used={summary.usage?.locations ?? 0} max={Number(currentPlan?.locations ?? 0)} />
          </div>
        </div>
      </div>

      {/* Payment & billing details */}
      <div className="card" style={{ padding: 20, borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>Payment & billing details</h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 3, margin: '3px 0 0' }}>Card on file and billing contact.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => void loadSummary()} title="Refresh">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <DetailCard icon={CreditCard} label="Card on file" value={summary.card?.last4 ? `${summary.card.brand ?? 'Card'} •••• ${summary.card.last4}` : 'Not set'} sub={summary.card?.exp_month ? `Expires ${String(summary.card.exp_month).padStart(2, '0')}/${summary.card.exp_year}` : undefined} />
          <DetailCard icon={Receipt} label="Billing email" value={summary.billing_email ?? 'Not set'} />
          <DetailCard icon={CalendarClock} label={summary.subscription_status === 'trial' ? 'Trial ends' : 'Next renewal'} value={formatDate(summary.subscription_status === 'trial' ? summary.trial_ends_at : summary.current_period_end)} />
          {summary.cancel_at_period_end && (
            <DetailCard icon={AlertTriangle} label="Cancellation" value="Scheduled" sub={`At period end (${formatDate(summary.current_period_end)})`} />
          )}
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {summary.has_active_subscription && (
              <button className="btn btn-secondary" onClick={() => void openPortal()} disabled={busy !== null}>
                {busy === 'portal' ? <Loader2 size={15} className="spin" /> : <ExternalLink size={15} />} Manage card & invoices
              </button>
            )}
            {summary.has_active_subscription && !summary.cancel_at_period_end && (
              <button className="btn btn-ghost" style={{ color: '#B91C1C', borderColor: '#FCA5A5' }} onClick={() => setShowCancelConfirm(true)} disabled={busy !== null}>
                <XCircle size={15} /> Cancel subscription
              </button>
            )}
            {summary.cancel_at_period_end && (
              <button className="btn btn-primary" onClick={() => void toggleCancel('reactivate')} disabled={busy !== null}>
                <CheckCircle2 size={15} /> Keep subscription
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="card" style={{ padding: 20, borderRadius: 20, border: '2px solid #FECACA', background: '#FEF2F2' }}>
          <h4 style={{ fontSize: 16, fontWeight: 800, color: '#B91C1C', margin: '0 0 8px' }}>Cancel subscription?</h4>
          <p style={{ fontSize: 13, color: '#7F1D1D', margin: '0 0 16px', lineHeight: 1.6 }}>
            Your subscription will remain active until {formatDate(summary.current_period_end)}. After that, your access will be suspended. You can reactivate anytime before then.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowCancelConfirm(false)}>Keep subscription</button>
            <button className="btn btn-danger" onClick={() => { setShowCancelConfirm(false); void toggleCancel('cancel') }}>Yes, cancel</button>
          </div>
        </div>
      )}

      {/* Plan selector */}
      <div className="card" style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em', margin: 0 }}>
              {summary.has_active_subscription ? 'Change plan' : 'Choose a plan'}
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, margin: '4px 0 0' }}>
              {summary.has_active_subscription
                ? 'Upgrade or downgrade anytime. Changes are prorated instantly.'
                : `${summary.has_used_trial ? 'Subscribe to activate your workspace.' : 'Start with a 7-day free trial. Cancel anytime.'}`}
            </p>
          </div>
          <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 999, padding: 3 }}>
            {(['month', 'year'] as BillingInterval[]).map((opt) => (
            <button key={opt} onClick={() => { userChangedSelectionRef.current = true; setInterval(opt) }} style={{ border: 'none', cursor: 'pointer', padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: interval === opt ? '#fff' : 'transparent', color: interval === opt ? '#0F172A' : '#64748B', boxShadow: interval === opt ? '0 1px 3px rgba(15,23,42,0.12)' : 'none' }}>
                {opt === 'month' ? 'Monthly' : 'Yearly'}
                {opt === 'year' && <span style={{ color: '#10B981', marginLeft: 6 }}>save ~17%</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {SUBSCRIPTION_PLANS.map((p) => {
            const isCurrent = summary.has_active_subscription && summary.plan === p.plan && summary.billing_interval === interval
            const price = interval === 'year' ? p.yearly : p.monthly
            return (
              <button key={p.plan} onClick={() => { userChangedSelectionRef.current = true; setSelectedPlan(p.plan) }} disabled={!canManage} style={{ textAlign: 'left', cursor: canManage ? 'pointer' : 'default', padding: 18, borderRadius: 16, background: isCurrent ? '#EFF6FF' : '#fff', border: `2px solid ${isCurrent ? '#3B82F6' : '#E2E8F0'}`, position: 'relative', transition: 'all .15s ease' }}>
                {p.highlight && <span style={{ position: 'absolute', top: -10, right: 12, fontSize: 10, fontWeight: 800, color: '#fff', background: '#3B82F6', padding: '3px 8px', borderRadius: 999 }}>{p.highlight}</span>}
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>{p.name}</div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#0F172A' }}>{formatPlanPrice(price)}</span>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>/{interval === 'year' ? 'yr' : 'mo'}</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 6, lineHeight: 1.5 }}>{p.description}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 12, display: 'grid', gap: 4 }}>
                  <span>👤 {p.users} users · 📦 {p.products} products · 📍 {p.locations} location{p.locations === 1 ? '' : 's'}</span>
                </div>
                {isCurrent && <div style={{ marginTop: 12, fontSize: 12, fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={14} /> Current plan</div>}
              </button>
            )
          })}
        </div>

        {canManage && (() => {
          const newPlan = SUBSCRIPTION_PLANS.find((p) => p.plan === selectedPlan)
          const newPrice = interval === 'year' ? newPlan?.yearly : newPlan?.monthly
          const isDirty = selectedPlan !== summary.plan || interval !== (summary.billing_interval ?? 'month')

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {isDirty && summary.has_active_subscription ? (
                <div style={{ padding: 16, borderRadius: 14, background: '#F8FBFF', border: '1px solid #D8E4F2', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 auto', minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current plan</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{currentPlan?.name ?? summary.plan}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>{formatPlanPrice(currentPrice ?? 0)}</span>
                        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>/ {summary.billing_interval === 'year' ? 'yr' : 'mo'}</span>
                      </div>
                    </div>

                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', fontSize: 18, fontWeight: 900, flexShrink: 0 }}>
                      →
                    </div>

                    <div style={{ flex: '1 1 auto', minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New plan</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{newPlan?.name ?? selectedPlan}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>{formatPlanPrice(newPrice ?? 0)}</span>
                        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>/ {interval === 'year' ? 'yr' : 'mo'}</span>
                      </div>
                    </div>
                  </div>

                  {loadingProration ? (
                    <div style={{ fontSize: 12, color: '#64748B', padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={14} className="spin" /> Calculating proration…
                    </div>
                  ) : proration && proration.hasSubscription && proration.changed !== false ? (
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, padding: '12px', borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                        <div>
                          <div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days used</div>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{proration.daysUsed} of {proration.totalDays}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days remaining</div>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{proration.daysRemaining}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Old plan value (remaining)</div>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{proration.currency} {proration.unusedValue?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New plan value (remaining)</div>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{proration.currency} {proration.newValue?.toLocaleString()}</div>
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #D8E4F2', display: 'grid', gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          How the charge is computed
                        </div>
                        <div style={{ color: '#475569' }}>
                          We take the remaining days in your current billing cycle and apply only that portion of the price difference.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                          <div>
                            <div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total cycle days</div>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{proration.totalDays}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days remaining</div>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{proration.daysRemaining}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current plan/day</div>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{proration.currency} {(proration.oldPrice / proration.totalDays).toFixed(2)}</div>
                          </div>
                          <div>
                            <div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New plan/day</div>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{proration.currency} {(proration.newPrice / proration.totalDays).toFixed(2)}</div>
                          </div>
                        </div>
                        <div style={{ color: '#64748B' }}>
                          Formula: <span style={{ fontWeight: 800, color: '#0F172A' }}>(new plan daily rate - current plan daily rate) × remaining days</span>.
                        </div>
                      </div>

                      <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: 8, marginTop: 4 }}>
                        {proration.isUpgrade && (
                          <div style={{ color: '#B91C1C', fontWeight: 800 }}>
                            You will be charged {proration.currency} {proration.prorationAmount?.toLocaleString()} now for the upgrade.
                          </div>
                        )}
                        {proration.isDowngrade && (
                          <div style={{ color: '#047857', fontWeight: 800 }}>
                            You will receive a credit of {proration.currency} {Math.abs(proration.prorationAmount)?.toLocaleString()}. This will apply to your next invoice.
                          </div>
                        )}
                        {!proration.isUpgrade && !proration.isDowngrade && (
                          <div style={{ fontWeight: 700 }}>Billing interval will change. No proration charge.</div>
                        )}
                      </div>

                      <div style={{ fontSize: 11, color: '#64748B', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>Payment: {summary.card?.last4 ? `Card •••• ${summary.card.last4}` : 'No card on file'}</span>
                        {proration.nextPaymentAttempt && (
                          <span>Next payment: {new Date(proration.nextPaymentAttempt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ) : proration?.error ? (
                    <div style={{ fontSize: 12, color: '#B91C1C', padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                      {proration.error}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#64748B', padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0' }}>
                      Select a plan to see proration details.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => { userChangedSelectionRef.current = false; setSelectedPlan(summary.plan); setInterval(summary.billing_interval ?? 'month'); setProration(null) }} disabled={busy !== null}>
                      Keep current plan
                    </button>
                    <button className="btn btn-primary" onClick={() => void startCheckoutOrChange(selectedPlan, interval)} disabled={busy !== null}>
                      {busy === 'checkout' ? <><Loader2 size={15} className="spin" /> Processing…</> : <>Confirm & {proration?.isUpgrade ? 'Upgrade' : proration?.isDowngrade ? 'Downgrade' : 'Switch plan'}</>}
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={() => void startCheckoutOrChange(selectedPlan, interval)} disabled={busy !== null || (summary.has_active_subscription && summary.plan === selectedPlan && summary.billing_interval === interval)}>
                  {busy === 'checkout' ? <Loader2 size={15} className="spin" /> : <CreditCard size={15} />}
                  {summary.has_active_subscription ? `Switch to ${selectedPlan}` : summary.has_used_trial ? 'Subscribe now' : 'Start 7-day free trial'}
                </button>
              )}
            </div>
          )
        })()}
      </div>

      {/* Billing history */}
      <div className="card" style={{ padding: 20, borderRadius: 20 }}>
        <button onClick={() => setShowHistory(!showHistory)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, margin: 0 }}>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em', margin: 0 }}>Billing history</h3>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, margin: '4px 0 0' }}>All invoices and payment events.</p>
          </div>
          {showHistory ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
        </button>

        {showHistory && (
          <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            {summary.events.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No billing activity yet.</p>
            ) : (
              summary.events.map((ev) => {
                const Icon = EVENT_ICON[ev.event_type] ?? Receipt
                const failed = ev.status === 'failed'
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: failed ? '#FEF2F2' : '#EFF6FF', color: failed ? '#B91C1C' : '#3B82F6' }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{ev.title}</div>
                      {ev.description && <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 1.5 }}>{ev.description}</div>}
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{formatDateTime(ev.created_at)}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {ev.amount != null && <div style={{ fontSize: 14, fontWeight: 800, color: failed ? '#B91C1C' : '#0F172A' }}>{ev.currency ?? 'PHP'} {ev.amount.toLocaleString()}</div>}
                      {ev.invoice_url && (
                        <a href={ev.invoice_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          Invoice <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LimitRow({ icon: Icon, label, used, max }: { icon: typeof Users; label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const color = pct > 90 ? '#B91C1C' : pct > 70 ? '#F59E0B' : '#10B981'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={12} color="#64748B" />
      <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700, minWidth: 70 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A', minWidth: 50, textAlign: 'right' }}>{used}/{max}</span>
    </div>
  )
}

function DetailCard({ icon: Icon, label, value, sub }: { icon: typeof CreditCard; label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 14, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Icon size={14} /> {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
