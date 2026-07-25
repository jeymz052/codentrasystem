import { NextResponse, type NextRequest } from 'next/server'
import {
  GRACE_DAYS,
  addDays,
  findTenantByPayMongoReference,
  getPayMongoSubscription,
  getSubscriptionCard,
  getSubscriptionCustomerId,
  getSubscriptionNextBillingDate,
  getSubscriptionPlanId,
  getSubscriptionStatus,
  isPayMongoEventProcessed,
  notifyTenantBilling,
  recordBillingEvent,
  resolvePlanFromPlanId,
  updateTenantBilling,
  verifyPayMongoWebhook,
  PLAN_LIMITS,
} from '@/lib/paymongo-billing'
import type { SubscriptionPlan, BillingInterval } from '@/types/database'

export const runtime = 'nodejs'

function money(amount: unknown): number | null {
  const n = Number(amount)
  if (Number.isNaN(n)) return null
  return Number((n / 100).toFixed(2))
}

function pickEvent(rawBody: string) {
  const parsed = JSON.parse(rawBody) as any
  const eventId = String(parsed?.data?.id ?? parsed?.data?.attributes?.id ?? parsed?.id ?? '')
  const eventType = String(parsed?.data?.attributes?.type ?? parsed?.type ?? '')
  const payload =
    parsed?.data?.attributes?.data ??
    parsed?.data?.attributes?.resource ??
    parsed?.data?.attributes ??
    parsed?.data ??
    parsed
  return { eventId, eventType, payload }
}

async function syncSubscription(payload: any, eventId: string, eventType: string, fallbackTenantId: string | null = null) {
  const subscriptionId = String(
    payload?.subscription?.id ??
    payload?.subscription_id ??
    payload?.id ??
    ''
  )
  const customerId = String(
    payload?.customer?.id ??
    payload?.customer_id ??
    payload?.attributes?.customer_id ??
    ''
  )
  const tenant = await findTenantByPayMongoReference({
    tenantId: fallbackTenantId,
    subscriptionId: subscriptionId || null,
    customerId: customerId || null,
  })
  if (!tenant) return false

  const subscription = subscriptionId ? await getPayMongoSubscription(subscriptionId) : payload
  const planId = getSubscriptionPlanId(subscription) || String(payload?.plan_id ?? payload?.plan?.id ?? tenant.stripe_price_id ?? '')
  const resolved = resolvePlanFromPlanId(planId) ?? { plan: tenant.plan as SubscriptionPlan, interval: (tenant.billing_interval ?? 'month') as BillingInterval }
  const limits = PLAN_LIMITS[resolved.plan]
  const status = getSubscriptionStatus(subscription)
  const card = getSubscriptionCard(subscription)
  const nextPeriodEnd = getSubscriptionNextBillingDate(subscription)

  const isCancelled = /cancel|deleted/i.test(status)
  const isPastDue = /past[_-]?due|unpaid|failed/i.test(status) || /failed/i.test(eventType)
  const isActive = /active|paid|succeeded|success/i.test(status) || /paid/i.test(eventType)

  await updateTenantBilling(tenant.id, {
    stripe_customer_id: getSubscriptionCustomerId(subscription) || customerId || tenant.stripe_customer_id,
    stripe_subscription_id: subscriptionId || tenant.stripe_subscription_id,
    stripe_price_id: planId || tenant.stripe_price_id,
    billing_interval: resolved.interval,
    plan: resolved.plan,
    subscription_status: isCancelled
      ? 'suspended'
      : isPastDue
        ? 'past_due'
        : isActive
          ? 'active'
          : tenant.subscription_status,
    trial_ends_at: tenant.trial_ends_at,
    current_period_end: nextPeriodEnd ?? tenant.current_period_end,
    subscription_ends_at: nextPeriodEnd ?? tenant.subscription_ends_at,
    grace_period_ends_at: isPastDue ? tenant.grace_period_ends_at ?? addDays(new Date(), GRACE_DAYS).toISOString() : null,
    cancel_at_period_end: false,
    has_used_trial: true,
    is_active: !isCancelled,
    ...limits,
    ...(card ?? {}),
  })

  if (isCancelled) {
    await recordBillingEvent({
      tenantId: tenant.id,
      eventType: 'subscription_cancelled',
      title: 'Subscription cancelled',
      description: 'The subscription has been cancelled and access is suspended.',
      plan: resolved.plan,
      status: 'info',
      stripeEventId: eventId,
      stripeObjectId: subscriptionId || null,
    })
    await notifyTenantBilling(tenant.id, 'Subscription cancelled', 'Your subscription has been cancelled. Resubscribe from Billing to restore access.')
    return true
  }

  if (isPastDue) {
    const graceEnds = tenant.grace_period_ends_at ?? addDays(new Date(), GRACE_DAYS).toISOString()
    await updateTenantBilling(tenant.id, {
      subscription_status: 'past_due',
      grace_period_ends_at: graceEnds,
      is_active: true,
    })
    await recordBillingEvent({
      tenantId: tenant.id,
      eventType: 'payment_failed',
      title: 'Payment failed',
      description: `Payment failed. Grace period ends ${graceEnds.slice(0, 10)}.`,
      plan: resolved.plan,
      status: 'failed',
      stripeEventId: eventId,
      stripeObjectId: subscriptionId || null,
    })
    await notifyTenantBilling(tenant.id, 'Payment failed', `Your payment failed. Please update your payment method before ${graceEnds.slice(0, 10)}.`)
    return true
  }

  if (isActive) {
    await recordBillingEvent({
      tenantId: tenant.id,
      eventType: tenant.subscription_status === 'trial' ? 'trial_started' : 'subscription_started',
      title: tenant.subscription_status === 'trial' ? 'Subscription payment completed' : 'Subscription started',
      description: tenant.subscription_status === 'trial'
        ? 'Your subscription payment was confirmed.'
        : `Your ${resolved.plan} subscription is active.`,
      plan: resolved.plan,
      status: 'succeeded',
      stripeEventId: eventId,
      stripeObjectId: subscriptionId || null,
    })
    await notifyTenantBilling(tenant.id, 'Subscription active', `Your ${resolved.plan} subscription is now active.`)
    return true
  }

  await recordBillingEvent({
    tenantId: tenant.id,
    eventType: 'plan_changed',
    title: `Plan updated to ${resolved.plan}`,
    description: 'Subscription details were updated.',
    plan: resolved.plan,
    status: 'succeeded',
    stripeEventId: eventId,
    stripeObjectId: subscriptionId || null,
  })
  return true
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  try {
    verifyPayMongoWebhook(rawBody, request.headers)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid signature' }, { status: 400 })
  }

  const { eventId, eventType, payload } = pickEvent(rawBody)
  if (eventId && (await isPayMongoEventProcessed(eventId))) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  const metadataTenantId = String(payload?.metadata?.tenant_id ?? payload?.attributes?.metadata?.tenant_id ?? payload?.tenant_id ?? '')

  try {
    const handled = await syncSubscription(payload, eventId, eventType, metadataTenantId || null)
    if (!handled && /payment\.paid|invoice\.paid|subscription\.paid/i.test(eventType)) {
      await syncSubscription(payload, eventId, 'payment.paid', metadataTenantId || null)
    }
  } catch (error) {
    console.error('PayMongo webhook processing failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
