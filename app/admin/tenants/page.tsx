import { redirect } from 'next/navigation'
import { BarChart3, Building2, ShieldCheck, Users, Wallet, AlertTriangle, XCircle, Crown, CreditCard } from 'lucide-react'
import { createSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase-server'
import { hasSuperAdminMembership, isConfiguredSuperAdminEmail } from '@/lib/tenant-access'
import { formatTimestamp } from '@/lib/utils'
import { ProvisionTenantForm } from '@/components/admin/ProvisionTenantForm'
import { AdminBillingClient } from './AdminBillingClient'

type TenantRow = {
  id: string
  name: string
  business_type: string
  plan: string
  subscription_status: string
  billing_email: string | null
  billing_interval: string | null
  current_period_end: string | null
  trial_ends_at: string | null
  grace_period_ends_at: string | null
  cancel_at_period_end: boolean | null
  card_brand: string | null
  card_last4: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

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

type AuditLogRow = {
  id: string
  tenant_id: string
  user_id: string | null
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  performed_by: string | null
  performed_at: string
}

type PlanPrice = {
  plan: string
  name: string
  price_monthly: number
  price_yearly: number
}

export default async function AdminTenantsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/admin/tenants')
  }

  const isSuperAdmin = isConfiguredSuperAdminEmail(user.email) || await hasSuperAdminMembership(user.id)
  if (!isSuperAdmin) {
    redirect('/dashboard')
  }

  const serviceClient = getSupabaseServiceClient()
  const [
    tenantsResult,
    membershipsResult,
    usersResult,
    productsResult,
    auditLogsResult,
    billingEventsResult,
    plansResult,
  ] = await Promise.all([
    serviceClient.from('tenants').select('id, name, business_type, plan, subscription_status, billing_email, billing_interval, current_period_end, trial_ends_at, grace_period_ends_at, cancel_at_period_end, card_brand, card_last4, stripe_subscription_id, created_at, updated_at, is_active').order('created_at', { ascending: true }),
    serviceClient.from('tenant_memberships').select('tenant_id, role'),
    serviceClient.from('users').select('tenant_id, id'),
    serviceClient.from('products').select('tenant_id, id'),
    serviceClient.from('audit_logs').select('*').order('performed_at', { ascending: false }).limit(50),
    serviceClient.from('billing_events').select('id, tenant_id, event_type, title, amount, currency, status, created_at').order('created_at', { ascending: false }).limit(40),
    serviceClient.from('subscription_plans').select('plan, name, price_monthly, price_yearly').eq('is_active', true),
  ])

  if (tenantsResult.error) throw tenantsResult.error
  if (membershipsResult.error) throw membershipsResult.error
  if (usersResult.error) throw usersResult.error
  if (productsResult.error) throw productsResult.error
  if (auditLogsResult.error) throw auditLogsResult.error

  const tenants = (tenantsResult.data ?? []) as TenantRow[]
  const auditLogs = (auditLogsResult.data ?? []) as AuditLogRow[]
  const billingEvents = (billingEventsResult.error ? [] : (billingEventsResult.data ?? [])) as BillingEventRow[]
  const plans = (plansResult.error ? [] : (plansResult.data ?? [])) as PlanPrice[]
  const planMap = new Map(plans.map((p) => [p.plan, p]))

  const membershipCounts = new Map<string, number>()
  const userCounts = new Map<string, number>()
  const productCounts = new Map<string, number>()
  const tenantNameById = new Map<string, string>()
  const tenantNameByIdRecord: Record<string, string> = {}
  const userById = new Map<string, { full_name: string; email: string }>()

  for (const membership of membershipsResult.data ?? []) {
    membershipCounts.set(membership.tenant_id, (membershipCounts.get(membership.tenant_id) ?? 0) + 1)
  }

  for (const row of usersResult.data ?? []) {
    userCounts.set(row.tenant_id, (userCounts.get(row.tenant_id) ?? 0) + 1)
  }

  for (const row of productsResult.data ?? []) {
    productCounts.set(row.tenant_id, (productCounts.get(row.tenant_id) ?? 0) + 1)
  }

  for (const tenant of tenants) {
    tenantNameById.set(tenant.id, tenant.name)
    tenantNameByIdRecord[tenant.id] = tenant.name
  }

  for (const row of usersResult.data ?? []) {
    userById.set(row.id, { full_name: '', email: '' })
  }

  const summary = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((tenant) => tenant.is_active).length,
    trialTenants: tenants.filter((tenant) => tenant.subscription_status === 'trial').length,
    enterpriseTenants: tenants.filter((tenant) => tenant.plan === 'enterprise').length,
    payingTenants: tenants.filter((tenant) => tenant.subscription_status === 'active' && tenant.stripe_subscription_id).length,
    pastDueTenants: tenants.filter((tenant) => tenant.subscription_status === 'past_due').length,
    suspendedTenants: tenants.filter((tenant) => tenant.subscription_status === 'suspended').length,
    inactiveTenants: tenants.filter((tenant) => tenant.subscription_status === 'inactive').length,
  }

  const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

  let mrr = 0
  const revenueByPlan = new Map<string, { plan: string; name: string; revenue: number; count: number; color: string }>()
  const colors: Record<string, string> = { starter: '#3B82F6', professional: '#8B5CF6', enterprise: '#F59E0B' }

  for (const t of tenants) {
    const plan = planMap.get(t.plan)
    if (!plan) continue

    const isSubscribed = ['active', 'trial', 'past_due'].includes(t.subscription_status) && t.stripe_subscription_id
    if (isSubscribed) {
      const price = t.billing_interval === 'year' ? Number(plan.price_yearly) / 12 : Number(plan.price_monthly)
      mrr += price
    }

    const existing = revenueByPlan.get(t.plan)
    if (existing) {
      existing.count += 1
      if (isSubscribed) existing.revenue += t.billing_interval === 'year' ? Number(plan.price_yearly) / 12 : Number(plan.price_monthly)
    } else {
      revenueByPlan.set(t.plan, {
        plan: t.plan,
        name: plan.name,
        revenue: isSubscribed ? (t.billing_interval === 'year' ? Number(plan.price_yearly) / 12 : Number(plan.price_monthly)) : 0,
        count: 1,
        color: colors[t.plan] || '#64748B',
      })
    }
  }

  const planDistribution = Array.from(revenueByPlan.values())
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const revenueThisMonth = billingEvents
    .filter((e) => {
      const d = new Date(e.created_at)
      return e.status === 'succeeded' && d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    .reduce((sum, e) => sum + (e.amount ?? 0), 0)

  const atRiskTenants = tenants
    .filter((t) => t.subscription_status === 'past_due' || t.subscription_status === 'suspended')
    .map((t) => ({
      id: t.id,
      name: t.name,
      plan: t.plan,
      subscription_status: t.subscription_status,
      billing_interval: t.billing_interval,
      grace_period_ends_at: t.grace_period_ends_at,
      cancel_at_period_end: t.cancel_at_period_end,
      current_period_end: t.current_period_end,
    }))

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 50%, #F7FAFC 100%)',
      color: '#0F172A',
    }}>
      <div style={{ padding: '28px 24px 40px' }}>
        <div style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 6 }}>Tenants & Billing</h1>
            <p style={{ color: '#475569', fontSize: 14, maxWidth: 760 }}>
              Review every tenant, subscription health, and billing activity from a single place.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Tenants', value: summary.totalTenants, icon: <Building2 size={18} />, color: '#3B82F6' },
            { label: 'Paying', value: summary.payingTenants, icon: <ShieldCheck size={18} />, color: '#10B981' },
            { label: 'Trials', value: summary.trialTenants, icon: <BarChart3 size={18} />, color: '#F59E0B' },
            { label: 'Past due', value: summary.pastDueTenants, icon: <BarChart3 size={18} />, color: '#EF4444' },
            { label: 'Suspended', value: summary.suspendedTenants, icon: <Users size={18} />, color: '#B91C1C' },
            { label: 'Enterprise', value: summary.enterpriseTenants, icon: <Users size={18} />, color: '#8B5CF6' },
          ].map((card) => (
            <div key={card.label} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${card.color}14`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 22 }}>
          <ProvisionTenantForm />
        </div>

        <div className="card table-scroll tenant-desktop-table" style={{ overflow: 'hidden', marginBottom: 22 }}>
          <table className="data-table">
            <thead><tr>
                <th>Tenant</th>
                <th>Type</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Interval</th>
                <th>Next renewal</th>
                <th>Card</th>
                <th>Members</th>
                <th>Billing Email</th>
              </tr></thead>
            <tbody>
              {tenants.map((tenant) => {
                const statusColor = tenant.subscription_status === 'active'
                  ? 'badge-green'
                  : tenant.subscription_status === 'trial'
                    ? 'badge-amber'
                    : 'badge-red'

                const nextRenewal = tenant.subscription_status === 'trial' ? tenant.trial_ends_at : tenant.current_period_end

                return (
                  <tr key={tenant.id}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{tenant.name}</td>
                    <td>{tenant.business_type.replaceAll('_', ' ')}</td>
                    <td><span className="badge badge-blue">{tenant.plan}</span></td>
                    <td><span className={`badge ${statusColor}`}>{tenant.subscription_status.replace('_', ' ')}{tenant.cancel_at_period_end ? ' (cancelling)' : ''}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{tenant.billing_interval === 'year' ? 'Yearly' : tenant.billing_interval === 'month' ? 'Monthly' : '—'}</td>
                    <td>{fmtDate(nextRenewal)}</td>
                    <td>{tenant.card_last4 ? `${tenant.card_brand ?? 'Card'} •••• ${tenant.card_last4}` : '—'}</td>
                    <td>{membershipCounts.get(tenant.id) ?? 0}</td>
                    <td>{tenant.billing_email ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em', marginBottom: 4 }}>Billing Analytics</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>Platform revenue, plan distribution, and at-risk accounts.</p>
          <AdminBillingClient
            kpis={{ ...summary, mrr: Math.round(mrr), revenueThisMonth }}
            planDistribution={planDistribution}
            tenants={tenants}
            events={billingEvents.slice(0, 15)}
            tenantNameById={tenantNameByIdRecord}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <div className="card table-scroll" style={{ overflow: 'hidden' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>Billing events</h3>
            <table className="data-table">
              <thead><tr>
                <th>Event</th>
                <th>Tenant</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr></thead>
              <tbody>
                {billingEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{ev.title}</td>
                    <td>{tenantNameById.get(ev.tenant_id) ?? '—'}</td>
                    <td>{ev.amount != null ? `${ev.currency ?? 'PHP'} ${ev.amount.toLocaleString()}` : '—'}</td>
                    <td><span className={`badge ${ev.status === 'succeeded' ? 'badge-green' : ev.status === 'failed' ? 'badge-red' : 'badge-amber'}`}>{ev.status}</span></td>
                    <td>{fmtDate(ev.created_at)}</td>
                  </tr>
                ))}
                {billingEvents.length === 0 && (
                  <tr><td colSpan={5} style={{ color: '#94A3B8', textAlign: 'center' }}>No billing events yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>Recent audit log</h3>
            <div style={{ display: 'grid', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {auditLogs.map((log) => (
                <div key={log.id} style={{ padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{log.action} <span style={{ color: '#64748B', fontWeight: 600 }}>{log.target_type}</span></div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{tenantNameById.get(log.tenant_id) ?? '—'}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{formatTimestamp(log.performed_at)}</div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No audit logs yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
