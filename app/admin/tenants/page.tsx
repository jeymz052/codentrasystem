import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, BarChart3, Building2, ShieldCheck, Users } from 'lucide-react'
import { createSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase-server'
import { hasSuperAdminMembership, isConfiguredSuperAdminEmail } from '@/lib/tenant-access'

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
  ] = await Promise.all([
    serviceClient.from('tenants').select('id, name, business_type, plan, subscription_status, billing_email, created_at, updated_at, is_active').order('created_at', { ascending: true }),
    serviceClient.from('tenant_memberships').select('tenant_id, role'),
    serviceClient.from('users').select('tenant_id, id'),
    serviceClient.from('products').select('tenant_id, id'),
  ])

  if (tenantsResult.error) throw tenantsResult.error
  if (membershipsResult.error) throw membershipsResult.error
  if (usersResult.error) throw usersResult.error
  if (productsResult.error) throw productsResult.error

  const tenants = (tenantsResult.data ?? []) as TenantRow[]
  const membershipCounts = new Map<string, number>()
  const userCounts = new Map<string, number>()
  const productCounts = new Map<string, number>()

  for (const membership of membershipsResult.data ?? []) {
    membershipCounts.set(membership.tenant_id, (membershipCounts.get(membership.tenant_id) ?? 0) + 1)
  }

  for (const row of usersResult.data ?? []) {
    userCounts.set(row.tenant_id, (userCounts.get(row.tenant_id) ?? 0) + 1)
  }

  for (const row of productsResult.data ?? []) {
    productCounts.set(row.tenant_id, (productCounts.get(row.tenant_id) ?? 0) + 1)
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
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <div className="badge badge-blue" style={{ marginBottom: 10 }}>
              <ShieldCheck size={14} />
              Superadmin console
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 6 }}>Tenant monitoring</h1>
            <p style={{ color: '#475569', fontSize: 14, maxWidth: 760 }}>
              Review every tenant, plan, and membership from a single place. This page is for global oversight and account health.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-ghost">
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
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

        <div className="card table-scroll" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Type</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Members</th>
                <th>Users</th>
                <th>Products</th>
                <th>Billing Email</th>
              </tr>
            </thead>
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
      </div>
    </main>
  )
}
