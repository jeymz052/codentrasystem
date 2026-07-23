'use client'

import Image from 'next/image'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, CircleDollarSign, Factory, Layers3, ShoppingBag } from 'lucide-react'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/timezones'

type OnboardingFormState = {
  business_name: string
  business_type: string
  billing_email: string
  plan: string
  timezone: string
}

const DEFAULT_STATE: OnboardingFormState = {
  business_name: '',
  business_type: 'retail',
  billing_email: '',
  plan: 'starter',
  timezone: DEFAULT_TIMEZONE,
}

export function OnboardingForm({ initialPlan, initialInterval = 'month' }: { initialPlan?: string; initialInterval?: string }) {
  const router = useRouter()
  const initialPlanValue: string = SUBSCRIPTION_PLANS.some((plan) => plan.plan === initialPlan)
    ? initialPlan ?? DEFAULT_STATE.plan
    : DEFAULT_STATE.plan
  const initialIntervalValue: string = initialInterval === 'year' ? 'year' : 'month'
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
        body: JSON.stringify({ ...form, interval: initialIntervalValue }),
      })

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to create workspace')
      }

      window.localStorage.removeItem('codentra.demo-cache.v3')
      window.localStorage.removeItem('codentra.active-tenant.v3')

      // If the user arrived here from a pricing CTA, complete the Stripe
      // subscription (7-day trial) right after onboarding. Otherwise go to
      // the dashboard.
      if (initialPlanValue && initialPlanValue !== 'starter') {
        try {
          const checkout = await fetch('/api/billing-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: (await response.json()).tenantId, plan: initialPlanValue, interval: initialIntervalValue }),
          })
          const checkoutData = (await checkout.json()) as { url?: string }
          if (checkoutData.url) {
            window.location.href = checkoutData.url
            return
          }
        } catch {
          // Fall through to dashboard if checkout fails; user can retry in Settings.
        }
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
            src="/images/codentra-removebg-preview.png"
            alt="Codentra logo"
            width={520}
            height={184}
            priority
            className="auth-brand-logo"
          />
        </div>
        <p className="auth-brand-tagline">Simplicity that Scales</p>
        <div className="auth-signin-copy">
          <div className="auth-badge">
            <Layers3 size={14} />
            Tenant onboarding
          </div>
          <h1 className="auth-title">Set up your first business</h1>
          <p className="auth-copy">
            We&apos;ll create your workspace and apply the right setup — buy &amp; sell (sell everything in inventory) or production (sell only the finished goods you make).
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
        <div className="auth-field" style={{ gridColumn: '1 / -1' }}>
          <span>How does this business operate?</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 6 }}>
            {[
              {
                mode: 'retail',
                title: 'Buy & Sell',
                desc: 'Sell everything in inventory at the POS. Best for sari-sari stores, retail, and convenience shops.',
                icon: ShoppingBag,
                tint: '#DBEAFE',
                color: '#2563EB',
              },
              {
                mode: 'manufacturing',
                title: 'Production',
                desc: 'Make finished goods from raw materials. Only finished goods are sold at the POS; raw materials are for production only.',
                icon: Factory,
                tint: '#F3E8FF',
                color: '#8B5CF6',
              },
            ].map((option) => {
              const selected = form.business_type === option.mode
              const Icon = option.icon
              return (
                <button
                  type="button"
                  key={option.mode}
                  onClick={() => setForm((current) => ({ ...current, business_type: option.mode }))}
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: selected ? `2px solid ${option.color}` : '1px solid #E2E8F0',
                    background: selected ? option.tint : '#FFFFFF',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: option.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={option.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{option.title}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{option.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <label className="auth-field">
          <span>Billing email</span>
          <div className="auth-input-wrap">
            <CircleDollarSign size={14} />
            <input value={form.billing_email} onChange={(event) => setForm((current) => ({ ...current, billing_email: event.target.value }))} type="email" placeholder="billing@company.com" />
          </div>
        </label>
        <label className="auth-field">
          <span>Plan</span>
          <SearchableSelect
            className="auth-select"
            placeholder="Plan"
            searchPlaceholder="Search plans..."
            value={form.plan}
            onChange={(value) => setForm((current) => ({ ...current, plan: value }))}
            options={[
              { value: 'starter', label: 'Starter' },
              { value: 'professional', label: 'Professional' },
              { value: 'enterprise', label: 'Enterprise' },
            ]}
          />
        </label>
        <label className="auth-field">
          <span>Timezone</span>
          <SearchableSelect
            className="auth-select"
            placeholder="Timezone"
            searchPlaceholder="Search countries or timezones..."
            value={form.timezone}
            onChange={(value) => setForm((current) => ({ ...current, timezone: value }))}
            options={TIMEZONES}
            dropUp
          />
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
