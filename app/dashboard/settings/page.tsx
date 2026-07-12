'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { Building2, Coins, Factory, Landmark, Layers3, MapPin, Plus, RotateCcw, Save, Settings as SettingsIcon, Sparkles, Tag, Users, Wallet, Warehouse } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import type { BusinessType, SubscriptionPlan, SubscriptionStatus } from '@/types/database'

function humanize(value: string) {
  return value.replaceAll('_', ' ')
}

const PAYMENT_ACCOUNT_FIELDS = [
  { key: 'gcash', label: 'GCash', accountLabel: 'GCash number / account', Icon: Wallet },
  { key: 'maya', label: 'Maya', accountLabel: 'Maya account', Icon: Wallet },
  { key: 'bdo', label: 'BDO', accountLabel: 'BDO account number', Icon: Landmark },
  { key: 'maribank', label: 'Maribank', accountLabel: 'Maribank account', Icon: Landmark },
] as const

export default function SettingsPage() {
  const { state, updateTenant, resetDemo, addCategory, addUnitOfMeasure, addLocation, notifySuccess, notifyError } = useDemoSystem()
  const [billingLoading, setBillingLoading] = useState(false)
  const [catalogTab, setCatalogTab] = useState<'categories' | 'uom' | 'locations'>('categories')
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3B82F6', description: '' })
  const [uomForm, setUomForm] = useState({ name: '', abbreviation: '' })
  const [locationForm, setLocationForm] = useState({ code: '', name: '', zone: '' })
  const [paymentForm, setPaymentForm] = useState({
    gcash_account: state.tenant.gcash_account ?? '',
    gcash_qr_url: state.tenant.gcash_qr_url ?? '',
    maya_account: state.tenant.maya_account ?? '',
    maya_qr_url: state.tenant.maya_qr_url ?? '',
    bdo_account: state.tenant.bdo_account ?? '',
    bdo_qr_url: state.tenant.bdo_qr_url ?? '',
    maribank_account: state.tenant.maribank_account ?? '',
    maribank_qr_url: state.tenant.maribank_qr_url ?? '',
  })
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
    setPaymentForm({
      gcash_account: state.tenant.gcash_account ?? '',
      gcash_qr_url: state.tenant.gcash_qr_url ?? '',
      maya_account: state.tenant.maya_account ?? '',
      maya_qr_url: state.tenant.maya_qr_url ?? '',
      bdo_account: state.tenant.bdo_account ?? '',
      bdo_qr_url: state.tenant.bdo_qr_url ?? '',
      maribank_account: state.tenant.maribank_account ?? '',
      maribank_qr_url: state.tenant.maribank_qr_url ?? '',
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
    notifySuccess('Settings saved successfully.')
  }

  function handleResetDemo() {
    resetDemo(form.business_type as BusinessType)
    notifySuccess('Demo data reset successfully.')
  }

  function handleAddCategory() {
    if (!categoryForm.name.trim()) return
    addCategory({
      name: categoryForm.name,
      color: categoryForm.color,
      description: categoryForm.description,
    })
    notifySuccess('Category added successfully.')
    setCategoryForm({ name: '', color: '#3B82F6', description: '' })
  }

  function handleAddUom() {
    if (!uomForm.name.trim() || !uomForm.abbreviation.trim()) return
    addUnitOfMeasure({
      name: uomForm.name,
      abbreviation: uomForm.abbreviation,
    })
    notifySuccess('Unit of measure added successfully.')
    setUomForm({ name: '', abbreviation: '' })
  }

  function handleAddLocation() {
    if (!locationForm.code.trim() || !locationForm.name.trim()) return
    addLocation({
      code: locationForm.code,
      name: locationForm.name,
      zone: locationForm.zone,
    })
    notifySuccess('Location added successfully.')
    setLocationForm({ code: '', name: '', zone: '' })
  }

  function handleSavePayments() {
    updateTenant({
      gcash_account: paymentForm.gcash_account.trim() || null,
      gcash_qr_url: paymentForm.gcash_qr_url.trim() || state.tenant.gcash_qr_url || null,
      maya_account: paymentForm.maya_account.trim() || null,
      maya_qr_url: paymentForm.maya_qr_url.trim() || state.tenant.maya_qr_url || null,
      bdo_account: paymentForm.bdo_account.trim() || null,
      bdo_qr_url: paymentForm.bdo_qr_url.trim() || state.tenant.bdo_qr_url || null,
      maribank_account: paymentForm.maribank_account.trim() || null,
      maribank_qr_url: paymentForm.maribank_qr_url.trim() || state.tenant.maribank_qr_url || null,
    })
    notifySuccess('Payment accounts saved successfully.')
  }

  async function handleQrUpload(method: (typeof PAYMENT_ACCOUNT_FIELDS)[number]['key'], event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('tenantId', state.tenant.id)
      body.append('method', method)
      const response = await fetch('/api/tenant/payment-qr', { method: 'POST', body })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}) as { error?: string })
        throw new Error(error.error || 'Upload failed')
      }
      const data = (await response.json()) as { url: string }
      setPaymentForm((current) => ({ ...current, [`${method}_qr_url`]: data.url }))
      updateTenant({ [`${method}_qr_url`]: data.url } as unknown as Parameters<typeof updateTenant>[0])
      notifySuccess('QR image uploaded and saved.')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      event.target.value = ''
    }
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
      notifyError(error instanceof Error ? error.message : 'Failed to start billing checkout')
    } finally {
      setBillingLoading(false)
    }
  }

  const overviewCards = [
    { label: 'Plan', value: state.tenant.plan, icon: Coins, color: '#3B82F6' },
    { label: 'Business type', value: humanize(state.tenant.business_type), icon: Building2, color: '#8B5CF6' },
    { label: 'Users', value: `${state.users.length}/${state.tenant.max_users}`, icon: Users, color: '#10B981' },
    { label: 'Products', value: `${state.products.length}/${state.tenant.max_products}`, icon: Layers3, color: '#F59E0B' },
    { label: 'Locations', value: `${state.locations.length}/${state.tenant.max_locations}`, icon: Warehouse, color: '#0F766E' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section
        className="card"
        style={{
          padding: '22px 24px',
          borderRadius: 22,
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 'auto -120px -120px auto',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.14), transparent 68%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ maxWidth: 760 }}>
            <div className="auth-badge" style={{ marginBottom: 12 }}>
              <Sparkles size={14} />
              Workspace settings
            </div>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.05em', lineHeight: 1.05 }}>
              Settings
            </h2>
            <p style={{ color: '#475569', fontSize: 14, marginTop: 8, maxWidth: 680, lineHeight: 1.6 }}>
              Manage your business profile, subscription limits, and the core catalog used across inventory and POS.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={handleResetDemo}>
              <RotateCcw size={15} /> Reset demo data
            </button>
            <button className="btn btn-primary" onClick={() => void handleBilling()} disabled={billingLoading}>
              <SettingsIcon size={15} /> {billingLoading ? 'Opening billing...' : 'Manage billing'}
            </button>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {overviewCards.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="card"
              style={{
                padding: '16px 18px',
                borderRadius: 18,
                background: '#fff',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${item.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                  <Icon size={18} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: item.color, marginTop: 4 }}>{item.value}</div>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="card" style={{ padding: '18px 20px', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', flexShrink: 0 }}>
            <Factory size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Enable Production</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Turn on Bills of Materials and finished goods. When enabled, only finished goods are sold at the POS; raw materials are for production only.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateTenant({ enable_production: !(state.tenant.enable_production ?? false) })}
          style={{
            flexShrink: 0,
            width: 52,
            height: 30,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            background: state.tenant.enable_production ? '#8B5CF6' : '#CBD5E1',
            display: 'flex',
            justifyContent: state.tenant.enable_production ? 'flex-end' : 'flex-start',
          }}
          aria-pressed={Boolean(state.tenant.enable_production)}
        >
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff' }} />
        </button>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div className="auth-badge" style={{ marginBottom: 10 }}>
                <Building2 size={14} />
                Business profile
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Workspace details</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Edit the organization name, subscription, and operating defaults.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label className="auth-field">
              <span>Business name</span>
              <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Business name" />
            </label>
            <label className="auth-field">
              <span>Business type</span>
              <select className="input" value={form.business_type} onChange={(event) => setForm((current) => ({ ...current, business_type: event.target.value as BusinessType }))}>
                <option value="coffee_shop">Coffee shop</option>
                <option value="convenience_store">Convenience store</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="restaurant">Restaurant</option>
                <option value="retail">Retail</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="general">General</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Plan</span>
              <select className="input" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value as SubscriptionPlan }))}>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Status</span>
              <select className="input" value={form.subscription_status} onChange={(event) => setForm((current) => ({ ...current, subscription_status: event.target.value as SubscriptionStatus }))}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Currency</span>
              <input className="input" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} placeholder="Currency" />
            </label>
            <label className="auth-field">
              <span>Timezone</span>
              <input className="input" value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="Timezone" />
            </label>
          </div>

          <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Plan limits</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Adjust only if you need to override a subscription test case.</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <label className="auth-field">
                <span>Max users</span>
                <input className="input" type="number" value={form.max_users} onChange={(event) => setForm((current) => ({ ...current, max_users: event.target.value }))} />
              </label>
              <label className="auth-field">
                <span>Max products</span>
                <input className="input" type="number" value={form.max_products} onChange={(event) => setForm((current) => ({ ...current, max_products: event.target.value }))} />
              </label>
              <label className="auth-field">
                <span>Max locations</span>
                <input className="input" type="number" value={form.max_locations} onChange={(event) => setForm((current) => ({ ...current, max_locations: event.target.value }))} />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={15} /> Save Settings
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div className="auth-badge" style={{ marginBottom: 10 }}>
            <Coins size={14} />
            Billing and status
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Current state</h3>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.6 }}>
            Quick view of what’s active in the workspace today.
          </p>

          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {[
              { label: 'Plan', value: state.tenant.plan, color: '#3B82F6' },
              { label: 'Subscription', value: state.tenant.subscription_status, color: '#10B981' },
              { label: 'Users used', value: `${state.users.length}/${state.tenant.max_users}`, color: '#8B5CF6' },
              { label: 'Products used', value: `${state.products.length}/${state.tenant.max_products}`, color: '#F59E0B' },
              { label: 'Locations used', value: `${state.locations.length}/${state.tenant.max_locations}`, color: '#0F766E' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'linear-gradient(180deg, #EFF6FF 0%, #F8FBFF 100%)', border: '1px solid #D8E4F2' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Billing email</div>
            <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{state.tenant.billing_email ?? 'Not set'}</div>
            <div style={{ marginTop: 3, fontSize: 12, color: '#64748B' }}>{state.tenant.timezone}</div>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 20, borderRadius: 20 }}>
        <div className="auth-badge" style={{ marginBottom: 10 }}>
          <Wallet size={14} /> Store payment accounts
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Direct payment accounts</h3>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.6 }}>
          Add your store&apos;s own GCash, Maya, BDO, and Maribank details so the POS can show a &quot;Scan this to pay&quot; QR at checkout. These are manual tenders recorded by the cashier — no third-party gateway is involved.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 16 }}>
          {PAYMENT_ACCOUNT_FIELDS.map(({ key, label, accountLabel, Icon }) => {
            const accountKey = `${key}_account` as const
            const qrKey = `${key}_qr_url` as const
            return (
              <div key={key} style={{ padding: 16, borderRadius: 16, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{label}</div>
                </div>
                <label className="auth-field">
                  <span>{accountLabel}</span>
                  <input
                    className="input"
                    value={paymentForm[accountKey]}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, [accountKey]: event.target.value }))}
                    placeholder="e.g. 0917 123 4567"
                  />
                </label>
                <label className="auth-field" style={{ marginTop: 10 }}>
                  <span>QR image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) => handleQrUpload(key, event)}
                    className="input"
                    style={{ padding: 6, fontSize: 12 }}
                  />
                </label>
                {paymentForm[qrKey] ? (
                  <div style={{ marginTop: 10, textAlign: 'center', position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paymentForm[qrKey]}
                      alt={`${label} QR code`}
                      style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0' }}
                    />
                    <button
                      type="button"
                      onClick={() => setPaymentForm((current) => ({ ...current, [qrKey]: '' }))}
                      style={{ marginTop: 8, fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSavePayments}>
            <Save size={15} /> Save payment accounts
          </button>
        </div>
      </section>

      <section className="card" style={{ padding: 20, borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ maxWidth: 720 }}>
            <div className="auth-badge" style={{ marginBottom: 10 }}>
              <Sparkles size={14} />
              Catalog management
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Create your catalog foundations</h3>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.6 }}>
              Add the master data used by inventory, purchase orders, and POS. Keep each directory clean so item setup stays fast.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'categories', label: 'Categories', count: state.categories.length, icon: Tag },
              { key: 'uom', label: 'Units', count: state.unitsOfMeasure.length, icon: Layers3 },
              { key: 'locations', label: 'Locations', count: state.locations.length, icon: MapPin },
            ].map((tab) => {
              const Icon = tab.icon
              const active = catalogTab === tab.key
              return (
                <button
                  key={tab.key}
                  className="btn"
                  onClick={() => setCatalogTab(tab.key as typeof catalogTab)}
                  style={{
                    background: active ? '#3B82F6' : '#F8FBFF',
                    color: active ? '#fff' : '#3B82F6',
                    borderColor: active ? '#3B82F6' : '#D8E4F2',
                    boxShadow: active ? '0 12px 20px rgba(59,130,246,0.18)' : 'none',
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                  <span style={{ padding: '2px 8px', borderRadius: 999, background: active ? 'rgba(255,255,255,0.18)' : '#EAF1FF', fontSize: 11, fontWeight: 800 }}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.92fr) minmax(0, 1.08fr)', gap: 16, alignItems: 'start' }}>
          <div
            className="card"
            style={{
              padding: 18,
              borderRadius: 18,
              background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
              border: '1px solid #D8E4F2',
            }}
          >
            <div className="auth-badge" style={{ marginBottom: 12 }}>
              {catalogTab === 'categories' && <Tag size={14} />}
              {catalogTab === 'uom' && <Layers3 size={14} />}
              {catalogTab === 'locations' && <MapPin size={14} />}
              {catalogTab === 'categories' ? 'Category builder' : catalogTab === 'uom' ? 'Unit builder' : 'Location builder'}
            </div>

            {catalogTab === 'categories' && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
                  <label className="auth-field">
                    <span>Category name</span>
                    <input className="input" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Bakery" />
                  </label>
                  <label className="auth-field">
                    <span>Color</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        className="input"
                        type="color"
                        value={categoryForm.color}
                        onChange={(event) => setCategoryForm((current) => ({ ...current, color: event.target.value }))}
                        style={{ padding: 6, width: 52, height: 48, flex: '0 0 auto' }}
                      />
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{categoryForm.color}</div>
                    </div>
                  </label>
                </div>
                <label className="auth-field">
                  <span>Description</span>
                  <textarea className="input" value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} placeholder="Optional notes for this category" style={{ minHeight: 92, resize: 'none' }} />
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: '#F8FBFF',
                    border: '1px solid #D8E4F2',
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: categoryForm.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{categoryForm.name || 'Preview category'}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{categoryForm.description || 'No description yet'}</div>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleAddCategory}>
                  <Plus size={15} /> Add Category
                </button>
              </div>
            )}

            {catalogTab === 'uom' && (
              <div style={{ display: 'grid', gap: 12 }}>
                <label className="auth-field">
                  <span>Unit name</span>
                  <input className="input" value={uomForm.name} onChange={(event) => setUomForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Bottle" />
                </label>
                <label className="auth-field">
                  <span>Abbreviation</span>
                  <input className="input" value={uomForm.abbreviation} onChange={(event) => setUomForm((current) => ({ ...current, abbreviation: event.target.value }))} placeholder="e.g. btl" />
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: '#F8FBFF',
                    border: '1px solid #D8E4F2',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{uomForm.name || 'Preview unit'}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{uomForm.abbreviation || 'abbreviation'}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unit</div>
                </div>
                <button className="btn btn-primary" onClick={handleAddUom}>
                  <Plus size={15} /> Add UOM
                </button>
              </div>
            )}

            {catalogTab === 'locations' && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                  <label className="auth-field">
                    <span>Code</span>
                    <input className="input" value={locationForm.code} onChange={(event) => setLocationForm((current) => ({ ...current, code: event.target.value }))} placeholder="e.g. WH-A" />
                  </label>
                  <label className="auth-field">
                    <span>Location name</span>
                    <input className="input" value={locationForm.name} onChange={(event) => setLocationForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Main Storage" />
                  </label>
                </div>
                <label className="auth-field">
                  <span>Zone</span>
                  <input className="input" value={locationForm.zone} onChange={(event) => setLocationForm((current) => ({ ...current, zone: event.target.value }))} placeholder="Optional zone or shelf" />
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: '#F8FBFF',
                    border: '1px solid #D8E4F2',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{locationForm.name || 'Preview location'}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {locationForm.code || 'Code'}{locationForm.zone ? ` • ${locationForm.zone}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Store map</div>
                </div>
                <button className="btn btn-primary" onClick={handleAddLocation}>
                  <Plus size={15} /> Add Location
                </button>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 18, borderRadius: 18, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                  {catalogTab === 'categories' ? 'Categories' : catalogTab === 'uom' ? 'Units of Measure' : 'Locations'}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {catalogTab === 'categories'
                    ? 'Use category labels to group similar products together.'
                    : catalogTab === 'uom'
                      ? 'Keep units standardized for cleaner stock and pricing.'
                      : 'Define where stock lives so movements stay accurate.'}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#3B82F6', padding: '8px 12px', borderRadius: 999, background: '#EAF1FF' }}>
                {catalogTab === 'categories'
                  ? `${state.categories.length} total`
                  : catalogTab === 'uom'
                    ? `${state.unitsOfMeasure.length} total`
                    : `${state.locations.length} total`}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
              {catalogTab === 'categories' && (
                state.categories.length === 0 ? (
                  <div style={{ padding: '14px 14px', color: '#64748B', fontSize: 13, borderRadius: 14, background: '#F8FBFF', border: '1px dashed #D8E4F2' }}>
                    No categories yet. Add one to start organizing products.
                  </div>
                ) : state.categories.map((category) => (
                  <div key={category.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px', borderRadius: 16, background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)', border: '1px solid #D8E4F2' }}>
                    <span style={{ width: 13, height: 13, marginTop: 4, borderRadius: '50%', background: category.color, flexShrink: 0, boxShadow: '0 0 0 4px rgba(59,130,246,0.10)' }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{category.name}</div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', background: '#F1F5F9', padding: '4px 8px', borderRadius: 999 }}>{category.color}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{category.description || 'No description'}</div>
                    </div>
                  </div>
                ))
              )}

              {catalogTab === 'uom' && (
                state.unitsOfMeasure.length === 0 ? (
                  <div style={{ padding: '14px 14px', color: '#64748B', fontSize: 13, borderRadius: 14, background: '#F8FBFF', border: '1px dashed #D8E4F2' }}>
                    No units yet. Add common units like pcs, box, or bottle.
                  </div>
                ) : state.unitsOfMeasure.map((unit) => (
                  <div key={unit.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 14px', borderRadius: 16, background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)', border: '1px solid #D8E4F2' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{unit.name}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Used for product variants and stock counts.</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#EAF1FF', padding: '5px 8px', borderRadius: 999 }}>
                      {unit.abbreviation}
                    </div>
                  </div>
                ))
              )}

              {catalogTab === 'locations' && (
                state.locations.length === 0 ? (
                  <div style={{ padding: '14px 14px', color: '#64748B', fontSize: 13, borderRadius: 14, background: '#F8FBFF', border: '1px dashed #D8E4F2' }}>
                    No locations yet. Add your first shelf, storage, or warehouse.
                  </div>
                ) : state.locations.map((location) => (
                  <div key={location.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px', borderRadius: 16, background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)', border: '1px solid #D8E4F2' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: '#EAF7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F766E', flexShrink: 0 }}>
                      <Warehouse size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{location.name}</div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#0F766E', background: '#EAF7F5', padding: '4px 8px', borderRadius: 999 }}>{location.code}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{location.zone || 'No zone assigned'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
