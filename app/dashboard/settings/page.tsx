'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, Save, Settings as SettingsIcon } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import type { BusinessType, SubscriptionPlan, SubscriptionStatus } from '@/types/database'

export default function SettingsPage() {
  const { state, updateTenant, resetDemo } = useDemoSystem()
  const [billingLoading, setBillingLoading] = useState(false)
  const [form, setForm] = useState({
    name: state.tenant.name,
    business_type: state.tenant.business_type,
    plan: state.tenant.plan,
    subscription_status: state.tenant.subscription_status,
    currency: state.tenant.currency,
    timezone: state.tenant.timezone,
    max_users: String(state.tenant.max_users),
    max_products: String(state.tenant.max_products),
    max_locations: String(state.tenant.max_locations),
  })

  useEffect(() => {
    setForm({
      name: state.tenant.name,
      business_type: state.tenant.business_type,
      plan: state.tenant.plan,
      subscription_status: state.tenant.subscription_status,
      currency: state.tenant.currency,
      timezone: state.tenant.timezone,
      max_users: String(state.tenant.max_users),
      max_products: String(state.tenant.max_products),
      max_locations: String(state.tenant.max_locations),
    })
  }, [state.tenant])

  function handleSave() {
    updateTenant({
      name: form.name,
      business_type: form.business_type as BusinessType,
      plan: form.plan as SubscriptionPlan,
      subscription_status: form.subscription_status as SubscriptionStatus,
      currency: form.currency,
      timezone: form.timezone,
      max_users: Number(form.max_users) || 1,
      max_products: Number(form.max_products) || 1,
      max_locations: Number(form.max_locations) || 1,
    })
  }

  async function handleBilling() {
    setBillingLoading(true)
    try {
      const response = await fetch('/api/billing-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: state.tenant.id, plan: form.plan }),
      })
      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to start billing checkout')
      }
      const data = await response.json() as { url?: string }
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start billing checkout')
    } finally {
      setBillingLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Settings</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Edit business profile, subscription limits, and demo profile.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => resetDemo(form.business_type as BusinessType)}>
          <RotateCcw size={15} /> Reset demo data
        </button>
        <button className="btn btn-primary" onClick={() => void handleBilling()} disabled={billingLoading}>
          <SettingsIcon size={15} /> {billingLoading ? 'Opening billing...' : 'Manage billing'}
        </button>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Business name" />
          <select className="input" value={form.business_type} onChange={(event) => setForm((current) => ({ ...current, business_type: event.target.value as BusinessType }))}>
            <option value="coffee_shop">Coffee shop</option>
            <option value="convenience_store">Convenience store</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="restaurant">Restaurant</option>
            <option value="retail">Retail</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="general">General</option>
          </select>
          <select className="input" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value as SubscriptionPlan }))}>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select className="input" value={form.subscription_status} onChange={(event) => setForm((current) => ({ ...current, subscription_status: event.target.value as SubscriptionStatus }))}>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <input className="input" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} placeholder="Currency" />
          <input className="input" value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="Timezone" />
          <input className="input" type="number" value={form.max_users} onChange={(event) => setForm((current) => ({ ...current, max_users: event.target.value }))} placeholder="Max users" />
          <input className="input" type="number" value={form.max_products} onChange={(event) => setForm((current) => ({ ...current, max_products: event.target.value }))} placeholder="Max products" />
          <input className="input" type="number" value={form.max_locations} onChange={(event) => setForm((current) => ({ ...current, max_locations: event.target.value }))} placeholder="Max locations" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={15} /> Save Settings
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginTop: 18 }}>
        {[
          { label: 'Plan', value: state.tenant.plan, color: '#3B82F6' },
          { label: 'Business Type', value: state.tenant.business_type.replaceAll('_', ' '), color: '#8B5CF6' },
          { label: 'Users Used', value: `${state.users.length}/${state.tenant.max_users}`, color: '#10B981' },
          { label: 'Locations Used', value: `${state.locations.length}/${state.tenant.max_locations}`, color: '#F59E0B' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#64748B' }}>{stat.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
