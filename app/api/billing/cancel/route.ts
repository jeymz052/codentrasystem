import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies } from '@/lib/supabase-server'
import { resolveBillingContext } from '@/lib/billing-auth'
import {
  cancelPayMongoSubscription,
  notifyTenantBilling,
  recordBillingEvent,
  updateTenantBilling,
} from '@/lib/paymongo-billing'
import type { SubscriptionPlan } from '@/types/database'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const cookieResponse = NextResponse.next()

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const resolved = await resolveBillingContext(request, cookieResponse, body.tenantId)
  if ('error' in resolved) return resolved.error
  const { tenant } = resolved.ctx

  const action = String(body.action ?? '')
  if (!['cancel', 'reactivate'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (!tenant.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription to modify' }, { status: 409 })
  }

  if (action === 'reactivate') {
    return NextResponse.json({ error: 'PayMongo cancellations take effect immediately. Please subscribe again from Billing.' }, { status: 409 })
  }

  try {
    await cancelPayMongoSubscription(tenant.stripe_subscription_id)

    await updateTenantBilling(tenant.id, {
      subscription_status: 'suspended',
      subscription_ends_at: new Date().toISOString(),
      grace_period_ends_at: null,
      cancel_at_period_end: false,
      is_active: false,
    })

    await recordBillingEvent({
      tenantId: tenant.id,
      eventType: 'subscription_cancelled',
      title: 'Subscription cancelled',
      description: 'The subscription was cancelled and access is suspended.',
      plan: tenant.plan as SubscriptionPlan,
      status: 'info',
      stripeObjectId: String(tenant.stripe_subscription_id),
    })

    try {
      await notifyTenantBilling(tenant.id, 'Subscription cancelled', 'Your PayMongo subscription has been cancelled. Subscribe again from Billing to restore access.')
    } catch {
      // best-effort notification
    }

    const response = NextResponse.json({ ok: true, cancel_at_period_end: false })
    copyResponseCookies(cookieResponse, response)
    return response
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update subscription' }, { status: 500 })
  }
}
