'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Building2, Coins, Factory, Landmark, Layers3, MapPin, Pencil, Plus, Save, Settings as SettingsIcon, Sparkles, Tag, Trash2, Users, Wallet, Warehouse, X } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { getRolePermissions } from '@/lib/access-control'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/timezones'
import type { BusinessType, PaymentAccount, SubscriptionPlan, SubscriptionStatus } from '@/types/database'

function humanize(value: string) {
  if (value === 'retail') return 'Buy & Sell'
  if (value === 'manufacturing') return 'Production'
  return value.replaceAll('_', ' ')
}

function paymentAccountId() {
  return `pa_${Math.random().toString(36).slice(2, 10)}`
}

export default function SettingsPage() {
  const { state, availableTenants, activeTenantId, updateTenant, addCategory, editCategory, deleteCategory, addUnitOfMeasure, editUnitOfMeasure, deleteUnitOfMeasure, addLocation, editLocation, removeLocation, requestDeletion, notifySuccess, notifyError, isSuperAdminIdentity, hydrated } = useDemoSystem()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? 'admin'
  const perms = getRolePermissions(role)
  const canEditPlan = isSuperAdminIdentity
  // Storage locations count toward the plan quota; waste / defect / reject bins
  // are quarantine storage kept separate, so they don't consume plan slots.
  const storageLocations = state.locations.filter((location) => !location.is_waste_location)
  const wasteLocations = state.locations.filter((location) => location.is_waste_location)
  const [catalogTab, setCatalogTab] = useState<'categories' | 'uom' | 'locations'>('categories')
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3B82F6', description: '' })
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [uomForm, setUomForm] = useState({ name: '', abbreviation: '' })
  const [editingUomId, setEditingUomId] = useState<string | null>(null)
  const [locationForm, setLocationForm] = useState({ code: '', name: '', zone: '' })
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; tone: 'danger' | 'warning' | 'info'; onConfirm: () => void }>({ open: false, title: '', message: '', tone: 'danger', onConfirm: () => {} })
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(
    () => state.tenant.payment_accounts ?? []
  )
  const [posStoreLocations, setPosStoreLocations] = useState<string[]>(() => state.tenant.pos_store_locations ?? [])
  const [newStoreLocation, setNewStoreLocation] = useState('')
  const [posStations, setPosStations] = useState<string[]>(() => state.tenant.pos_stations ?? [])
  const [newStation, setNewStation] = useState('')
  // Only re-sync the local form from the tenant when the tenant identity or the
  // initial server load changes — NOT on every tenant field update. Previously the
  // effect ran on every `state.tenant` change, which clobbered unsaved POS
  // location/station edits and made configured values appear to "disappear".
  const syncedKeyRef = useRef('')
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
    const key = `${state.tenant.id}|${hydrated ? 'loaded' : 'pending'}`
    if (syncedKeyRef.current === key) return
    syncedKeyRef.current = key
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
    setPaymentAccounts(state.tenant.payment_accounts ?? [])
    setPosStoreLocations(state.tenant.pos_store_locations ?? [])
    setNewStoreLocation('')
    setPosStations(state.tenant.pos_stations ?? [])
    setNewStation('')
  }, [state.tenant.id, hydrated])

  function handleSave() {
    updateTenant({
      name: form.name,
      business_type: form.business_type as BusinessType,
      currency: form.currency,
      timezone: form.timezone,
      pos_location_id: posStoreLocations[0] ?? null,
      pos_store_locations: posStoreLocations,
      pos_stations: posStations,
      ...(canEditPlan
        ? {
            plan: form.plan as SubscriptionPlan,
            subscription_status: form.subscription_status as SubscriptionStatus,
            max_users: Number(form.max_users) || 1,
            max_products: Number(form.max_products) || 1,
            max_locations: Number(form.max_locations) || 1,
          }
        : {}),
    })
    notifySuccess('Settings saved successfully.')
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

  function handleSaveCategory() {
    if (!categoryForm.name.trim() || !editingCategoryId) return
    editCategory(editingCategoryId, {
      name: categoryForm.name,
      color: categoryForm.color,
      description: categoryForm.description,
    })
    notifySuccess('Category updated successfully.')
    setCategoryForm({ name: '', color: '#3B82F6', description: '' })
    setEditingCategoryId(null)
  }

  function handleEditCategory(categoryId: string) {
    const category = state.categories.find((entry) => entry.id === categoryId)
    if (!category) return
    setCategoryForm({ name: category.name, color: category.color, description: category.description || '' })
    setEditingCategoryId(categoryId)
  }

  function handleCancelEditCategory() {
    setCategoryForm({ name: '', color: '#3B82F6', description: '' })
    setEditingCategoryId(null)
  }

  function handleDeleteCategory(categoryId: string, categoryName: string) {
    setConfirmDialog({
      open: true,
      title: 'Delete category',
      message: `Delete "${categoryName}"? Products using this category will be unassigned. This cannot be undone.`,
      tone: 'danger',
      onConfirm: () => {
        if (!perms.canDeleteRecords) {
          requestDeletion('deleteCategory', 'category', categoryId, { name: categoryName })
          notifySuccess('Deletion request sent to manager for approval.')
          if (editingCategoryId === categoryId) handleCancelEditCategory()
        } else {
          deleteCategory(categoryId)
          if (editingCategoryId === categoryId) handleCancelEditCategory()
          notifySuccess('Category deleted successfully.')
        }
      },
    })
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

  function handleSaveUom() {
    if (!uomForm.name.trim() || !uomForm.abbreviation.trim() || !editingUomId) return
    editUnitOfMeasure(editingUomId, {
      name: uomForm.name,
      abbreviation: uomForm.abbreviation,
    })
    notifySuccess('Unit updated successfully.')
    setUomForm({ name: '', abbreviation: '' })
    setEditingUomId(null)
  }

  function handleEditUom(uomId: string) {
    const uom = state.unitsOfMeasure.find((entry) => entry.id === uomId)
    if (!uom) return
    setUomForm({ name: uom.name, abbreviation: uom.abbreviation })
    setEditingUomId(uomId)
  }

  function handleCancelEditUom() {
    setUomForm({ name: '', abbreviation: '' })
    setEditingUomId(null)
  }

  function handleDeleteUom(uomId: string, uomName: string) {
    setConfirmDialog({
      open: true,
      title: 'Delete unit',
      message: `Delete "${uomName}"? Products using this unit will be unassigned. This cannot be undone.`,
      tone: 'danger',
      onConfirm: () => {
        if (!perms.canDeleteRecords) {
          requestDeletion('deleteUnitOfMeasure', 'unit_of_measure', uomId, { name: uomName })
          notifySuccess('Deletion request sent to manager for approval.')
          if (editingUomId === uomId) handleCancelEditUom()
        } else {
          deleteUnitOfMeasure(uomId)
          if (editingUomId === uomId) handleCancelEditUom()
          notifySuccess('Unit deleted successfully.')
        }
      },
    })
  }

  function handleSaveLocation() {
    if (!locationForm.name.trim()) return
    const draft = {
      code: locationForm.code,
      name: locationForm.name,
      zone: locationForm.zone,
    }
    if (editingLocationId) {
      editLocation(editingLocationId, draft)
      notifySuccess('Location updated successfully.')
    } else {
      const limit = Number(state.tenant.max_locations ?? 0)
      if (storageLocations.length >= limit) {
        notifyError(`Data cannot be loaded due to Plan package limitation. Your ${state.tenant.plan} plan allows up to ${limit} locations.`)
        return
      }
      addLocation(draft)
      notifySuccess('Location added successfully.')
    }
    setLocationForm({ code: '', name: '', zone: '' })
    setEditingLocationId(null)
  }

  function handleEditLocation(locationId: string) {
    const location = state.locations.find((entry) => entry.id === locationId)
    if (!location) return
    setLocationForm({ code: location.code, name: location.name, zone: location.zone ?? '' })
    setEditingLocationId(locationId)
    const locationsPanel = document.querySelector('[data-locations-builder]')
    locationsPanel?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleCancelEditLocation() {
    setLocationForm({ code: '', name: '', zone: '' })
    setEditingLocationId(null)
  }

  function handleDeleteLocation(locationId: string, locationName: string) {
    setConfirmDialog({
      open: true,
      title: 'Delete location',
      message: `Delete "${locationName}"? Stock tied to it will be unassigned. This cannot be undone.`,
      tone: 'danger',
      onConfirm: () => {
        if (!perms.canDeleteRecords) {
          requestDeletion('deleteLocation', 'location', locationId, { name: locationName })
          notifySuccess('Deletion request sent to manager for approval.')
          if (editingLocationId === locationId) handleCancelEditLocation()
        } else {
          removeLocation(locationId)
          if (editingLocationId === locationId) handleCancelEditLocation()
          notifySuccess('Location deleted successfully.')
        }
      },
    })
  }

  function handleSavePayments() {
    updateTenant({
      payment_accounts: paymentAccounts.map((account) => ({
        ...account,
        label: account.label.trim(),
        account: account.account.trim(),
      })),
    })
    notifySuccess('Payment accounts saved successfully.')
  }

  function updatePaymentAccount(accountId: string, patch: Partial<PaymentAccount>) {
    setPaymentAccounts((current) => current.map((account) => (account.id === accountId ? { ...account, ...patch } : account)))
  }

  async function handleQrUpload(accountId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('tenantId', state.tenant.id)
      body.append('method', accountId)
      const response = await fetch('/api/tenant/payment-qr', { method: 'POST', body })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}) as { error?: string })
        throw new Error(error.error || 'Upload failed')
      }
      const data = (await response.json()) as { url: string }
      updatePaymentAccount(accountId, { qr_url: data.url })
      updateTenant({
        payment_accounts: paymentAccounts.map((account) =>
          account.id === accountId ? { ...account, qr_url: data.url } : account
        ),
      })
      notifySuccess('QR image uploaded and saved.')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      event.target.value = ''
    }
  }

  async function handleBilling() {
    const el = document.getElementById('billing')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }
  void handleBilling

  const overviewCards = [
    { label: 'Plan', value: state.tenant.plan, icon: Coins, color: '#3B82F6' },
    { label: 'Business type', value: humanize(state.tenant.business_type), icon: Building2, color: '#8B5CF6' },
    { label: 'Users', value: `${state.users.length}/${state.tenant.max_users}`, icon: Users, color: '#10B981' },
    { label: 'Products', value: `${state.products.length}/${state.tenant.max_products}`, icon: Layers3, color: '#F59E0B' },
    { label: 'Locations', value: `${storageLocations.length}/${state.tenant.max_locations}`, icon: Warehouse, color: '#0F766E' },
    { label: 'Quarantine bins', value: String(wasteLocations.length), icon: AlertTriangle, color: '#DC2626' },
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
            <a href="/dashboard/billing" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <SettingsIcon size={15} /> Manage billing
            </a>
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

      <section className="settings-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 16, alignItems: 'start' }}>
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
              <SearchableSelect
                className="input"
                placeholder="Business type"
                searchPlaceholder="Search types..."
                value={form.business_type}
                onChange={(value) => setForm((current) => ({ ...current, business_type: value as BusinessType }))}
                options={[
                  { value: 'retail', label: 'Buy & Sell' },
                  { value: 'manufacturing', label: 'Production' },
                ]}
              />
            </label>
            <label className="auth-field">
              <span>Plan</span>
              {canEditPlan ? (
                <SearchableSelect
                  className="input"
                  placeholder="Plan"
                  searchPlaceholder="Search plans..."
                  value={form.plan}
                  onChange={(value) => setForm((current) => ({ ...current, plan: value as SubscriptionPlan }))}
                  options={[
                    { value: 'starter', label: 'Starter' },
                    { value: 'professional', label: 'Professional' },
                    { value: 'enterprise', label: 'Enterprise' },
                  ]}
                />
              ) : (
                <div className="input" style={{ background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center' }}>
                  {form.plan.charAt(0).toUpperCase() + form.plan.slice(1)} (set by your provider)
                </div>
              )}
            </label>
            <label className="auth-field">
              <span>Status</span>
              {canEditPlan ? (
                <SearchableSelect
                  className="input"
                  placeholder="Status"
                  searchPlaceholder="Search statuses..."
                  value={form.subscription_status}
                  onChange={(value) => setForm((current) => ({ ...current, subscription_status: value as SubscriptionStatus }))}
                  options={[
                    { value: 'trial', label: 'Trial' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'suspended', label: 'Suspended' },
                  ]}
                />
              ) : (
                <div className="input" style={{ background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center' }}>
                  {form.subscription_status.charAt(0).toUpperCase() + form.subscription_status.slice(1)}
                </div>
              )}
            </label>
            <label className="auth-field">
              <span>Currency</span>
              <input className="input" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} placeholder="Currency" />
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
              />
            </label>
          </div>

          <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Plan limits</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {canEditPlan ? 'Adjust only if you need to override a subscription test case.' : 'These limits are set by your provider and cannot be changed.'}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <label className="auth-field">
                <span>Max users</span>
                <input className="input" type="number" value={form.max_users} readOnly={!canEditPlan} disabled={!canEditPlan} onChange={(event) => setForm((current) => ({ ...current, max_users: event.target.value }))} />
              </label>
              <label className="auth-field">
                <span>Max products</span>
                <input className="input" type="number" value={form.max_products} readOnly={!canEditPlan} disabled={!canEditPlan} onChange={(event) => setForm((current) => ({ ...current, max_products: event.target.value }))} />
              </label>
              <label className="auth-field">
                <span>Max locations</span>
                <input className="input" type="number" value={form.max_locations} readOnly={!canEditPlan} disabled={!canEditPlan} onChange={(event) => setForm((current) => ({ ...current, max_locations: event.target.value }))} />
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
            Usage this workspace
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Current state</h3>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.6 }}>
            Quick view of what’s active in the workspace today. Full billing is below.
          </p>

          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {[
              { label: 'Plan', value: state.tenant.plan, color: '#3B82F6' },
              { label: 'Subscription', value: state.tenant.subscription_status, color: '#10B981' },
              { label: 'Users used', value: `${state.users.length}/${state.tenant.max_users}`, color: '#8B5CF6' },
              { label: 'Products used', value: `${state.products.length}/${state.tenant.max_products}`, color: '#F59E0B' },
              { label: 'Locations used', value: `${storageLocations.length}/${state.tenant.max_locations}`, color: '#0F766E' },
              { label: 'Quarantine bins', value: String(wasteLocations.length), color: '#DC2626' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: item.color, textTransform: 'capitalize' }}>{item.value}</div>
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
          <Wallet size={14} /> Direct payment accounts
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Direct payment accounts</h3>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.6 }}>
          Add whatever e-wallets and bank accounts your store uses (GCash, Maya, BDO, UnionBank, GoTyme, …). E-wallets and online banks use a number/ID; banks use a bank account number. Each account can show a &quot;Scan this to pay&quot; QR at the POS. These are manual tenders recorded by the sales staff — no third-party gateway is involved.
        </p>

        <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
          {paymentAccounts.map((account) => {
            const Icon = account.kind === 'bank' ? Landmark : Wallet
            return (
              <div key={account.id} style={{ padding: 16, borderRadius: 16, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{account.label || 'New account'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentAccounts((current) => current.filter((entry) => entry.id !== account.id))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}
                    title="Remove account"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>

                <div className="settings-grid-fixed" style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
                  <label className="auth-field" style={{ marginBottom: 0 }}>
                    <span>Account name</span>
                    <input
                      className="input"
                      value={account.label}
                      onChange={(event) => updatePaymentAccount(account.id, { label: event.target.value })}
                      placeholder="e.g. GCash, BDO, UnionBank"
                    />
                  </label>
                  <label className="auth-field" style={{ marginBottom: 0 }}>
                    <span>Type</span>
                    <select
                      className="input"
                      value={account.kind}
                      onChange={(event) => updatePaymentAccount(account.id, { kind: event.target.value as PaymentAccount['kind'] })}
                      style={{ height: 42, borderRadius: 12 }}
                    >
                      <option value="ewallet">E-wallet / Online</option>
                      <option value="bank">Bank account</option>
                    </select>
                  </label>
                </div>

                <label className="auth-field" style={{ marginTop: 10 }}>
                  <span>{account.kind === 'bank' ? 'Bank account number' : 'Account number / ID'}</span>
                  <input
                    className="input"
                    value={account.account}
                    onChange={(event) => updatePaymentAccount(account.id, { account: event.target.value })}
                    placeholder={account.kind === 'bank' ? 'e.g. 0123 4567 8901' : 'e.g. 0917 123 4567'}
                  />
                </label>

                <label className="auth-field" style={{ marginTop: 10 }}>
                  <span>QR image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) => handleQrUpload(account.id, event)}
                    className="input"
                    style={{ padding: 6, fontSize: 12 }}
                  />
                </label>
                {account.qr_url ? (
                  <div style={{ marginTop: 10, textAlign: 'center', position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={account.qr_url}
                      alt={`${account.label} QR code`}
                      style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0' }}
                    />
                    <button
                      type="button"
                      onClick={() => updatePaymentAccount(account.id, { qr_url: null })}
                      style={{ marginTop: 8, fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}

          {paymentAccounts.length === 0 && (
            <div style={{ padding: '14px 14px', color: '#64748B', fontSize: 13, borderRadius: 14, background: '#F8FBFF', border: '1px dashed #D8E4F2' }}>
              No payment accounts yet. Add your first e-wallet or bank account below.
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setPaymentAccounts((current) => [...current, { id: paymentAccountId(), label: '', kind: 'ewallet', account: '', qr_url: null }])}
          style={{ marginTop: 14 }}
        >
          <Plus size={15} /> Add payment account
        </button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSavePayments}>
            <Save size={15} /> Save payment accounts
          </button>
        </div>
      </section>

      <section className="card" style={{ padding: 20, borderRadius: 20 }}>
        <div className="auth-badge" style={{ marginBottom: 10 }}>
          <MapPin size={14} /> Point of Sale configuration
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>POS location and stations</h3>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.6 }}>
          Define the dedicated store location used by the POS (separate from inventory warehouses) and the available sales staff stations or bays.
        </p>

        <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
          <label className="auth-field">
            <span>Store locations (POS sales)</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                className="input"
                value={newStoreLocation}
                onChange={(event) => setNewStoreLocation(event.target.value)}
                placeholder="e.g. Main Store, Branch A"
                style={{ flex: 1, height: 42, borderRadius: 12 }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const value = newStoreLocation.trim()
                    if (value && !posStoreLocations.includes(value)) {
                      setPosStoreLocations((current) => [...current, value])
                      setNewStoreLocation('')
                    }
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const value = newStoreLocation.trim()
                  if (value && !posStoreLocations.includes(value)) {
                    setPosStoreLocations((current) => [...current, value])
                    setNewStoreLocation('')
                  }
                }}
                style={{ height: 42, borderRadius: 12 }}
              >
                Add
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>These appear as a dropdown when opening a shift. Kept separate from inventory locations.</div>
          </label>

          {posStoreLocations.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {posStoreLocations.map((storeLocation) => (
                <span
                  key={storeLocation}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {storeLocation}
                  <button
                    type="button"
                    onClick={() => setPosStoreLocations((current) => current.filter((item) => item !== storeLocation))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857', padding: 0, display: 'inline-flex', lineHeight: 1 }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <label className="auth-field">
            <span>Stations / Bays</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                className="input"
                value={newStation}
                onChange={(event) => setNewStation(event.target.value)}
                placeholder="e.g. Bay 1, Register A"
                style={{ flex: 1, height: 42, borderRadius: 12 }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const value = newStation.trim()
                    if (value && !posStations.includes(value)) {
                      setPosStations((current) => [...current, value])
                      setNewStation('')
                    }
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const value = newStation.trim()
                  if (value && !posStations.includes(value)) {
                    setPosStations((current) => [...current, value])
                    setNewStation('')
                  }
                }}
                style={{ height: 42, borderRadius: 12 }}
              >
                Add
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>These appear as a dropdown when opening a shift.</div>
          </label>

          {posStations.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {posStations.map((station) => (
                <span
                  key={station}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: '#EFF6FF',
                    color: '#2563EB',
                    border: '1px solid #BFDBFE',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {station}
                  <button
                    type="button"
                    onClick={() => setPosStations((current) => current.filter((item) => item !== station))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', padding: 0, display: 'inline-flex', lineHeight: 1 }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={15} /> Save locations and stations
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

        <div className="settings-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.92fr) minmax(0, 1.08fr)', gap: 16, alignItems: 'start' }}>
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
                <div className="settings-grid-fixed" style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
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
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={editingCategoryId ? handleSaveCategory : handleAddCategory}>
                    {editingCategoryId ? <><Save size={15} /> Save Changes</> : <><Plus size={15} /> Add Category</>}
                  </button>
                  {editingCategoryId && (
                    <button className="btn btn-ghost" onClick={handleCancelEditCategory}>
                      <X size={15} /> Cancel
                    </button>
                  )}
                </div>
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
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={editingUomId ? handleSaveUom : handleAddUom}>
                    {editingUomId ? <><Save size={15} /> Save Changes</> : <><Plus size={15} /> Add UOM</>}
                  </button>
                  {editingUomId && (
                    <button className="btn btn-ghost" onClick={handleCancelEditUom}>
                      <X size={15} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            {catalogTab === 'locations' && (
               <div data-locations-builder style={{ display: 'grid', gap: 12 }}>
                <div className="settings-grid-fixed" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                  <label className="auth-field">
                    <span>Code <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span></span>
                    <input className="input" value={locationForm.code} onChange={(event) => setLocationForm((current) => ({ ...current, code: event.target.value }))} placeholder="Auto from name (e.g. WH-A)" />
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
                  <div style={{ fontSize: 11, fontWeight: 800, color: editingLocationId ? '#F59E0B' : '#0F766E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{editingLocationId ? 'Editing' : 'Store map'}</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={handleSaveLocation}>
                    {editingLocationId ? <><Save size={15} /> Save Changes</> : <><Plus size={15} /> Add Location</>}
                  </button>
                  {editingLocationId && (
                    <button className="btn btn-ghost" onClick={handleCancelEditLocation}>
                      <X size={15} /> Cancel
                    </button>
                  )}
                </div>
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
                    : `${storageLocations.length} storage · ${wasteLocations.length} quarantine`}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleEditCategory(category.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0F172A', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#EAF1FF', padding: '5px 8px', borderRadius: 999 }}>
                        {unit.abbreviation}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEditUom(unit.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0F172A', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUom(unit.id, unit.name)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
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
                  <div key={location.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px', borderRadius: 16, background: editingLocationId === location.id ? 'linear-gradient(180deg, #FFF7ED 0%, #FFFBF5 100%)' : 'linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)', border: editingLocationId === location.id ? '1px solid #FED7AA' : '1px solid #D8E4F2' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: '#EAF7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F766E', flexShrink: 0 }}>
                      <Warehouse size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{location.name}</div>
                        {location.is_waste_location ? (
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', padding: '4px 8px', borderRadius: 999 }}>Quarantine</span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#0F766E', background: '#EAF7F5', padding: '4px 8px', borderRadius: 999 }}>{location.code}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{location.zone || 'No zone assigned'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleEditLocation(location.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0F172A', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(location.id, location.name)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        tone={confirmDialog.tone}
        onConfirm={() => {
          confirmDialog.onConfirm()
          setConfirmDialog((current) => ({ ...current, open: false }))
        }}
        onCancel={() => setConfirmDialog((current) => ({ ...current, open: false }))}
      />
    </div>
  )
}
