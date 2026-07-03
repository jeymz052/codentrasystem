import { NextResponse, type NextRequest } from 'next/server'
import { PLAN_PRICE_ENV, getStripeSecretKey } from '@/lib/billing'
import { hasSuperAdminMembership, loadAccessibleTenants, getTenantMembership } from '@/lib/tenant-access'
import { copyResponseCookies, createSupabaseRouteClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const cookieResponse = NextResponse.next()
  const supabase = createSupabaseRouteClient(request, cookieResponse)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const tenantId = String(body.tenantId ?? request.cookies.get('codentra.active-tenant')?.value ?? '')
  const plan = String(body.plan ?? 'starter') as keyof typeof PLAN_PRICE_ENV

  if (!(plan in PLAN_PRICE_ENV)) {
    return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
  }

  const { tenants } = await loadAccessibleTenants(user.id)
  const tenant = tenants.find((entry) => entry.id === tenantId) ?? tenants[0]
  if (!tenant) {
    return NextResponse.json({ error: 'Complete onboarding first' }, { status: 409 })
  }

  const membership = await getTenantMembership(user.id, tenant.id)
  const canManageBilling = membership?.role === 'admin' || membership?.role === 'super_admin' || await hasSuperAdminMembership(user.id)
  if (!canManageBilling) {
    return NextResponse.json({ error: 'Only admins can manage billing' }, { status: 403 })
  }

  const priceEnvName = PLAN_PRICE_ENV[plan]
  const priceId = process.env[priceEnvName]
  if (!priceId) {
    return NextResponse.json({ error: `${priceEnvName} is not configured` }, { status: 400 })
  }

  const secretKey = getStripeSecretKey()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('success_url', `${origin}/dashboard/settings?billing=success`)
  params.set('cancel_url', `${origin}/dashboard/settings?billing=cancelled`)
  params.set('client_reference_id', tenant.id)
  params.set('customer_email', String(user.email ?? body.billing_email ?? ''))
  params.set('line_items[0][price]', priceId)
  params.set('line_items[0][quantity]', '1')
  params.set('metadata[tenant_id]', tenant.id)
  params.set('metadata[plan]', plan)
  params.set('metadata[price_id]', priceId)
  params.set('subscription_data[metadata][tenant_id]', tenant.id)
  params.set('subscription_data[metadata][plan]', plan)

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!stripeResponse.ok) {
    return NextResponse.json({ error: await stripeResponse.text() }, { status: 500 })
  }

  const session = await stripeResponse.json() as { url?: string; id?: string }
  const response = NextResponse.json({ url: session.url, id: session.id })
  copyResponseCookies(cookieResponse, response)
  return response
}
