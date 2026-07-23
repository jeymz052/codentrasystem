import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies } from '@/lib/supabase-server'
import { resolveBillingContext } from '@/lib/billing-auth'
import { notifyTenantBilling, recordBillingEvent, stripeRequest, updateTenantBilling } from '@/lib/billing'
import type { SubscriptionPlan } from '@/types/database'

export const runtime = 'nodejs'

/**
 * Cancel at period end, or reactivate a subscription that was set to cancel.
 * Body: { tenantId?: string, action: 'cancel' | 'reactivate' }
 */
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

  const cancelAtPeriodEnd = action === 'cancel'

  try {
    const updated = await stripeRequest<any>(`/subscriptions/${tenant.stripe_subscription_id}`, {
      method: 'POST',
      body: { cancel_at_period_end: cancelAtPeriodEnd },
    })

    await updateTenantBilling(tenant.id, {
      cancel_at_period_end: Boolean(updated?.cancel_at_period_end),
    })

    await recordBillingEvent({
      tenantId: tenant.id,
      eventType: cancelAtPeriodEnd ? 'subscription_cancelled' : 'plan_changed',
      title: cancelAtPeriodEnd ? 'Cancellation scheduled' : 'Cancellation reversed',
      description: cancelAtPeriodEnd
        ? 'Your subscription will end at the close of the current billing period.'
        : 'Your subscription will continue and auto-renew.',
      plan: tenant.plan as SubscriptionPlan,
      status: 'info',
      stripeObjectId: String(tenant.stripe_subscription_id),
    })

    try {
      await notifyTenantBilling(
        tenant.id,
        cancelAtPeriodEnd ? 'Subscription cancellation scheduled' : 'Subscription reactivated',
        cancelAtPeriodEnd
          ? 'Your subscription is scheduled to cancel at the end of the current billing period.'
          : 'Your subscription has been reactivated and will auto-renew.',
      )
    } catch {
      // best-effort notification; never fail the billing action on notification errors
    }

    const response = NextResponse.json({ ok: true, cancel_at_period_end: Boolean(updated?.cancel_at_period_end) })
    copyResponseCookies(cookieResponse, response)
    return response
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update subscription' }, { status: 500 })
  }
}
