'use client'

import Image from 'next/image'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, CalendarDays, CircleDollarSign, Layers3 } from 'lucide-react'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

type OnboardingFormState = {
  business_name: string
  business_type: string
  billing_email: string
  plan: string
  timezone: string
}

const DEFAULT_STATE: OnboardingFormState = {
  business_name: '',
  business_type: 'general',
  billing_email: '',
  plan: 'starter',
  timezone: 'Asia/Manila',
}

export function OnboardingForm({ initialPlan }: { initialPlan?: string }) {
  const router = useRouter()
  const initialPlanValue: string = SUBSCRIPTION_PLANS.some((plan) => plan.plan === initialPlan)
    ? initialPlan ?? DEFAULT_STATE.plan
    : DEFAULT_STATE.plan
  const [form, setForm] = useState<OnboardingFormState>({
    ...DEFAULT_STATE,
    plan: initialPlanValue,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to create workspace')
      }

      router.replace('/dashboard')
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-card auth-card--entry onboarding-card" onSubmit={handleSubmit}>
      <div className="auth-brand-block">
        <div className="auth-brand">
          <Image
            src="/images/codentralogo-removebg-preview.png"
            alt="Codentra logo"
            width={520}
            height={184}
            priority
            className="auth-brand-logo"
          />
        </div>
        <div className="auth-signin-copy">
          <div className="auth-badge">
            <Layers3 size={14} />
            Tenant onboarding
          </div>
          <h1 className="auth-title">Set up your first business</h1>
          <p className="auth-copy">
            We&apos;ll create the tenant, connect the first subscription record, and load the operational template that matches your business type.
          </p>
        </div>
      </div>

      <div className="onboarding-grid">
        <label className="auth-field">
          <span>Business name</span>
          <div className="auth-input-wrap">
            <Building2 size={14} />
            <input value={form.business_name} onChange={(event) => setForm((current) => ({ ...current, business_name: event.target.value }))} placeholder="Brew House Cafe" required />
          </div>
        </label>
        <label className="auth-field">
          <span>Business type</span>
          <select className="auth-select" value={form.business_type} onChange={(event) => setForm((current) => ({ ...current, business_type: event.target.value }))}>
            <option value="coffee_shop">Coffee shop</option>
            <option value="manufacturing">Manufacturer</option>
            <option value="convenience_store">Sari-sari / Convenience store</option>
            <option value="restaurant">Restaurant</option>
            <option value="retail">Retail</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="general">General</option>
          </select>
        </label>
        <label className="auth-field">
          <span>Billing email</span>
          <div className="auth-input-wrap">
            <CircleDollarSign size={14} />
            <input value={form.billing_email} onChange={(event) => setForm((current) => ({ ...current, billing_email: event.target.value }))} type="email" placeholder="billing@company.com" />
          </div>
        </label>
        <label className="auth-field">
          <span>Plan</span>
          <select className="auth-select" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <label className="auth-field">
          <span>Timezone</span>
          <div className="auth-input-wrap">
            <CalendarDays size={14} />
            <input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="Asia/Manila" />
          </div>
        </label>
      </div>

      {error ? <div className="auth-message error">{error}</div> : null}

      <button className="auth-button" type="submit" disabled={loading}>
        {loading ? 'Creating tenant...' : 'Create tenant'}
        <ArrowRight size={16} />
      </button>
    </form>
  )
}
