import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies } from '@/lib/supabase-server'
import { resolveBillingContext } from '@/lib/billing-auth'
import {
  PLAN_LIMITS,
  TRIAL_DAYS,
  getPriceId,
  notifyTenantBilling,
  recordBillingEvent,
  stripeRequest,
  updateTenantBilling,
} from '@/lib/billing'
import type { BillingInterval, SubscriptionPlan } from '@/types/database'

export const runtime = 'nodejs'

const VALID_PLANS: SubscriptionPlan[] = ['starter', 'professional', 'enterprise']
const VALID_INTERVALS: BillingInterval[] = ['month', 'year']

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
  const { user, tenant } = resolved.ctx

  const plan = String(body.plan ?? 'starter') as SubscriptionPlan
  const interval = String(body.interval ?? 'month') as BillingInterval

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
  }
  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json({ error: 'Invalid billing interval' }, { status: 400 })
  }

  let priceId: string
  try {
    priceId = getPriceId(plan, interval)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Price not configured' }, { status: 400 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? request.nextUrl.origin
  const billingEmail = String(user.email ?? tenant.billing_email ?? '')

  try {
    // ------------------------------------------------------------
    // CASE 1: Existing ACTIVE / TRIAL / PAST_DUE subscription
    // -> upgrade / downgrade / interval switch in place (proration).
    // ------------------------------------------------------------
    const hasLiveSubscription =
      Boolean(tenant.stripe_subscription_id) &&
      ['active', 'trial', 'past_due'].includes(String(tenant.subscription_status))

    if (hasLiveSubscription) {
      const subscription = await stripeRequest<any>(`/subscriptions/${tenant.stripe_subscription_id}`)
      const currentItem = subscription?.items?.data?.[0]

      if (!currentItem) {
        return NextResponse.json({ error: 'Active subscription has no line item' }, { status: 409 })
      }

      // No-op if already on the requested price.
      if (currentItem.price?.id === priceId) {
        const response = NextResponse.json({ changed: false, message: 'Already on this plan.' })
        copyResponseCookies(cookieResponse, response)
        return response
      }

      const updated = await stripeRequest<any>(`/subscriptions/${tenant.stripe_subscription_id}`, {
        method: 'POST',
        body: {
          cancel_at_period_end: false,
          proration_behavior: 'create_prorations',
          items: [{ id: currentItem.id, price: priceId }],
          metadata: { tenant_id: tenant.id, plan },
        },
        idempotencyKey: `plan-change-${tenant.id}-${priceId}-${Date.now()}`,
      })

      const limits = PLAN_LIMITS[plan]
      await updateTenantBilling(tenant.id, {
        plan,
        billing_interval: interval,
        stripe_price_id: priceId,
        cancel_at_period_end: false,
        current_period_end: updated?.current_period_end
          ? new Date(Number(updated.current_period_end) * 1000).toISOString()
          : tenant.current_period_end,
        ...limits,
      })

      await recordBillingEvent({
        tenantId: tenant.id,
        eventType: 'plan_changed',
        title: `Plan changed to ${plan} (${interval === 'year' ? 'yearly' : 'monthly'})`,
        description: 'Your subscription plan was updated with prorated billing.',
        plan,
        status: 'succeeded',
        stripeObjectId: String(tenant.stripe_subscription_id),
      })

      try {
        await notifyTenantBilling(
          tenant.id,
          'Plan changed',
          `Your subscription is now on the ${plan} plan (${interval === 'year' ? 'yearly' : 'monthly'}).`
        )
      } catch {
        // best-effort notification
      }

      const response = NextResponse.json({ changed: true, message: 'Plan updated.' })
      copyResponseCookies(cookieResponse, response)
      return response
    }

    // ------------------------------------------------------------
    // CASE 2: No live subscription -> create a Checkout Session.
    // Apply a 7-day free trial only on the first subscription.
    // ------------------------------------------------------------
    const applyTrial = !tenant.has_used_trial

    const checkoutBody: Record<string, unknown> = {
      mode: 'subscription',
      success_url: `${origin}/dashboard/settings?billing=success`,
      cancel_url: `${origin}/dashboard/settings?billing=cancelled`,
      client_reference_id: tenant.id,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tenant_id: tenant.id, plan, interval, price_id: priceId },
      subscription_data: {
        metadata: { tenant_id: tenant.id, plan, interval },
        ...(applyTrial ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      // Require a payment method up front so the card is on file for the trial
      // and for automatic renewal / dunning.
      payment_method_collection: 'always',
    }

    // Reuse the existing Stripe customer if we have one; otherwise let Checkout
    // create one and capture it via the webhook.
    if (tenant.stripe_customer_id) {
      checkoutBody.customer = tenant.stripe_customer_id
    } else if (billingEmail) {
      checkoutBody.customer_email = billingEmail
    }

    const session = await stripeRequest<{ id: string; url: string }>('/checkout/sessions', {
      method: 'POST',
      body: checkoutBody,
      idempotencyKey: `checkout-${tenant.id}-${priceId}-${Date.now()}`,
    })

    const response = NextResponse.json({ url: session.url, id: session.id })
    copyResponseCookies(cookieResponse, response)
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start billing checkout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
