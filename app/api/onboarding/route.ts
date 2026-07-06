import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { seedDemoSystem, remapStateTenantId } from '@/lib/demo-system'
import { upsertTenantState } from '@/lib/system-db'
import { copyResponseCookies, createSupabaseRouteClient, getSupabaseServiceClient } from '@/lib/supabase-server'
import type { BusinessType, SubscriptionPlan } from '@/types/database'

const PLAN_LIMITS: Record<SubscriptionPlan, { max_users: number; max_products: number; max_locations: number }> = {
  starter: { max_users: 3, max_products: 100, max_locations: 1 },
  professional: { max_users: 10, max_products: 1000, max_locations: 5 },
  enterprise: { max_users: 999, max_products: 9999, max_locations: 99 },
}

export async function POST(request: NextRequest) {
  const cookieResponse = NextResponse.next()
  const supabase = createSupabaseRouteClient(request, cookieResponse)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const business_name = String(body.business_name ?? '').trim()
  const business_type = String(body.business_type ?? 'general') as BusinessType
  const billing_email = String(body.billing_email ?? user.email ?? '').trim()
  const plan = String(body.plan ?? 'starter') as SubscriptionPlan
  const timezone = String(body.timezone ?? 'Asia/Manila')

  if (!business_name) {
    return NextResponse.json({ error: 'business_name is required' }, { status: 400 })
  }

  const tenantId = randomUUID()
  const seed = remapStateTenantId(seedDemoSystem(business_type), tenantId)
  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const limits = PLAN_LIMITS[plan]

  seed.tenant = {
    ...seed.tenant,
    id: tenantId,
    name: business_name,
    business_type,
    email: billing_email,
    billing_email,
    plan,
    subscription_status: 'trial',
    trial_ends_at: trialEndsAt,
    subscription_ends_at: null,
    timezone,
    max_users: limits.max_users,
    max_products: limits.max_products,
    max_locations: limits.max_locations,
  }

  seed.users = [{
    id: user.id,
    tenant_id: tenantId,
    role: 'admin',
    full_name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? business_name).trim(),
    email: String(user.email ?? billing_email).trim(),
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }]
  seed.currentUserId = user.id

  await upsertTenantState(seed)

  const serviceClient = getSupabaseServiceClient()

  await serviceClient
    .from('tenant_memberships')
    .update({ is_default: false })
    .eq('auth_user_id', user.id)

  const { error: membershipError } = await serviceClient.from('tenant_memberships').insert({
    id: randomUUID(),
    tenant_id: tenantId,
    auth_user_id: user.id,
    role: 'admin',
    is_default: true,
  })

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  const response = NextResponse.json({ ok: true, tenantId })
  copyResponseCookies(cookieResponse, response)
  response.cookies.set({
    name: 'codentra.active-tenant',
    value: tenantId,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
