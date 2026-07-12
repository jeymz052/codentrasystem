'use client'

import { useState, type FormEvent } from 'react'
import { Building2, Coins, Mail, Plus, ShieldCheck, UserPlus } from 'lucide-react'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Buy & Sell' },
  { value: 'manufacturing', label: 'Production' },
]

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Cashier' },
]

export function ProvisionTenantForm() {
  const [form, setForm] = useState({
    business_name: '',
    business_type: 'retail',
    plan: 'starter',
    billing_email: '',
    client_name: '',
    client_email: '',
    role: 'admin',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/provision-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to provision workspace')
      }
      setSuccess(
        `Workspace "${form.business_name}" provisioned on the ${form.plan} plan. ` +
          `An invitation was sent to ${form.client_email}.`,
      )
      setForm({
        business_name: '',
        business_type: 'retail',
        plan: 'starter',
        billing_email: '',
        client_name: '',
        client_email: '',
        role: 'admin',
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to provision workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card" style={{ padding: 18, borderRadius: 18 }} onSubmit={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserPlus size={18} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Provision a client workspace</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>The plan you choose here is locked — the client cannot change it.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
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
            {BUSINESS_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="auth-field">
          <span>Contracted plan</span>
          <select className="auth-select" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}>
            {SUBSCRIPTION_PLANS.map((option) => (
              <option key={option.plan} value={option.plan}>{option.name} — {option.users} users / {option.products} products / {option.locations} locations</option>
            ))}
          </select>
        </label>

        <label className="auth-field">
          <span>Billing email</span>
          <div className="auth-input-wrap">
            <Coins size={14} />
            <input value={form.billing_email} onChange={(event) => setForm((current) => ({ ...current, billing_email: event.target.value }))} type="email" placeholder="billing@company.com" />
          </div>
        </label>

        <label className="auth-field">
          <span>Client name</span>
          <div className="auth-input-wrap">
            <UserPlus size={14} />
            <input value={form.client_name} onChange={(event) => setForm((current) => ({ ...current, client_name: event.target.value }))} placeholder="Juan Dela Cruz" />
          </div>
        </label>

        <label className="auth-field">
          <span>Client email</span>
          <div className="auth-input-wrap">
            <Mail size={14} />
            <input value={form.client_email} onChange={(event) => setForm((current) => ({ ...current, client_email: event.target.value }))} type="email" placeholder="client@company.com" required />
          </div>
        </label>

        <label className="auth-field">
          <span>Client role</span>
          <select className="auth-select" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div className="auth-message error" style={{ marginTop: 12 }}>{error}</div> : null}
      {success ? (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={16} />
          {success}
        </div>
      ) : null}

      <button className="auth-button" type="submit" disabled={loading} style={{ marginTop: 14 }}>
        {loading ? 'Provisioning...' : <>Provision workspace <Plus size={16} /></>}
      </button>
    </form>
  )
}
