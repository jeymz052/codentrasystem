import { redirect } from 'next/navigation'
import { BarChart3, Building2, ShieldCheck, Users } from 'lucide-react'
import { createSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase-server'
import { hasSuperAdminMembership, isConfiguredSuperAdminEmail } from '@/lib/tenant-access'
import { formatTimestamp } from '@/lib/utils'
import { ProvisionTenantForm } from '@/components/admin/ProvisionTenantForm'

type TenantRow = {
  id: string
  name: string
  business_type: string
  plan: string
  subscription_status: string
  billing_email: string | null
  created_at: string
  updated_at: string
  is_active: boolean
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
  ] = await Promise.all([
    serviceClient.from('tenants').select('id, name, business_type, plan, subscription_status, billing_email, created_at, updated_at, is_active').order('created_at', { ascending: true }),
    serviceClient.from('tenant_memberships').select('tenant_id, role'),
    serviceClient.from('users').select('tenant_id, id'),
    serviceClient.from('products').select('tenant_id, id'),
    serviceClient.from('audit_logs').select('*').order('performed_at', { ascending: false }).limit(50),
  ])

  if (tenantsResult.error) throw tenantsResult.error
  if (membershipsResult.error) throw membershipsResult.error
  if (usersResult.error) throw usersResult.error
  if (productsResult.error) throw productsResult.error
  if (auditLogsResult.error) throw auditLogsResult.error

  const tenants = (tenantsResult.data ?? []) as TenantRow[]
  const auditLogs = (auditLogsResult.data ?? []) as AuditLogRow[]
  const membershipCounts = new Map<string, number>()
  const userCounts = new Map<string, number>()
  const productCounts = new Map<string, number>()
  const tenantNameById = new Map<string, string>()
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
  }

  for (const row of usersResult.data ?? []) {
    userById.set(row.id, { full_name: '', email: '' })
  }

  const summary = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((tenant) => tenant.is_active).length,
    trialTenants: tenants.filter((tenant) => tenant.subscription_status === 'trial').length,
    enterpriseTenants: tenants.filter((tenant) => tenant.plan === 'enterprise').length,
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 50%, #F7FAFC 100%)',
      color: '#0F172A',
    }}>
      <div style={{ padding: '28px 24px 40px' }}>
        <div style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 6 }}>Tenant monitoring</h1>
            <p style={{ color: '#475569', fontSize: 14, maxWidth: 760 }}>
              Review every tenant, plan, and membership from a single place. This page is for global oversight and account health.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Tenants', value: summary.totalTenants, icon: <Building2 size={18} />, color: '#3B82F6' },
            { label: 'Active', value: summary.activeTenants, icon: <ShieldCheck size={18} />, color: '#10B981' },
            { label: 'Trials', value: summary.trialTenants, icon: <BarChart3 size={18} />, color: '#F59E0B' },
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
                <th>Members</th>
                <th>Users</th>
                <th>Products</th>
                <th>Billing Email</th>
              </tr></thead>
            <tbody>
              {tenants.map((tenant) => {
                const statusColor = tenant.subscription_status === 'active'
                  ? 'badge-green'
                  : tenant.subscription_status === 'trial'
                    ? 'badge-amber'
                    : 'badge-red'

                return (
                  <tr key={tenant.id}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{tenant.name}</td>
                    <td>{tenant.business_type.replaceAll('_', ' ')}</td>
                    <td><span className="badge badge-blue">{tenant.plan}</span></td>
                    <td><span className={`badge ${statusColor}`}>{tenant.subscription_status}</span></td>
                    <td>{membershipCounts.get(tenant.id) ?? 0}</td>
                    <td>{userCounts.get(tenant.id) ?? 0}</td>
                    <td>{productCounts.get(tenant.id) ?? 0}</td>
                    <td>{tenant.billing_email ?? 'N/A'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="tenant-mobile-list">
          {tenants.map((tenant) => {
            const statusColor = tenant.subscription_status === 'active'
              ? 'badge-green'
              : tenant.subscription_status === 'trial'
                ? 'badge-amber'
                : 'badge-red'
            return (
              <div key={tenant.id} className="card" style={{ padding: 14, borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, textTransform: 'capitalize' }}>{tenant.business_type.replaceAll('_', ' ')}</div>
                  </div>
                  <span className={`badge ${statusColor}`}>{tenant.subscription_status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B' }}>Plan</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>{tenant.plan}</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B' }}>Billing</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.billing_email ?? 'N/A'}</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B' }}>Members / Users</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{membershipCounts.get(tenant.id) ?? 0} / {userCounts.get(tenant.id) ?? 0}</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#64748B' }}>Products</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{productCounts.get(tenant.id) ?? 0}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="card" style={{ padding: 18, borderRadius: 18 }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>Cross-tenant audit trail</div>
          <div style={{ display: 'grid', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
            {auditLogs.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 13 }}>No audit entries recorded yet.</p>
            ) : (
              auditLogs.map((log) => {
                const tenantName = tenantNameById.get(log.tenant_id) ?? 'Unknown tenant'
                const label = String(log.action).replace('user.', '').replace('product.', '').replace('supplier.', '').replace('order.', '')
                return (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0', fontSize: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{label}</span>
                      <span style={{ color: '#64748B', marginLeft: 6 }}>{String(log.details?.full_name ?? log.details?.name ?? log.target_id ?? '')}</span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: '#475569' }}>{tenantName}</div>
                      <div style={{ color: '#94A3B8', fontSize: 10 }}>{formatTimestamp(log.performed_at)}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
