import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies } from '@/lib/supabase-server'
import { resolveBillingContext } from '@/lib/billing-auth'
import {
  PLAN_LIMITS,
  getPlanId,
  notifyTenantBilling,
  recordBillingEvent,
  createPayMongoSubscription,
  ensurePayMongoCustomer,
  getSubscriptionCustomerId,
  getSubscriptionNextBillingDate,
  getSubscriptionPaymentUrl,
  getSubscriptionPlanId,
  getSubscriptionStatus,
  getPayMongoSubscription,
  updatePayMongoSubscriptionPlan,
  updateTenantBilling,
  resolvePlanFromPlanId,
} from '@/lib/paymongo-billing'
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

  let planId: string
  try {
    planId = getPlanId(plan, interval)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Plan not configured' }, { status: 400 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? request.nextUrl.origin
  const billingEmail = String(user.email ?? tenant.billing_email ?? '')

  try {
    const hasLiveSubscription =
      Boolean(tenant.stripe_subscription_id) &&
      ['active', 'trial', 'past_due'].includes(String(tenant.subscription_status))

    if (hasLiveSubscription) {
      const subscription = await getPayMongoSubscription(tenant.stripe_subscription_id!)
      const currentPlanId = getSubscriptionPlanId(subscription)

      if (currentPlanId === planId) {
        const response = NextResponse.json({ changed: false, message: 'Already on this plan.' })
        copyResponseCookies(cookieResponse, response)
        return response
      }

      const updated = await updatePayMongoSubscriptionPlan(tenant.stripe_subscription_id!, planId)
      const updatedPlanId = getSubscriptionPlanId(updated) || planId
      const resolvedPlan = resolvePlanFromPlanId(updatedPlanId) ?? { plan, interval }
      const limits = PLAN_LIMITS[resolvedPlan.plan]

      await updateTenantBilling(tenant.id, {
        plan: resolvedPlan.plan,
        billing_interval: resolvedPlan.interval,
        stripe_price_id: updatedPlanId,
        cancel_at_period_end: false,
        current_period_end: getSubscriptionNextBillingDate(updated) ?? tenant.current_period_end,
        ...limits,
      })

      await recordBillingEvent({
        tenantId: tenant.id,
        eventType: 'plan_changed',
        title: `Plan changed to ${resolvedPlan.plan} (${resolvedPlan.interval === 'year' ? 'yearly' : 'monthly'})`,
        description: 'Your subscription plan was updated.',
        plan: resolvedPlan.plan,
        status: 'succeeded',
        stripeObjectId: String(tenant.stripe_subscription_id),
      })

      try {
        await notifyTenantBilling(
          tenant.id,
          'Plan changed',
          `Your subscription is now on the ${resolvedPlan.plan} plan (${resolvedPlan.interval === 'year' ? 'yearly' : 'monthly'}).`
        )
      } catch {
        // best-effort notification
      }

      const response = NextResponse.json({ changed: true, message: 'Plan updated.' })
      copyResponseCookies(cookieResponse, response)
      return response
    }

    const customerId = await ensurePayMongoCustomer({
      email: billingEmail,
      name: tenant.name,
      phone: tenant.phone,
    })

    const subscription = await createPayMongoSubscription({ planId, customerId })
    const paymentUrl = getSubscriptionPaymentUrl(subscription)
    const subscriptionId = String(subscription?.data?.id ?? subscription?.id ?? '')
    const currentPlan = resolvePlanFromPlanId(getSubscriptionPlanId(subscription)) ?? { plan, interval }
    const status = getSubscriptionStatus(subscription)
    const limits = PLAN_LIMITS[currentPlan.plan]

    await updateTenantBilling(tenant.id, {
      stripe_customer_id: getSubscriptionCustomerId(subscription) || customerId,
      stripe_subscription_id: subscriptionId || null,
      stripe_price_id: planId,
      billing_interval: currentPlan.interval,
      plan: currentPlan.plan,
      subscription_status: status === 'active' ? 'active' : 'inactive',
      current_period_end: getSubscriptionNextBillingDate(subscription) ?? tenant.current_period_end,
      cancel_at_period_end: false,
      has_used_trial: true,
      is_active: true,
      ...limits,
    })

    await recordBillingEvent({
      tenantId: tenant.id,
      eventType: 'subscription_started',
      title: `Subscription started â€” ${currentPlan.plan}`,
      description: 'Subscription created and awaiting payment confirmation.',
      plan: currentPlan.plan,
      status: 'pending',
      stripeObjectId: subscriptionId || null,
    })

    try {
      await notifyTenantBilling(
        tenant.id,
        'Subscription created',
        `Your ${currentPlan.plan} subscription was created. Complete the payment to activate it.`
      )
    } catch {
      // best-effort notification
    }

    const response = NextResponse.json({
      url: paymentUrl ?? `${origin}/dashboard/settings?billing=confirm`,
      id: subscriptionId || null,
      message: 'Complete the payment to activate your subscription.',
    })
    copyResponseCookies(cookieResponse, response)
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start billing checkout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
