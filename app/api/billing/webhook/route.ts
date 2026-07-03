import { NextResponse, type NextRequest } from 'next/server'
import { findTenantByStripeReference, updateTenantBilling, verifyStripeSignature } from '@/lib/billing'
import type { SubscriptionPlan } from '@/types/database'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }
    verifyStripeSignature(rawBody, signature, webhookSecret)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as {
    type: string
    data: {
      object: Record<string, any>
    }
  }

  const payload = event.data.object
  const metadataTenantId = String(payload.metadata?.tenant_id ?? payload.client_reference_id ?? '')
  const metadataPlan = String(payload.metadata?.plan ?? '')

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          customerId: String(payload.customer ?? ''),
          subscriptionId: String(payload.subscription ?? ''),
        })

        if (tenant) {
          await updateTenantBilling(tenant.id, {
            stripe_customer_id: String(payload.customer ?? tenant.stripe_customer_id ?? ''),
            stripe_subscription_id: String(payload.subscription ?? tenant.stripe_subscription_id ?? ''),
            stripe_price_id: String(payload?.metadata?.price_id ?? tenant.stripe_price_id ?? ''),
            subscription_status: 'active',
            plan: (metadataPlan || tenant.plan) as SubscriptionPlan,
          })
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          customerId: String(payload.customer ?? ''),
          subscriptionId: String(payload.id ?? ''),
        })

        if (tenant) {
          await updateTenantBilling(tenant.id, {
            stripe_customer_id: String(payload.customer ?? tenant.stripe_customer_id ?? ''),
            stripe_subscription_id: String(payload.id ?? tenant.stripe_subscription_id ?? ''),
            stripe_price_id: String(payload.items?.data?.[0]?.price?.id ?? tenant.stripe_price_id ?? ''),
            subscription_status: payload.status === 'active' ? 'active' : tenant.subscription_status,
            plan: (metadataPlan || tenant.plan) as SubscriptionPlan,
            subscription_ends_at: payload.current_period_end ? new Date(Number(payload.current_period_end) * 1000).toISOString() : tenant.subscription_ends_at,
          })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          customerId: String(payload.customer ?? ''),
          subscriptionId: String(payload.id ?? ''),
        })

        if (tenant) {
          await updateTenantBilling(tenant.id, {
            subscription_status: 'suspended',
            subscription_ends_at: new Date().toISOString(),
          })
        }
        break
      }
      case 'invoice.payment_failed': {
        const tenant = await findTenantByStripeReference({
          tenantId: metadataTenantId || null,
          customerId: String(payload.customer ?? ''),
        })

        if (tenant) {
          await updateTenantBilling(tenant.id, {
            subscription_status: 'suspended',
          })
        }
        break
      }
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
