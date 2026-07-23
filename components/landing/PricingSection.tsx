'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { SUBSCRIPTION_PLANS, formatPlanPrice } from '@/lib/subscription-plans'
import type { BillingInterval } from '@/types/database'

export function PricingSection() {
  const [interval, setInterval] = useState<BillingInterval>('month')

  return (
    <section id="pricing" style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 20px 56px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="auth-badge" style={{ margin: '0 auto 12px' }}>
          <Sparkles size={14} /> Pricing
        </div>
        <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.05em' }}>Simple plans for every stage</h2>
        <p style={{ color: '#475569', fontSize: 15, marginTop: 8 }}>Start with a 7-day free trial. Switch to yearly and pay for ~10 months, get 12.</p>
        <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 999, padding: 3, marginTop: 16 }}>
          {(['month', 'year'] as BillingInterval[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: '8px 20px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
                background: interval === opt ? '#fff' : 'transparent',
                color: interval === opt ? '#0F172A' : '#64748B',
                boxShadow: interval === opt ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
              }}
            >
              {opt === 'month' ? 'Monthly' : 'Yearly'}
              {opt === 'year' && <span style={{ color: '#10B981', marginLeft: 6 }}>save ~17%</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, alignItems: 'stretch' }}>
        {SUBSCRIPTION_PLANS.map((plan) => {
          const price = interval === 'year' ? plan.yearly : plan.monthly
          return (
            <div key={plan.plan} className="card" style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', border: plan.highlight ? '2px solid #3B82F6' : '1px solid #E2E8F0', position: 'relative' }}>
              {plan.highlight && (
                <span style={{ position: 'absolute', top: -10, right: 16, fontSize: 10, fontWeight: 800, color: '#fff', background: '#3B82F6', padding: '3px 10px', borderRadius: 999 }}>
                  {plan.highlight}
                </span>
              )}
              <div style={{ fontSize: 16, fontWeight: 900 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 10 }}>
                <span style={{ fontSize: 30, fontWeight: 900 }}>{formatPlanPrice(price)}</span>
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>/{interval === 'year' ? 'yr' : 'mo'}</span>
              </div>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 8, lineHeight: 1.5, minHeight: 56 }}>{plan.description}</p>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 12, display: 'grid', gap: 4 }}>
                <span>👤 {plan.users} users</span>
                <span>📦 {plan.products} products</span>
                <span>📍 {plan.locations} location{plan.locations === 1 ? '' : 's'}</span>
              </div>
              <Link
                href={`/sign-up?plan=${plan.plan}&interval=${interval}`}
                className={`btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textDecoration: 'none', marginTop: 18, justifyContent: 'center' }}
              >
                Start free trial
              </Link>
            </div>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 18 }}>
        Prices in PHP. Trial includes full access for 7 days — cancel anytime before it ends and you won&apos;t be charged.
      </p>
    </section>
  )
}
