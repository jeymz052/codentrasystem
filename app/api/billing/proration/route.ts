import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies } from '@/lib/supabase-server'
import { resolveBillingContext } from '@/lib/billing-auth'
import { getPlanId, resolvePlanFromPlanId } from '@/lib/paymongo-billing'
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

  const resolved = await resolveBillingContext(request, cookieResponse, body.tenantId)
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

  if (!tenant.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription to preview' }, { status: 409 })
  }

  try {
    const newPlanId = getPlanId(plan, interval)
    const currentPlan = resolvePlanFromPlanId(String(tenant.stripe_price_id ?? '')) ?? { plan: tenant.plan, interval: tenant.billing_interval ?? 'month' }

    if (String(tenant.stripe_price_id ?? '') === newPlanId) {
      const response = NextResponse.json({ hasSubscription: true, changed: false, message: 'Already on this plan.' })
      copyResponseCookies(cookieResponse, response)
      return response
    }

    const estimate = buildLocalProrationEstimate({
      oldPlan: currentPlan.plan,
      newPlan: plan,
      oldInterval: currentPlan.interval,
      newInterval: interval,
      currentPeriodStart: tenant.trial_ends_at ? new Date(tenant.trial_ends_at).getTime() : null,
      currentPeriodEnd: tenant.current_period_end ? new Date(tenant.current_period_end).getTime() : null,
    })

    const response = NextResponse.json({
      hasSubscription: true,
      changed: true,
      oldPlan: currentPlan.plan,
      newPlan: plan,
      oldInterval: currentPlan.interval,
      newInterval: interval,
      oldPrice: estimate.oldPrice,
      newPrice: estimate.newPrice,
      totalDays: estimate.totalDays,
      daysUsed: estimate.daysUsed,
      daysRemaining: estimate.daysRemaining,
      unusedValue: estimate.unusedValue,
      newValue: estimate.newValue,
      prorationAmount: estimate.prorationAmount,
      currency: tenant.currency ?? 'php',
      isUpgrade: estimate.isUpgrade,
      isDowngrade: estimate.isDowngrade,
      nextPaymentAttempt: tenant.current_period_end ?? null,
      prorationLine: null,
      previewError: null,
      previewSource: 'estimate',
    })
    copyResponseCookies(cookieResponse, response)
    return response
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to calculate proration' }, { status: 500 })
  }
}
