import { NextResponse, type NextRequest } from 'next/server'
import {
  GRACE_DAYS,
  addDays,
  findTenantByStripeReference,
  isStripeEventProcessed,
  notifyTenantBilling,
  recordBillingEvent,
  resolvePlanFromPriceId,
  stripeRequest,
  updateTenantBilling,
  verifyStripeSignature,
} from '@/lib/billing'
import { PLAN_LIMITS } from '@/lib/billing'
import type { BillingInterval, SubscriptionPlan } from '@/types/database'

export const runtime = 'nodejs'

function toIso(unixSeconds: unknown): string | null {
  const n = Number(unixSeconds)
  if (!n || Number.isNaN(n)) return null
  return new Date(n * 1000).toISOString()
}

function money(amount: unknown): number | null {
  const n = Number(amount)
  if (Number.isNaN(n)) return null
  return Number((n / 100).toFixed(2))
}

/** Pull card details off a Stripe payment method / card object if present. */
function extractCard(pm: any): { card_brand: string | null; card_last4: string | null; card_exp_month: number | null; card_exp_year: number | null } | null {
  const card = pm?.card ?? pm
  if (!card || !card.last4) return null
  return {
    card_brand: card.brand ?? null,
    card_last4: card.last4 ?? null,
    card_exp_month: card.exp_month ? Number(card.exp_month) : null,
    card_exp_year: card.exp_year ? Number(card.exp_year) : null,
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    verifyStripeSignature(rawBody, signature, webhookSecret)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as { id: string; type: string; data: { object: Record<string, any> } }

  // Idempotency: skip events we already recorded.
  if (event.id && (await isStripeEventProcessed(event.id))) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  const payload = event.data.object
  const metadataTenantId = String(payload.metadata?.tenant_id ?? payload.client_reference_id ?? '')

  try {
    switch (event.type) {
      // ========================================================
      // Checkout completed -> subscription created / trial started
      // ========================================================
      case 'checkout.session.completed': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          customerId: String(payload.customer ?? ''),
          subscriptionId: String(payload.subscription ?? ''),
        })
        if (!tenant) break

        const subscriptionId = String(payload.subscription ?? tenant.stripe_subscription_id ?? '')
        let subscription: any = null
        if (subscriptionId) {
          subscription = await stripeRequest<any>(`/subscriptions/${subscriptionId}`, {
            body: { 'expand[]': 'default_payment_method' },
          })
        }

        const priceId = String(subscription?.items?.data?.[0]?.price?.id ?? payload.metadata?.price_id ?? '')
        const resolved = resolvePlanFromPriceId(priceId)
        const plan = (resolved?.plan ?? payload.metadata?.plan ?? tenant.plan) as SubscriptionPlan
        const interval = (resolved?.interval ?? payload.metadata?.interval ?? 'month') as BillingInterval
        const isTrialing = subscription?.status === 'trialing'
        const limits = PLAN_LIMITS[plan] ?? {}
        const card = extractCard(subscription?.default_payment_method)

        await updateTenantBilling(tenant.id, {
          stripe_customer_id: String(payload.customer ?? tenant.stripe_customer_id ?? ''),
          stripe_subscription_id: subscriptionId || tenant.stripe_subscription_id,
          stripe_price_id: priceId || tenant.stripe_price_id,
          billing_interval: interval,
          plan,
          subscription_status: isTrialing ? 'trial' : 'active',
          trial_ends_at: isTrialing ? toIso(subscription?.trial_end) : tenant.trial_ends_at,
          current_period_end: toIso(subscription?.current_period_end),
          subscription_ends_at: toIso(subscription?.current_period_end),
          grace_period_ends_at: null,
          cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
          has_used_trial: tenant.has_used_trial || isTrialing,
          is_active: true,
          ...limits,
          ...(card ?? {}),
        })

        if (isTrialing) {
          await recordBillingEvent({
            tenantId: tenant.id,
            eventType: 'trial_started',
            title: '7-day free trial started',
            description: `Your ${plan} trial is active until ${toIso(subscription?.trial_end)?.slice(0, 10) ?? 'soon'}.`,
            plan,
            status: 'info',
            stripeEventId: event.id,
            stripeObjectId: subscriptionId,
          })
          await notifyTenantBilling(tenant.id, 'Free trial started', `Your 7-day free trial for the ${plan} plan has begun. You won't be charged until it ends.`)
        } else {
          await recordBillingEvent({
            tenantId: tenant.id,
            eventType: 'subscription_started',
            title: `Subscription started — ${plan}`,
            description: `Your ${plan} subscription (${interval === 'year' ? 'yearly' : 'monthly'}) is now active.`,
            plan,
            status: 'succeeded',
            stripeEventId: event.id,
            stripeObjectId: subscriptionId,
          })
          await notifyTenantBilling(tenant.id, 'Subscription started', `Your ${plan} subscription is now active. Thank you!`)
        }
        break
      }

      // ========================================================
      // Subscription created / updated (plan change, renewal, trial->active)
      // ========================================================
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          subscriptionId: String(payload.id ?? ''),
          customerId: String(payload.customer ?? ''),
        })
        if (!tenant) break

        const priceId = String(payload.items?.data?.[0]?.price?.id ?? tenant.stripe_price_id ?? '')
        const resolved = resolvePlanFromPriceId(priceId)
        const plan = (resolved?.plan ?? payload.metadata?.plan ?? tenant.plan) as SubscriptionPlan
        const interval = (resolved?.interval ?? tenant.billing_interval ?? 'month') as BillingInterval
        const limits = PLAN_LIMITS[plan] ?? {}
        const stripeStatus = String(payload.status ?? '')

        // Map Stripe subscription status -> our status.
        let subscription_status = tenant.subscription_status
        if (stripeStatus === 'trialing') subscription_status = 'trial'
        else if (stripeStatus === 'active') subscription_status = 'active'
        else if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') subscription_status = 'past_due'
        else if (stripeStatus === 'canceled') subscription_status = 'suspended'

        const planChanged = priceId && priceId !== tenant.stripe_price_id

        await updateTenantBilling(tenant.id, {
          stripe_customer_id: String(payload.customer ?? tenant.stripe_customer_id ?? ''),
          stripe_subscription_id: String(payload.id ?? tenant.stripe_subscription_id ?? ''),
          stripe_price_id: priceId || tenant.stripe_price_id,
          billing_interval: interval,
          plan,
          subscription_status,
          trial_ends_at: toIso(payload.trial_end) ?? tenant.trial_ends_at,
          current_period_end: toIso(payload.current_period_end) ?? tenant.current_period_end,
          subscription_ends_at: toIso(payload.current_period_end) ?? tenant.subscription_ends_at,
          cancel_at_period_end: Boolean(payload.cancel_at_period_end),
          is_active: subscription_status !== 'suspended',
          ...limits,
        })

        if (planChanged) {
          await recordBillingEvent({
            tenantId: tenant.id,
            eventType: 'plan_changed',
            title: `Plan changed to ${plan} (${interval === 'year' ? 'yearly' : 'monthly'})`,
            description: 'Subscription plan updated.',
            plan,
            status: 'succeeded',
            stripeEventId: event.id,
            stripeObjectId: String(payload.id ?? ''),
          })
          await notifyTenantBilling(tenant.id, 'Plan changed', `Your subscription is now on the ${plan} plan.`)
        }
        break
      }

      // ========================================================
      // Subscription cancelled / deleted
      // ========================================================
      case 'customer.subscription.deleted': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          subscriptionId: String(payload.id ?? ''),
          customerId: String(payload.customer ?? ''),
        })
        if (!tenant) break

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
          description: 'The subscription has been cancelled and access is suspended.',
          plan: tenant.plan as SubscriptionPlan,
          status: 'info',
          stripeEventId: event.id,
          stripeObjectId: String(payload.id ?? ''),
        })
        await notifyTenantBilling(tenant.id, 'Subscription cancelled', 'Your subscription has been cancelled. Resubscribe from Settings to restore access.')
        break
      }

      // ========================================================
      // Invoice paid -> payment succeeded / renewal
      // ========================================================
      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          customerId: String(payload.customer ?? ''),
          subscriptionId: String(payload.subscription ?? ''),
        })
        if (!tenant) break

        const amount = money(payload.amount_paid)
        const currency = String(payload.currency ?? 'php').toUpperCase()
        const isRenewal = String(payload.billing_reason ?? '') === 'subscription_cycle'
        const periodEnd = toIso(payload.lines?.data?.[0]?.period?.end)

        await updateTenantBilling(tenant.id, {
          subscription_status: 'active',
          grace_period_ends_at: null,
          current_period_end: periodEnd ?? tenant.current_period_end,
          subscription_ends_at: periodEnd ?? tenant.subscription_ends_at,
          is_active: true,
        })

        await recordBillingEvent({
          tenantId: tenant.id,
          eventType: isRenewal ? 'subscription_renewed' : 'payment_succeeded',
          title: isRenewal ? 'Subscription renewed' : 'Payment successful',
          description: isRenewal
            ? `Your subscription renewed successfully.`
            : `Payment received.`,
          amount,
          currency,
          plan: tenant.plan as SubscriptionPlan,
          status: 'succeeded',
          stripeEventId: event.id,
          stripeObjectId: String(payload.id ?? ''),
          invoiceUrl: String(payload.hosted_invoice_url ?? '') || null,
        })
        await notifyTenantBilling(
          tenant.id,
          isRenewal ? 'Subscription renewed' : 'Payment successful',
          isRenewal
            ? `Your ${tenant.plan} subscription renewed successfully.`
            : `We received your payment${amount ? ` of ${currency} ${amount}` : ''}. Thank you!`
        )
        break
      }

      // ========================================================
      // Invoice payment failed -> start / continue grace period
      // ========================================================
      case 'invoice.payment_failed': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          customerId: String(payload.customer ?? ''),
          subscriptionId: String(payload.subscription ?? ''),
        })
        if (!tenant) break

        // Start the 5-day grace window on the first failure; keep the existing
        // window on subsequent retries (Stripe retries every other day).
        const graceEnds = tenant.grace_period_ends_at ?? addDays(new Date(), GRACE_DAYS).toISOString()
        const nextRetry = toIso(payload.next_payment_attempt)
        const amount = money(payload.amount_due)
        const currency = String(payload.currency ?? 'php').toUpperCase()

        await updateTenantBilling(tenant.id, {
          subscription_status: 'past_due',
          grace_period_ends_at: graceEnds,
          is_active: true, // access continues during grace
        })

        const isFirstFailure = !tenant.grace_period_ends_at
        await recordBillingEvent({
          tenantId: tenant.id,
          eventType: isFirstFailure ? 'grace_started' : 'payment_failed',
          title: 'Payment failed',
          description: nextRetry
            ? `Payment failed. We'll retry on ${nextRetry.slice(0, 10)}. Grace period ends ${graceEnds.slice(0, 10)}.`
            : `Payment failed. Grace period ends ${graceEnds.slice(0, 10)}.`,
          amount,
          currency,
          plan: tenant.plan as SubscriptionPlan,
          status: 'failed',
          stripeEventId: event.id,
          stripeObjectId: String(payload.id ?? ''),
          invoiceUrl: String(payload.hosted_invoice_url ?? '') || null,
        })
        await notifyTenantBilling(
          tenant.id,
          'Payment failed',
          `Your payment failed. Please update your card before ${graceEnds.slice(0, 10)} to avoid losing access. We'll automatically retry every other day.`
        )
        break
      }

      // ========================================================
      // Card expiring soon (Stripe emits ~1 month before expiry)
      // ========================================================
      case 'customer.source.expiring':
      case 'payment_method.updated':
      case 'payment_method.attached': {
        const tenant = await findTenantByStripeReference({
          customerId: String(payload.customer ?? ''),
        })
        if (!tenant) break

        const card = extractCard(payload)
        if (card) {
          await updateTenantBilling(tenant.id, card)
        }

        if (event.type === 'customer.source.expiring') {
          await recordBillingEvent({
            tenantId: tenant.id,
            eventType: 'card_expiring',
            title: 'Card expiring soon',
            description: card?.card_last4
              ? `Your card ending in ${card.card_last4} is expiring soon. Update it to avoid a failed renewal.`
              : 'Your card on file is expiring soon.',
            plan: tenant.plan as SubscriptionPlan,
            status: 'info',
            stripeEventId: event.id,
          })
          await notifyTenantBilling(
            tenant.id,
            'Card expiring soon',
            `Your payment card${card?.card_last4 ? ` ending in ${card.card_last4}` : ''} is expiring soon. Update it in Settings to keep your subscription active.`
          )
        } else if (event.type === 'payment_method.updated' || event.type === 'payment_method.attached') {
          await recordBillingEvent({
            tenantId: tenant.id,
            eventType: 'card_updated',
            title: 'Payment method updated',
            description: card?.card_last4
              ? `Card ending in ${card.card_last4} updated successfully.`
              : 'Payment method updated.',
            plan: tenant.plan as SubscriptionPlan,
            status: 'succeeded',
            stripeEventId: event.id,
          })
          await notifyTenantBilling(
            tenant.id,
            'Payment method updated',
            `Your payment card${card?.card_last4 ? ` ending in ${card.card_last4}` : ''} was updated successfully.`
          )
        }
        break
      }

      // ========================================================
      // Upcoming invoice — proactive billing reminder
      // ========================================================
      case 'invoice.upcoming': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          customerId: String(payload.customer ?? ''),
          subscriptionId: String(payload.subscription ?? ''),
        })
        if (!tenant) break

        const amount = money(payload.amount_due)
        const currency = String(payload.currency ?? 'php').toUpperCase()
        const nextPayment = toIso(payload.next_payment_attempt)

        await recordBillingEvent({
          tenantId: tenant.id,
          eventType: 'invoice_upcoming',
          title: 'Upcoming billing',
          description: nextPayment
            ? `Next payment of ${currency} ${amount ?? '?'} scheduled for ${new Date(nextPayment).toLocaleDateString()}.`
            : 'An upcoming invoice is scheduled.',
          amount,
          currency,
          plan: tenant.plan as SubscriptionPlan,
          status: 'info',
          stripeEventId: event.id,
          invoiceUrl: String(payload.hosted_invoice_url ?? '') || null,
        })
        await notifyTenantBilling(
          tenant.id,
          'Upcoming billing',
          `Your next ${tenant.plan} subscription payment${amount ? ` of ${currency} ${amount}` : ''} is scheduled${nextPayment ? ` for ${new Date(nextPayment).toLocaleDateString()}` : ''}. Ensure your payment method is up to date.`
        )
        break
      }

      // ========================================================
      // Trial will end — Stripe sends this 3 days before trial ends
      // ========================================================
      case 'customer.subscription.trial_will_end': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          subscriptionId: String(payload.id ?? ''),
          customerId: String(payload.customer ?? ''),
        })
        if (!tenant) break

        const trialEnd = toIso(payload.trial_end)
        await recordBillingEvent({
          tenantId: tenant.id,
          eventType: 'trial_will_end',
          title: 'Trial ending soon',
          description: trialEnd
            ? `Your free trial ends on ${new Date(trialEnd).toLocaleDateString()}. Add a payment method to continue.`
            : 'Your free trial is ending soon.',
          plan: tenant.plan as SubscriptionPlan,
          status: 'info',
          stripeEventId: event.id,
        })
        await notifyTenantBilling(
          tenant.id,
          'Trial ending soon',
          `Your ${tenant.plan} free trial ends on ${new Date(trialEnd ?? Date.now() + 3 * 86400000).toLocaleDateString()}. Add a payment method to avoid interruption.`
        )
        break
      }

      default:
        break
    }
  } catch (error) {
    console.error('Stripe webhook processing failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
