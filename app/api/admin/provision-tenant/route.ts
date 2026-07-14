import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createProvisionedTenant, provisionTenantUserAccess } from '@/lib/system-db'
import { hasSuperAdminMembership, isConfiguredSuperAdminEmail } from '@/lib/tenant-access'
import type { BusinessType, SubscriptionPlan, UserRole } from '@/types/database'

const VALID_PLANS: SubscriptionPlan[] = ['starter', 'professional', 'enterprise']
const VALID_ROLES: UserRole[] = ['admin', 'manager', 'sales_staff']

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin =
    isConfiguredSuperAdminEmail(user.email) || (await hasSuperAdminMembership(user.id))
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Only the platform owner can provision tenants.' }, { status: 403 })
  }

  const body = await request.json()
  const name = String(body.business_name ?? '').trim()
  const business_type = String(body.business_type ?? 'general') as BusinessType
  const plan = String(body.plan ?? '') as SubscriptionPlan
  const billing_email = String(body.billing_email ?? user.email ?? '').trim()
  const client_email = String(body.client_email ?? '').trim().toLowerCase()
  const role = (String(body.role ?? 'admin') as UserRole)
  const origin = request.nextUrl.origin

  if (!name) {
    return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
  }
  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
  }
  if (!client_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(client_email)) {
    return NextResponse.json({ error: 'A valid client email is required.' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
  }

  try {
    const tenantId = await createProvisionedTenant({
      name,
      business_type,
      plan,
      billing_email,
      timezone: String(body.timezone ?? 'Asia/Manila'),
    })

    await provisionTenantUserAccess(
      tenantId,
      { email: client_email, full_name: String(body.client_name ?? '').trim(), role },
      origin,
    )

    return NextResponse.json({ ok: true, tenantId })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to provision tenant.' },
      { status: 500 },
    )
  }
}
