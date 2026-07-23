import crypto from 'crypto'
import { getSupabaseServiceClient } from '@/lib/supabase-server'
import type {
  BillingEventType,
  BillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/types/database'

// ============================================================
// Constants
// ============================================================

export const TRIAL_DAYS = 7
export const GRACE_DAYS = 5
export const STRIPE_API_BASE = 'https://api.stripe.com/v1'

// Each plan has a monthly AND a yearly Stripe Price ID.
export const PLAN_PRICE_ENV: Record<SubscriptionPlan, Record<BillingInterval, string>> = {
  starter: {
    month: 'STRIPE_PRICE_STARTER_MONTHLY',
    year: 'STRIPE_PRICE_STARTER_YEARLY',
  },
  professional: {
    month: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    year: 'STRIPE_PRICE_PROFESSIONAL_YEARLY',
  },
  enterprise: {
    month: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    year: 'STRIPE_PRICE_ENTERPRISE_YEARLY',
  },
}

// Plan limits mirrored server-side so we can apply them when a plan changes.
export const PLAN_LIMITS: Record<SubscriptionPlan, { max_users: number; max_products: number; max_locations: number }> = {
  starter: { max_users: 3, max_products: 100, max_locations: 1 },
  professional: { max_users: 10, max_products: 1000, max_locations: 5 },
  enterprise: { max_users: 999, max_products: 9999, max_locations: 99 },
}

// ============================================================
// Config accessors
// ============================================================

export function getStripeSecretKey() {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return secret
}

export function getPriceId(plan: SubscriptionPlan, interval: BillingInterval): string {
  const envName = PLAN_PRICE_ENV[plan]?.[interval]
  if (!envName) {
    throw new Error(`Unknown plan/interval combination: ${plan}/${interval}`)
  }
  const priceId = process.env[envName]
  if (!priceId) {
    throw new Error(`${envName} is not configured`)
  }
  return priceId
}

// Reverse lookup: given a Stripe price id, figure out which plan/interval it is.
export function resolvePlanFromPriceId(priceId: string): { plan: SubscriptionPlan; interval: BillingInterval } | null {
  if (!priceId) return null
  for (const plan of Object.keys(PLAN_PRICE_ENV) as SubscriptionPlan[]) {
    for (const interval of ['month', 'year'] as BillingInterval[]) {
      const envName = PLAN_PRICE_ENV[plan][interval]
      if (process.env[envName] === priceId) {
        return { plan, interval }
      }
    }
  }
  return null
}

// ============================================================
// Stripe REST helper (form-encoded, no SDK dependency)
// ============================================================

type StripeParamValue = string | number | boolean | undefined | null

/** Flatten a nested object into Stripe's bracketed form-encoding. */
export function toStripeForm(input: Record<string, unknown>, prefix = ''): URLSearchParams {
  const params = new URLSearchParams()
  const walk = (obj: Record<string, unknown>, keyPrefix: string) => {
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue
      const composedKey = keyPrefix ? `${keyPrefix}[${key}]` : key
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item && typeof item === 'object') {
            walk(item as Record<string, unknown>, `${composedKey}[${index}]`)
          } else {
            params.set(`${composedKey}[${index}]`, String(item))
          }
        })
      } else if (typeof value === 'object') {
        walk(value as Record<string, unknown>, composedKey)
      } else {
        params.set(composedKey, String(value as StripeParamValue))
      }
    }
  }
  walk(input, prefix)
  return params
}

export async function stripeRequest<T = any>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'DELETE'; body?: Record<string, unknown>; idempotencyKey?: string } = {}
): Promise<T> {
  const secret = getStripeSecretKey()
  const method = init.method ?? 'GET'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)

  let url = `${STRIPE_API_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey

  let bodyString: string | undefined
  if (method === 'GET') {
    if (init.body) {
      const qs = toStripeForm(init.body).toString()
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
    }
  } else if (init.body) {
    bodyString = toStripeForm(init.body).toString()
  }

  let response: Response
  try {
    response = await fetch(url, { method, headers, body: bodyString, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }

  const text = await response.text()
  let parsed: any = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }

  if (!response.ok) {
    const message = parsed?.error?.message ?? (typeof parsed === 'string' ? parsed : `Stripe request failed (${response.status})`)
    throw new Error(message)
  }

  return parsed as T
}

// ============================================================
// Webhook signature verification
// ============================================================

export function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').map((entry) => entry.trim())
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2)
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))

  if (!timestamp || !signatures.length) {
    throw new Error('Invalid Stripe signature header')
  }

  const signedPayload = `${timestamp}.${payload}`
  const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')
  const isValid = signatures.some((signature) => {
    if (signature.length !== expectedSignature.length) return false
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))
    } catch {
      return false
    }
  })

  if (!isValid) {
    throw new Error('Invalid Stripe webhook signature')
  }
  return true
}

// ============================================================
// Tenant billing persistence
// ============================================================

export type TenantBillingPatch = {
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_price_id?: string | null
  billing_interval?: BillingInterval | null
  subscription_status?: SubscriptionStatus
  plan?: SubscriptionPlan
  trial_ends_at?: string | null
  subscription_ends_at?: string | null
  grace_period_ends_at?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  has_used_trial?: boolean
  card_brand?: string | null
  card_last4?: string | null
  card_exp_month?: number | null
  card_exp_year?: number | null
  max_users?: number
  max_products?: number
  max_locations?: number
  is_active?: boolean
}

export async function updateTenantBilling(tenantId: string, patch: TenantBillingPatch) {
  const client = getSupabaseServiceClient()
  const { error } = await client
    .from('tenants')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
  if (error) throw error
}

export async function findTenantByStripeReference(reference: {
  customerId?: string | null
  subscriptionId?: string | null
  tenantId?: string | null
}) {
  const client = getSupabaseServiceClient()
  let query = client.from('tenants').select('*').limit(1)

  if (reference.tenantId) {
    query = query.eq('id', reference.tenantId)
  } else if (reference.subscriptionId) {
    query = query.eq('stripe_subscription_id', reference.subscriptionId)
  } else if (reference.customerId) {
    query = query.eq('stripe_customer_id', reference.customerId)
  } else {
    return null
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

// ============================================================
// Billing events (transaction log)
// ============================================================

export async function recordBillingEvent(input: {
  tenantId: string
  eventType: BillingEventType
  title: string
  description?: string | null
  amount?: number | null
  currency?: string | null
  plan?: SubscriptionPlan | null
  status?: 'succeeded' | 'failed' | 'pending' | 'info' | null
  stripeEventId?: string | null
  stripeObjectId?: string | null
  invoiceUrl?: string | null
  metadata?: Record<string, unknown>
}) {
  const client = getSupabaseServiceClient()
  const { error } = await client.from('billing_events').insert({
    tenant_id: input.tenantId,
    event_type: input.eventType,
    title: input.title,
    description: input.description ?? null,
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    plan: input.plan ?? null,
    status: input.status ?? 'info',
    stripe_event_id: input.stripeEventId ?? null,
    stripe_object_id: input.stripeObjectId ?? null,
    invoice_url: input.invoiceUrl ?? null,
    metadata: input.metadata ?? {},
  })
  // Ignore duplicate stripe_event_id (idempotent retries) — unique index throws 23505.
  if (error && !String(error.message ?? '').toLowerCase().includes('duplicate')) {
    throw error
  }
}

/** Returns true if this Stripe event was already processed (idempotency guard). */
export async function isStripeEventProcessed(stripeEventId: string) {
  if (!stripeEventId) return false
  const client = getSupabaseServiceClient()
  const { data } = await client
    .from('billing_events')
    .select('id')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle()
  return Boolean(data)
}

// ============================================================
// In-app notifications for billing (tenant admins + superadmin)
// ============================================================

export async function notifyTenantBilling(tenantId: string, title: string, message: string) {
  const client = getSupabaseServiceClient()

  // Notify all admin/super_admin users belonging to this tenant, plus any
  // platform super_admin membership user so the superadmin monitor surfaces it.
  const [{ data: tenantUsers }, { data: superMemberships }] = await Promise.all([
    client.from('users').select('id').eq('tenant_id', tenantId).in('role', ['admin', 'super_admin']),
    client.from('tenant_memberships').select('auth_user_id').eq('role', 'super_admin'),
  ])

  const recipientIds = new Set<string>()
  for (const u of tenantUsers ?? []) recipientIds.add(String(u.id))

  // Map super_admin auth users to a users row within this tenant if present.
  if (superMemberships?.length) {
    const { data: superUsers } = await client
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'super_admin')
    for (const u of superUsers ?? []) recipientIds.add(String(u.id))
  }

  if (!recipientIds.size) return

  const rows = Array.from(recipientIds).map((userId) => ({
    tenant_id: tenantId,
    user_id: userId,
    title,
    message,
    type: 'billing',
    read: false,
  }))

  const { error } = await client.from('notifications').insert(rows)
  if (error) {
    // Notifications are best-effort; never fail the webhook on notification errors.
    console.error('Failed to insert billing notifications:', error.message)
  }
}

// ============================================================
// Trial + grace period enforcement (lazy, called on tenant load)
// ============================================================

export function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/**
 * Given the raw tenant row, compute whether the trial or grace window has
 * elapsed and return the patch that must be applied (or null if nothing to do).
 * Pure function so it can be reused by the webhook and the lazy loader.
 */
export function computeExpiryPatch(tenant: {
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  grace_period_ends_at: string | null
  stripe_subscription_id: string | null
}, now = new Date()): { patch: TenantBillingPatch; endedReason: 'trial' | 'grace' } | null {
  // Trial elapsed with no active paid subscription -> suspend.
  if (
    tenant.subscription_status === 'trial' &&
    tenant.trial_ends_at &&
    new Date(tenant.trial_ends_at) <= now &&
    !tenant.stripe_subscription_id
  ) {
    return {
      patch: {
        subscription_status: 'suspended',
        subscription_ends_at: now.toISOString(),
      },
      endedReason: 'trial',
    }
  }

  // Grace window elapsed while past_due -> subscription ends.
  if (
    tenant.subscription_status === 'past_due' &&
    tenant.grace_period_ends_at &&
    new Date(tenant.grace_period_ends_at) <= now
  ) {
    return {
      patch: {
        subscription_status: 'suspended',
        subscription_ends_at: now.toISOString(),
        grace_period_ends_at: null,
      },
      endedReason: 'grace',
    }
  }

  return null
}

/**
 * Lazily enforce trial/grace expiry for a single tenant row. Mutates the DB and
 * returns an updated shallow copy of the tenant so callers using the row in the
 * same request see the corrected status. Safe to call on every tenant load.
 */
export async function enforceTenantBillingExpiry<T extends {
  id: string
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  grace_period_ends_at: string | null
  stripe_subscription_id: string | null
  plan: SubscriptionPlan
}>(tenant: T): Promise<T> {
  const result = computeExpiryPatch(tenant)
  if (!result) return tenant

  try {
    await updateTenantBilling(tenant.id, result.patch)
    await recordBillingEvent({
      tenantId: tenant.id,
      eventType: 'subscription_ended',
      title: result.endedReason === 'trial' ? 'Free trial ended' : 'Subscription ended',
      description:
        result.endedReason === 'trial'
          ? 'The 7-day free trial expired without an active subscription. Access has been suspended.'
          : 'Payment was not received within the 5-day grace period. The subscription has ended.',
      plan: tenant.plan,
      status: 'info',
    })
    await notifyTenantBilling(
      tenant.id,
      result.endedReason === 'trial' ? 'Free trial ended' : 'Subscription ended',
      result.endedReason === 'trial'
        ? 'Your 7-day free trial has ended. Subscribe from Settings to keep using Codentra.'
        : 'Your subscription ended after the grace period lapsed. Update your payment method to reactivate.'
    )
  } catch (err) {
    console.error('enforceTenantBillingExpiry failed:', err instanceof Error ? err.message : err)
    return tenant
  }

  return { ...tenant, ...result.patch } as T
}
