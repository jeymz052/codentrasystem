import { getSupabaseServiceClient } from '@/lib/supabase-server'
import { paymongoRequest, verifyPayMongoWebhookSignature } from '@/lib/paymongo'
import type { BillingEventType, BillingInterval, SubscriptionPlan, SubscriptionStatus } from '@/types/database'

export const TRIAL_DAYS = 7
export const GRACE_DAYS = 5

export const PLAN_ENV: Record<SubscriptionPlan, Record<BillingInterval, string>> = {
  starter: {
    month: 'PAYMONGO_PLAN_STARTER_MONTHLY',
    year: 'PAYMONGO_PLAN_STARTER_YEARLY',
  },
  professional: {
    month: 'PAYMONGO_PLAN_PROFESSIONAL_MONTHLY',
    year: 'PAYMONGO_PLAN_PROFESSIONAL_YEARLY',
  },
  enterprise: {
    month: 'PAYMONGO_PLAN_ENTERPRISE_MONTHLY',
    year: 'PAYMONGO_PLAN_ENTERPRISE_YEARLY',
  },
}

export const PLAN_LIMITS: Record<SubscriptionPlan, { max_users: number; max_products: number; max_locations: number }> = {
  starter: { max_users: 3, max_products: 100, max_locations: 1 },
  professional: { max_users: 10, max_products: 1000, max_locations: 5 },
  enterprise: { max_users: 999, max_products: 9999, max_locations: 99 },
}

type TenantBillingPatch = {
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

function getPayMongoKey() {
  const secret = process.env.PAYMONGO_SECRET_KEY
  if (!secret) throw new Error('PAYMONGO_SECRET_KEY is not configured')
  return secret
}

function basicAuth(key: string) {
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`
}

export function getPlanId(plan: SubscriptionPlan, interval: BillingInterval): string {
  const envName = PLAN_ENV[plan]?.[interval]
  if (!envName) throw new Error(`Unknown plan/interval: ${plan}/${interval}`)
  const planId = process.env[envName]
  if (!planId) throw new Error(`${envName} is not configured`)
  return planId
}

export function resolvePlanFromPlanId(planId: string): { plan: SubscriptionPlan; interval: BillingInterval } | null {
  if (!planId) return null
  for (const plan of Object.keys(PLAN_ENV) as SubscriptionPlan[]) {
    for (const interval of ['month', 'year'] as BillingInterval[]) {
      if (process.env[PLAN_ENV[plan][interval]] === planId) {
        return { plan, interval }
      }
    }
  }
  return null
}

async function request<T>(path: string, init: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}) {
  const method = init.method ?? 'GET'
  const res = await paymongoRequest<T>(path, {
    method,
    headers: {
      Authorization: basicAuth(getPayMongoKey()),
      'Content-Type': 'application/json',
    },
    body: init.body == null ? undefined : JSON.stringify(init.body),
  })
  return res
}

export async function ensurePayMongoCustomer(input: {
  email: string
  name?: string | null
  phone?: string | null
}) {
  const email = input.email.trim()
  if (!email) throw new Error('Billing email is required')

  const existing = await request<{ data?: Array<{ id: string }> }>('/customers?email=' + encodeURIComponent(email), { method: 'GET' })
  const first = Array.isArray((existing as any)?.data) ? (existing as any).data[0] : null
  if (first?.id) return String(first.id)

  const created = await request<{ data?: { id: string } }>('/customers', {
    method: 'POST',
    body: {
      data: {
        attributes: {
          name: (input.name ?? email).trim().slice(0, 255),
          email,
          phone: input.phone?.trim() || undefined,
        },
      },
    },
  })

  const customerId = String((created as any)?.data?.id ?? '')
  if (!customerId) throw new Error('Failed to create PayMongo customer')
  return customerId
}

export async function createPayMongoSubscription(input: {
  planId: string
  customerId: string
}) {
  const created = await request<any>('/subscriptions', {
    method: 'POST',
    body: {
      data: {
        attributes: {
          plan_id: input.planId,
          customer_id: input.customerId,
        },
      },
    },
  })

  return created
}

export async function getPayMongoSubscription(subscriptionId: string) {
  return request<any>(`/subscriptions/${subscriptionId}`, { method: 'GET' })
}

export async function updatePayMongoSubscriptionPlan(subscriptionId: string, planId: string) {
  return request<any>(`/subscriptions/${subscriptionId}/plan`, {
    method: 'PUT',
    body: {
      data: {
        attributes: {
          plan_id: planId,
        },
      },
    },
  })
}

export async function cancelPayMongoSubscription(subscriptionId: string) {
  return request<any>(`/subscriptions/${subscriptionId}/cancel`, { method: 'POST' })
}

export function getSubscriptionPaymentUrl(subscription: any): string | null {
  const paymentIntent =
    subscription?.data?.attributes?.latest_invoice?.payment_intent ??
    subscription?.latest_invoice?.payment_intent ??
    null

  return (
    paymentIntent?.attributes?.redirect?.url ??
    paymentIntent?.redirect?.url ??
    paymentIntent?.attributes?.setup_intent?.next_action_url ??
    paymentIntent?.setup_intent?.next_action_url ??
    null
  )
}

export function getSubscriptionStatus(subscription: any): string {
  return String(
    subscription?.data?.attributes?.status ??
    subscription?.attributes?.status ??
    subscription?.status ??
    'incomplete'
  )
}

export function getSubscriptionPlanId(subscription: any): string {
  return String(
    subscription?.data?.attributes?.plan?.id ??
    subscription?.data?.attributes?.plan_id ??
    subscription?.attributes?.plan?.id ??
    subscription?.attributes?.plan_id ??
    subscription?.plan?.id ??
    subscription?.plan_id ??
    ''
  )
}

export function getSubscriptionCustomerId(subscription: any): string {
  return String(
    subscription?.data?.attributes?.customer_id ??
    subscription?.attributes?.customer_id ??
    subscription?.customer_id ??
    ''
  )
}

export function getSubscriptionNextBillingDate(subscription: any): string | null {
  const value =
    subscription?.data?.attributes?.next_billing_schedule ??
    subscription?.data?.attributes?.latest_invoice?.due_date ??
    subscription?.attributes?.next_billing_schedule ??
    subscription?.attributes?.latest_invoice?.due_date ??
    null
  return value ? new Date(String(value)).toISOString() : null
}

export function getSubscriptionCard(subscription: any): { card_brand: string | null; card_last4: string | null; card_exp_month: number | null; card_exp_year: number | null } | null {
  const paymentMethod =
    subscription?.data?.attributes?.default_customer_payment_method ??
    subscription?.data?.attributes?.default_customer_payment_method_id ??
    subscription?.attributes?.default_customer_payment_method ??
    null

  const card = paymentMethod?.card ?? paymentMethod?.attributes?.card ?? paymentMethod
  if (!card || !card.last4) return null

  return {
    card_brand: card.brand ?? null,
    card_last4: card.last4 ?? null,
    card_exp_month: card.exp_month ? Number(card.exp_month) : null,
    card_exp_year: card.exp_year ? Number(card.exp_year) : null,
  }
}

export function verifyPayMongoWebhook(payload: string, headers: Headers) {
  return verifyPayMongoWebhookSignature(payload, headers)
}

export async function updateTenantBilling(tenantId: string, patch: TenantBillingPatch) {
  const client = getSupabaseServiceClient()
  const { error } = await client
    .from('tenants')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
  if (error) throw error
}

export async function findTenantByPayMongoReference(reference: {
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
  if (error && !String(error.message ?? '').toLowerCase().includes('duplicate')) {
    throw error
  }
}

export async function isPayMongoEventProcessed(eventId: string) {
  if (!eventId) return false
  const client = getSupabaseServiceClient()
  const { data } = await client
    .from('billing_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .maybeSingle()
  return Boolean(data)
}

export async function notifyTenantBilling(tenantId: string, title: string, message: string) {
  const client = getSupabaseServiceClient()

  const [{ data: tenantUsers }, { data: superMemberships }] = await Promise.all([
    client.from('users').select('id').eq('tenant_id', tenantId).in('role', ['admin', 'super_admin']),
    client.from('tenant_memberships').select('auth_user_id').eq('role', 'super_admin'),
  ])

  const recipientIds = new Set<string>()
  for (const u of tenantUsers ?? []) recipientIds.add(String(u.id))

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
    console.error('Failed to insert billing notifications:', error.message)
  }
}

export function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function computeExpiryPatch(tenant: {
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  grace_period_ends_at: string | null
  stripe_subscription_id: string | null
}, now = new Date()): { patch: TenantBillingPatch; endedReason: 'trial' | 'grace' } | null {
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
