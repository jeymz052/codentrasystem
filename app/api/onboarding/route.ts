import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { upsertTenantState } from '@/lib/system-db'
import { copyResponseCookies, createSupabaseRouteClient, getSupabaseServiceClient } from '@/lib/supabase-server'
import type { BusinessType, SubscriptionPlan, SubscriptionStatus, UserRole } from '@/types/database'

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
  const business_type = String(body.business_type ?? 'retail') as BusinessType
  const billing_email = String(body.billing_email ?? user.email ?? '').trim()
  const plan = String(body.plan ?? 'starter') as SubscriptionPlan
  const timezone = String(body.timezone ?? 'Asia/Manila')

  if (!business_name) {
    return NextResponse.json({ error: 'business_name is required' }, { status: 400 })
  }

  const tenantId = randomUUID()
  const now = new Date().toISOString()
  const subscriptionEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  const limits = PLAN_LIMITS[plan]

  const seed = {
    tenant: {
      id: tenantId,
      name: business_name,
      business_type,
      logo_url: null,
      address: null,
      phone: null,
      email: billing_email,
      tax_id: null,
      currency: 'PHP',
      timezone,
      plan,
      subscription_status: 'active' as SubscriptionStatus,
      trial_ends_at: null,
      subscription_ends_at: subscriptionEndsAt,
      max_users: limits.max_users,
      max_products: limits.max_products,
      max_locations: limits.max_locations,
      enable_production: business_type === 'manufacturing',
      is_active: true,
      billing_email,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      gcash_account: null,
      gcash_qr_url: null,
      maya_account: null,
      maya_qr_url: null,
      bdo_account: null,
      bdo_qr_url: null,
      maribank_account: null,
      maribank_qr_url: null,
      payment_accounts: [],
      pos_location_id: null,
      pos_store_locations: [],
      pos_stations: [],
      created_at: now,
      updated_at: now,
    },
    currentUserId: user.id,
    categories: [],
    unitsOfMeasure: [],
    locations: [],
    suppliers: [],
    products: [],
    users: [{
      id: user.id,
      tenant_id: tenantId,
      role: 'admin' as UserRole,
      full_name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? business_name).trim(),
      email: String(user.email ?? billing_email).trim(),
      avatar_url: null,
      is_active: true,
      last_login: null,
      created_at: now,
      updated_at: now,
    }],
    cashShifts: [],
    cashMovements: [],
    purchaseOrders: [],
    purchaseOrderItems: [],
    salesTransactions: [],
    salesTransactionItems: [],
    stockMovements: [],
    alerts: [],
    auditLogs: [],
    productRecipes: [],
    productionTemplates: [],
    inventoryLots: [],
    deletionRequests: [],
  }

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
