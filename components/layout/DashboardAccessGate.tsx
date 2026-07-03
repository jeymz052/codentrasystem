'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDemoSystem } from '@/components/demo-system-provider'
import { canAccessDashboardPath } from '@/lib/access-control'

export function DashboardAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { hydrated, state, availableTenants, activeTenantId } = useDemoSystem()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? 'cashier'

  useEffect(() => {
    if (!hydrated) return
    if (!canAccessDashboardPath(role, pathname)) {
      router.replace('/dashboard')
    }
  }, [hydrated, pathname, role, router])

  if (!hydrated) return null
  if (!canAccessDashboardPath(role, pathname)) return null

  return children
}
