'use client'

import { useDemoSystem } from '@/components/demo-system-provider'
import { BillingPanel } from '@/components/billing/BillingPanel'

export default function BillingPage() {
  const { state, availableTenants, activeTenantId, notifySuccess, notifyError, isSuperAdminIdentity } = useDemoSystem()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? 'admin'
  const canManageBilling = role === 'admin' || role === 'super_admin' || isSuperAdminIdentity

  return (
    <div style={{ padding: '28px 24px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', margin: 0 }}>Billing</h1>
        </div>
        <p style={{ color: '#475569', fontSize: 14, maxWidth: 760, lineHeight: 1.6 }}>
          Manage your subscription, plan, payment method, and billing history.
        </p>
      </div>

      <BillingPanel
        tenantId={state.tenant.id}
        canManage={canManageBilling}
        notifySuccess={notifySuccess}
        notifyError={notifyError}
      />
    </div>
  )
}
