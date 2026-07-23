'use client'

import { useMemo } from 'react'
import { AlertTriangle, BarChart3, CreditCard, Crown, Users, XCircle } from 'lucide-react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type BillingEventRow = {
  id: string
  tenant_id: string
  event_type: string
  title: string
  amount: number | null
  currency: string | null
  status: string | null
  created_at: string
}

type TenantRow = {
  id: string
  name: string
  plan: string
  subscription_status: string
  billing_interval: string | null
  is_active: boolean
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  grace_period_ends_at: string | null
  cancel_at_period_end: boolean | null
  card_brand: string | null
  card_last4: string | null
  billing_email: string | null
  created_at: string
}

type Kpis = {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  pastDueTenants: number
  suspendedTenants: number
  inactiveTenants: number
  mrr: number
  revenueThisMonth: number
}

type Props = {
  kpis: Kpis
  planDistribution: { plan: string; name: string; revenue: number; count: number; color: string }[]
  tenants: TenantRow[]
  events: BillingEventRow[]
  tenantNameById: Record<string, string>
}

const STATUS_COLOR: Record<string, string> = {
  active: '#10B981',
  trial: '#F59E0B',
  past_due: '#EF4444',
  suspended: '#6366F1',
  inactive: '#94A3B8',
}

const EVENT_ICON: Record<string, typeof CreditCard> = {
  trial_started: Crown,
  subscription_started: CreditCard,
  payment_succeeded: CreditCard,
  subscription_renewed: BarChart3,
  payment_failed: XCircle,
  grace_started: AlertTriangle,
  card_expiring: CreditCard,
  card_updated: CreditCard,
  subscription_cancelled: XCircle,
  subscription_ended: XCircle,
  plan_changed: BarChart3,
  invoice_upcoming: CreditCard,
  trial_will_end: Crown,
}

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#EF4444', '#06B6D4']

export function AdminBillingClient({ kpis, planDistribution, tenants, events, tenantNameById }: Props) {
  const fmtCurrency = (v: number) => `₱${v.toLocaleString()}`

  const pastDueTenants = useMemo(
    () => tenants.filter((t) => t.subscription_status === 'past_due' || t.subscription_status === 'suspended'),
    [tenants],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard label="MRR" value={fmtCurrency(kpis.mrr)} icon={Crown} color="#3B82F6" sub="Monthly recurring revenue" />
        <KpiCard label="Revenue (MTD)" value={fmtCurrency(kpis.revenueThisMonth)} icon={CreditCard} color="#10B981" sub="This month" />
        <KpiCard label="Active" value={String(kpis.activeTenants)} icon={CreditCard} color="#10B981" sub={`of ${kpis.totalTenants} tenants`} />
        <KpiCard label="Trials" value={String(kpis.trialTenants)} icon={BarChart3} color="#F59E0B" sub="On free trial" />
        <KpiCard label="Past due" value={String(kpis.pastDueTenants)} icon={AlertTriangle} color="#EF4444" sub="Payment issues" />
        <KpiCard label="Suspended" value={String(kpis.suspendedTenants)} icon={XCircle} color="#6366F1" sub="Access blocked" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Plan distribution</h3>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px' }}>Tenants per plan.</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {planDistribution.map((entry, index) => (
                    <Cell key={entry.plan} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any, props: any) => [`${value} tenants`, props.payload.name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Revenue by plan</h3>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px' }}>Estimated MRR per plan.</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planDistribution}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} formatter={(value: any) => [fmtCurrency(value as number), 'MRR']} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {planDistribution.map((entry, index) => (
                    <Cell key={entry.plan} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* At-risk tenants */}
      {pastDueTenants.length > 0 && (
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>At-risk tenants</h3>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px' }}>Past due or suspended subscriptions requiring attention.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {pastDueTenants.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEF2F2', color: '#B91C1C' }}>
                  <AlertTriangle size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {t.plan} · {t.billing_interval === 'year' ? 'Yearly' : t.billing_interval === 'month' ? 'Monthly' : '—'}
                    {t.subscription_status === 'past_due' && t.grace_period_ends_at && (
                      <span style={{ color: '#B91C1C', fontWeight: 700 }}> · Grace ends {new Date(t.grace_period_ends_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, color: STATUS_COLOR[t.subscription_status] ?? '#475569', background: '#F8FBFF', border: `1px solid ${STATUS_COLOR[t.subscription_status] ?? '#E2E8F0'}33` }}>
                  {t.subscription_status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent billing events */}
      <div className="card" style={{ padding: 20, borderRadius: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Recent billing events</h3>
        <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px' }}>Latest payment events across all tenants.</p>
        <div style={{ display: 'grid', gap: 8 }}>
          {events.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No billing events yet.</p>
          ) : (
            events.map((ev) => {
              const Icon = EVENT_ICON[ev.event_type] ?? CreditCard
              const failed = ev.status === 'failed'
              const tenantName = tenantNameById[ev.tenant_id] ?? 'Unknown tenant'
              return (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: failed ? '#FEF2F2' : '#EFF6FF', color: failed ? '#B91C1C' : '#3B82F6' }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{tenantName}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{new Date(ev.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {ev.amount != null && <div style={{ fontSize: 14, fontWeight: 800, color: failed ? '#B91C1C' : '#0F172A' }}>{ev.currency ?? 'PHP'} {ev.amount.toLocaleString()}</div>}
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, color: failed ? '#B91C1C' : '#047857', background: failed ? '#FEF2F2' : '#ECFDF5', display: 'inline-block', marginTop: 2 }}>
                      {ev.status}
                    </span>
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

function KpiCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: typeof Crown; color: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '16px 18px', borderRadius: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} />
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
