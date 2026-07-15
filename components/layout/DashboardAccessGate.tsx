'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDemoSystem } from '@/components/demo-system-provider'
import { canAccessDashboardPath, defaultPathForRole } from '@/lib/access-control'

export function DashboardAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { hydrated, state, availableTenants, activeTenantId, isSuperAdminIdentity } = useDemoSystem()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? (isSuperAdminIdentity ? 'super_admin' : 'admin')

  useEffect(() => {
    if (!hydrated) return
    if (!canAccessDashboardPath(role, pathname)) {
      router.replace(defaultPathForRole(role))
    }
  }, [hydrated, pathname, role, router])

  if (!hydrated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8FBFF' }}>
        <div style={{ fontSize: 14, color: '#64748B' }}>Loading...</div>
      </div>
    )
  }

  if (!canAccessDashboardPath(role, pathname)) return null

  return children
}
