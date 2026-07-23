import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'
import {
  getTenantMembership,
  hasSuperAdminMembership,
  isConfiguredSuperAdminEmail,
  loadAccessibleTenants,
} from '@/lib/tenant-access'
import { findTenantByStripeReference } from '@/lib/billing'

export type BillingAuthContext = {
  user: { id: string; email: string | null }
  tenant: Record<string, any>
}

/**
 * Resolve the authenticated user, the target tenant, and confirm the caller is
 * allowed to manage billing (tenant admin or platform super admin). Returns
 * either a context or a NextResponse error to return directly.
 */
export async function resolveBillingContext(
  request: NextRequest,
  cookieResponse: NextResponse,
  bodyTenantId?: string
): Promise<{ ctx: BillingAuthContext } | { error: NextResponse }> {
  const supabase = createSupabaseRouteClient(request, cookieResponse)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const tenantId = String(
    bodyTenantId ?? request.cookies.get('codentra.active-tenant')?.value ?? ''
  )

  const { tenants } = await loadAccessibleTenants(user.id, user.email)
  const accessible = tenants.find((entry) => entry.id === tenantId) ?? tenants[0]
  if (!accessible) {
    return { error: NextResponse.json({ error: 'Complete onboarding first' }, { status: 409 }) }
  }

  const membership = await getTenantMembership(user.id, accessible.id)
  const canManageBilling =
    membership?.role === 'admin' ||
    membership?.role === 'super_admin' ||
    isConfiguredSuperAdminEmail(user.email) ||
    (await hasSuperAdminMembership(user.id))

  if (!canManageBilling) {
    return { error: NextResponse.json({ error: 'Only admins can manage billing' }, { status: 403 }) }
  }

  const tenant = await findTenantByStripeReference({ tenantId: accessible.id })
  if (!tenant) {
    return { error: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }) }
  }

  return { ctx: { user: { id: user.id, email: user.email ?? null }, tenant } }
}
