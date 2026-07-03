import crypto from 'crypto'
import { getSupabaseServiceClient } from '@/lib/supabase-server'
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/database'

export const PLAN_PRICE_ENV: Record<SubscriptionPlan, string> = {
  starter: 'STRIPE_PRICE_STARTER',
  professional: 'STRIPE_PRICE_PROFESSIONAL',
  enterprise: 'STRIPE_PRICE_ENTERPRISE',
}

export function getStripeSecretKey() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return secret
}

export function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = new Map(
    signatureHeader.split(',').map((pair) => {
      const [key, value] = pair.split('=')
      return [key.trim(), value.trim()] as const
    })
  )
  const timestamp = parts.get('t')
  const signatures = signatureHeader
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('v1='))
    .map((entry) => entry.slice(3))

  if (!timestamp || !signatures.length) {
    throw new Error('Invalid Stripe signature header')
  }

  const signedPayload = `${timestamp}.${payload}`
  const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')
  const isValid = signatures.some((signature) => {
    if (signature.length !== expectedSignature.length) return false
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  })

  if (!isValid) {
    throw new Error('Invalid Stripe webhook signature')
  }

  return true
}

export async function updateTenantBilling(tenantId: string, patch: {
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_price_id?: string | null
  subscription_status?: SubscriptionStatus
  plan?: SubscriptionPlan
  subscription_ends_at?: string | null
}) {
  const client = getSupabaseServiceClient()
  const { error } = await client
    .from('tenants')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)

  if (error) {
    throw error
  }
}

export async function findTenantByStripeReference(reference: { customerId?: string | null; subscriptionId?: string | null; tenantId?: string | null }) {
  const client = getSupabaseServiceClient()
  let query = client.from('tenants').select('*').limit(1)

  if (reference.tenantId) {
    query = query.eq('id', reference.tenantId)
  } else if (reference.subscriptionId) {
    query = query.eq('stripe_subscription_id', reference.subscriptionId)
  } else if (reference.customerId) {
    query = query.eq('stripe_customer_id', reference.customerId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}
