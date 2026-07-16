import type { AccessibleTenant, TenantMembership } from '@/types/database'
import { getSupabaseServiceClient } from '@/lib/supabase-server'

type MembershipRow = TenantMembership

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'superadmin@codentra.local'

export function isConfiguredSuperAdminEmail(email?: string | null) {
  return String(email ?? '').trim().toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
}

export async function loadAccessibleTenants(authUserId: string, authUserEmail?: string | null, preferredTenantId?: string | null): Promise<{ tenants: AccessibleTenant[]; activeTenantId: string | null }> {
  const client = getSupabaseServiceClient()

  // A super admin can see every tenant, but "active" should still follow the
  // workspace the user last selected (the cookie set on onboarding / tenant
  // switch) rather than blindly defaulting to the OLDEST tenant. Otherwise a
  // freshly onboarded workspace is ignored and the header/selector keeps
  // showing a stale "Untitled Workspace" tenant.
  if (isConfiguredSuperAdminEmail(authUserEmail)) {
    const { data: tenantRows, error: tenantError } = await client
      .from('tenants')
      .select('id, name, business_type, plan, subscription_status, created_at')
      .order('created_at', { ascending: false })

    if (tenantError) {
      throw tenantError
    }

    const tenants = (tenantRows ?? []).map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      business_type: tenant.business_type,
      plan: tenant.plan,
      subscription_status: tenant.subscription_status,
      role: 'super_admin' as const,
      is_default: false,
    }))

    const byId = new Map(tenants.map((tenant) => [tenant.id, tenant]))
    const activeTenantId = (preferredTenantId && byId.has(preferredTenantId))
      ? preferredTenantId
      : (tenants[0]?.id ?? null)

    return { tenants, activeTenantId }
  }

  const { data, error } = await client
    .from('tenant_memberships')
    .select('id, tenant_id, auth_user_id, role, is_default, created_at')
    .eq('auth_user_id', authUserId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  const memberships = (data ?? []) as MembershipRow[]
  const isSuperAdmin = memberships.some((membership) => membership.role === 'super_admin')

  if (isSuperAdmin) {
    const { data: tenantRows, error: tenantError } = await client
      .from('tenants')
      .select('id, name, business_type, plan, subscription_status, created_at')
      .order('created_at', { ascending: true })

    if (tenantError) {
      throw tenantError
    }

    const tenants = (tenantRows ?? []).map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      business_type: tenant.business_type,
      plan: tenant.plan,
      subscription_status: tenant.subscription_status,
      role: 'super_admin' as const,
      is_default: false,
    }))

    const byId = new Map(tenants.map((tenant) => [tenant.id, tenant]))
    const activeTenantId = (preferredTenantId && byId.has(preferredTenantId))
      ? preferredTenantId
      : (tenants[0]?.id ?? null)

    return { tenants, activeTenantId }
  }

  const uniqueMemberships = Array.from(
    new Map(
      memberships.map((membership) => [
        membership.tenant_id,
        membership,
      ])
    ).values()
  )

  const tenantIds = uniqueMemberships.map((membership) => membership.tenant_id)
  if (!tenantIds.length) {
    return { tenants: [], activeTenantId: null }
  }

  const { data: tenantRows, error: tenantError } = await client
    .from('tenants')
    .select('id, name, business_type, plan, subscription_status')
    .in('id', tenantIds)

  if (tenantError) {
    throw tenantError
  }

  const tenantById = new Map((tenantRows ?? []).map((row) => [row.id, row]))
  const tenants = uniqueMemberships
    .map((membership) => {
      const tenant = tenantById.get(membership.tenant_id)
      if (!tenant) return null
      return {
        id: tenant.id,
        name: tenant.name,
        business_type: tenant.business_type,
        plan: tenant.plan,
        subscription_status: tenant.subscription_status,
        role: membership.role,
        is_default: membership.is_default,
      } satisfies AccessibleTenant
    })
    .filter(Boolean) as AccessibleTenant[]

  const activeTenantId = tenants.find((tenant) => tenant.is_default)?.id ?? tenants[0]?.id ?? null

  return { tenants, activeTenantId }
}

export async function canAccessTenant(authUserId: string, tenantId: string, authUserEmail?: string | null) {
  if (isConfiguredSuperAdminEmail(authUserEmail)) {
    return true
  }

  const client = getSupabaseServiceClient()
  const { data, error } = await client
    .from('tenant_memberships')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data) || await hasSuperAdminMembership(authUserId)
}

export async function getTenantMembership(authUserId: string, tenantId: string) {
  const client = getSupabaseServiceClient()
  const { data, error } = await client
    .from('tenant_memberships')
    .select('id, tenant_id, auth_user_id, role, is_default, created_at')
    .eq('auth_user_id', authUserId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as TenantMembership | null
}

export async function hasSuperAdminMembership(authUserId: string) {
  const client = getSupabaseServiceClient()
  const { data, error } = await client
    .from('tenant_memberships')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('role', 'super_admin')
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}
