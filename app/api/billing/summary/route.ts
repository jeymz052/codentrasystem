import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies, getSupabaseServiceClient } from '@/lib/supabase-server'
import { resolveBillingContext } from '@/lib/billing-auth'
import type { BillingEvent, BillingSummary } from '@/types/database'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cookieResponse = NextResponse.next()
  const tenantId = request.nextUrl.searchParams.get('tenantId') ?? undefined

  let resolved
  try {
    resolved = await resolveBillingContext(request, cookieResponse, tenantId)
  } catch {
    return NextResponse.json({ error: 'Failed to resolve billing context' }, { status: 500 })
  }
  if ('error' in resolved) return resolved.error
  let { tenant } = resolved.ctx

  const client = getSupabaseServiceClient()

  let events: BillingEvent[] = []
  let usersCount = 0
  let productsCount = 0
  let locationsCount = 0

  try {
    const [eventsData, usersData, productsData, locationsData] = await Promise.all([
      client.from('billing_events').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50),
      client.from('users').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      client.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      client.from('locations').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('is_waste_location', false),
    ])

    events = (eventsData.data ?? []) as BillingEvent[]
    usersCount = usersData.count ?? 0
    productsCount = productsData.count ?? 0
    locationsCount = locationsData.count ?? 0
  } catch (err) {
    console.error('Billing summary queries failed:', err instanceof Error ? err.message : err)
    // Return partial data rather than a 500 — counts may be stale, but billing info is preserved.
  }

  const summary: BillingSummary = {
    tenant_id: tenant.id,
    plan: tenant.plan,
    subscription_status: tenant.subscription_status,
    billing_interval: tenant.billing_interval ?? null,
    trial_ends_at: tenant.trial_ends_at ?? null,
    subscription_ends_at: tenant.subscription_ends_at ?? null,
    grace_period_ends_at: tenant.grace_period_ends_at ?? null,
    current_period_end: tenant.current_period_end ?? null,
    cancel_at_period_end: Boolean(tenant.cancel_at_period_end),
    has_used_trial: Boolean(tenant.has_used_trial),
    has_active_subscription: Boolean(tenant.stripe_subscription_id) &&
      ['active', 'trial', 'past_due'].includes(String(tenant.subscription_status)),
    billing_email: tenant.billing_email ?? null,
    card: tenant.card_last4
      ? {
          brand: tenant.card_brand ?? null,
          last4: tenant.card_last4 ?? null,
          exp_month: tenant.card_exp_month ?? null,
          exp_year: tenant.card_exp_year ?? null,
        }
      : null,
    events,
    usage: {
      users: usersCount,
      products: productsCount,
      locations: locationsCount,
    },
  }

  const response = NextResponse.json(summary)
  copyResponseCookies(cookieResponse, response)
  return response
}
