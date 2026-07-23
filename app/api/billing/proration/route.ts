import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies } from '@/lib/supabase-server'
import { resolveBillingContext } from '@/lib/billing-auth'
import { getPriceId, stripeRequest } from '@/lib/billing'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'
import type { BillingInterval, SubscriptionPlan } from '@/types/database'

export const runtime = 'nodejs'

const VALID_PLANS: SubscriptionPlan[] = ['starter', 'professional', 'enterprise']
const VALID_INTERVALS: BillingInterval[] = ['month', 'year']

function buildLocalProrationEstimate(input: {
  oldPlan: SubscriptionPlan
  newPlan: SubscriptionPlan
  oldInterval: BillingInterval
  newInterval: BillingInterval
  currentPeriodStart: number | null
  currentPeriodEnd: number | null
}) {
  const { oldPlan, newPlan, oldInterval, newInterval, currentPeriodStart, currentPeriodEnd } = input

  const totalDays =
    currentPeriodStart && currentPeriodEnd
      ? Math.max(1, Math.ceil((currentPeriodEnd - currentPeriodStart) / (1000 * 60 * 60 * 24)))
      : 30

  const daysUsed = currentPeriodStart
    ? Math.max(0, Math.ceil((Date.now() - currentPeriodStart) / (1000 * 60 * 60 * 24)))
    : 0
  const daysRemaining = Math.max(0, totalDays - daysUsed)

  const oldPlanData = SUBSCRIPTION_PLANS.find((p) => p.plan === oldPlan)
  const newPlanData = SUBSCRIPTION_PLANS.find((p) => p.plan === newPlan)
  const oldPrice = oldInterval === 'year' ? oldPlanData?.yearly : oldPlanData?.monthly
  const newPrice = newInterval === 'year' ? newPlanData?.yearly : newPlanData?.monthly

  const unusedValue = oldPrice ? (oldPrice / totalDays) * daysRemaining : 0
  const newValue = newPrice ? (newPrice / totalDays) * daysRemaining : 0
  const prorationAmount = newValue - unusedValue

  return {
    totalDays,
    daysUsed,
    daysRemaining,
    oldPrice: oldPrice ?? 0,
    newPrice: newPrice ?? 0,
    unusedValue,
    newValue,
    prorationAmount,
    isUpgrade: prorationAmount > 0,
    isDowngrade: prorationAmount < 0,
  }
}

export async function POST(request: NextRequest) {
  const cookieResponse = NextResponse.next()

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  let resolved
  try {
    resolved = await resolveBillingContext(request, cookieResponse, body.tenantId)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to resolve billing context' }, { status: 500 })
  }
  if ('error' in resolved) return resolved.error
  const { tenant } = resolved.ctx

  const plan = String(body.plan ?? 'starter') as SubscriptionPlan
  const interval = String(body.interval ?? 'month') as BillingInterval

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }
  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
  }

  let priceId: string
  try {
    priceId = getPriceId(plan, interval)
  } catch (err) {
    console.error('Proration priceId resolution failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Price not configured' }, { status: 500 })
  }

  try {
    if (!tenant.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription to preview' }, { status: 409 })
    }

    console.debug('Proration: fetching subscription', { subscriptionId: tenant.stripe_subscription_id, plan, interval, priceId })
    const subscription = await stripeRequest<any>(`/subscriptions/${tenant.stripe_subscription_id}`, {
      body: { expand: ['latest_invoice', 'pending_setup_intent'] },
    })

    const currentItem = subscription?.items?.data?.[0]
    if (!currentItem) {
      return NextResponse.json({ error: 'Subscription has no line item' }, { status: 409 })
    }

    if (currentItem.price?.id === priceId) {
      const response = NextResponse.json({ hasSubscription: true, changed: false, message: 'Already on this plan.' })
      copyResponseCookies(cookieResponse, response)
      return response
    }

    const currentPeriodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null
    const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
    const estimate = buildLocalProrationEstimate({
      oldPlan: tenant.plan,
      newPlan: plan,
      oldInterval: tenant.billing_interval ?? 'month',
      newInterval: interval,
      currentPeriodStart: currentPeriodStart?.getTime() ?? null,
      currentPeriodEnd: currentPeriodEnd?.getTime() ?? null,
    })

    let upcoming: any = null
    let previewError: string | null = null
    try {
      console.debug('Proration: creating preview invoice', { subscriptionId: tenant.stripe_subscription_id, itemId: currentItem.id, priceId })
      upcoming = await stripeRequest<any>(`/invoices/create_preview`, {
        method: 'POST',
        body: {
          subscription: tenant.stripe_subscription_id,
          subscription_details: {
            proration_behavior: 'create_prorations',
            items: [{ id: currentItem.id, price: priceId }],
          },
        },
      })
    } catch (err) {
      previewError = err instanceof Error ? err.message : 'Stripe preview unavailable'
      console.warn('Proration preview failed, returning local estimate instead:', previewError)
    }

    const lines = upcoming?.lines?.data ?? []
    const prorationLine = lines.find((line: any) =>
      line?.type === 'invoiceitem' &&
      (line?.proration || line?.parent?.subscription_item_details?.proration)
    )
    const nextInvoice = upcoming?.next_payment_attempt ? new Date(upcoming.next_payment_attempt * 1000) : null

    const response = NextResponse.json({
      hasSubscription: true,
      changed: true,
      oldPlan: tenant.plan,
      newPlan: plan,
      oldInterval: tenant.billing_interval ?? 'month',
      newInterval: interval,
      oldPrice: estimate.oldPrice,
      newPrice: estimate.newPrice,
      totalDays: estimate.totalDays,
      daysUsed: estimate.daysUsed,
      daysRemaining: estimate.daysRemaining,
      unusedValue: estimate.unusedValue,
      newValue: estimate.newValue,
      prorationAmount: estimate.prorationAmount,
      currency: upcoming?.currency ?? tenant.currency ?? 'php',
      isUpgrade: estimate.isUpgrade,
      isDowngrade: estimate.isDowngrade,
      nextPaymentAttempt: nextInvoice?.toISOString() ?? null,
      prorationLine: prorationLine ? {
        amount: prorationLine.amount / 100,
        description: prorationLine.description,
      } : null,
      previewError,
      previewSource: upcoming ? 'stripe' : 'estimate',
    })
    copyResponseCookies(cookieResponse, response)
    return response
  } catch (err) {
    console.error('Proration calculation failed:', err instanceof Error ? { message: err.message, stack: err.stack } : err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to calculate proration' }, { status: 500 })
  }
}
