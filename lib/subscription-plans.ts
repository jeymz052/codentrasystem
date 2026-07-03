import type { SubscriptionPlan } from '@/types/database'

export type PlanDetails = {
  plan: SubscriptionPlan
  name: string
  monthly: number
  yearly: number
  users: number | string
  products: number | string
  locations: number | string
  description: string
  highlight?: string
}

export const SUBSCRIPTION_PLANS: PlanDetails[] = [
  {
    plan: 'starter',
    name: 'Starter',
    monthly: 499,
    yearly: 4999,
    users: 3,
    products: 100,
    locations: 1,
    description: 'Best for single-location stores, cafes, and small teams getting started.',
  },
  {
    plan: 'professional',
    name: 'Professional',
    monthly: 999,
    yearly: 9999,
    users: 10,
    products: 1000,
    locations: 5,
    description: 'For growing businesses that need multiple staff accounts and more branches.',
    highlight: 'Most popular',
  },
  {
    plan: 'enterprise',
    name: 'Enterprise',
    monthly: 2499,
    yearly: 24999,
    users: 999,
    products: 9999,
    locations: 99,
    description: 'For multi-branch operations, manufacturers, and custom rollouts.',
  },
]

export function formatPlanPrice(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}
