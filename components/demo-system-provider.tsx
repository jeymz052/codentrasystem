'use client'

import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import {
  addOrUpdateProduct,
  acknowledgeAlert,
  computeDashboardStats,
  createPurchaseOrder,
  createSupplier,
  createUser,
  deleteProduct,
  deleteSupplier,
  formatCurrency,
  importProducts,
  normalizeBusinessType,
  receivePurchaseOrder,
  recordSale,
  remapStateTenantId,
  resolveAlert,
  seedDemoSystem,
  toggleUserActive,
  updateSupplier,
  updateTenantSettings,
  type DemoSystemState,
  type ProductDraft,
  type PurchaseOrderDraft,
  type SaleDraftItem,
  type SupplierDraft,
  type UserDraft,
} from '@/lib/demo-system'
import type { AccessibleTenant, BusinessType, PaymentMethod } from '@/types/database'
import { createClient } from '@/lib/supabase'

const STORAGE_KEY = 'codentra.demo-cache.v3'
const ACTIVE_TENANT_KEY = 'codentra.active-tenant.v3'

type SystemApiResponse = {
  state: DemoSystemState
  activeTenantId: string
  availableTenants: AccessibleTenant[]
}

type DemoSystemContextValue = {
  hydrated: boolean
  state: DemoSystemState
  availableTenants: AccessibleTenant[]
  activeTenantId: string
  authUserEmail: string | null
  isSuperAdminIdentity: boolean
  stats: ReturnType<typeof computeDashboardStats>
  resetDemo: (businessType?: BusinessType) => void
  updateTenant: (patch: Partial<DemoSystemState['tenant']> & { business_type?: BusinessType }) => void
  saveProduct: (draft: ProductDraft, productId?: string) => void
  removeProduct: (productId: string) => void
  importProductRows: (drafts: ProductDraft[]) => void
  addSupplier: (draft: SupplierDraft) => void
  editSupplier: (supplierId: string, draft: SupplierDraft) => void
  removeSupplier: (supplierId: string) => void
  addUser: (draft: UserDraft) => void
  toggleUser: (userId: string) => void
  createPO: (draft: PurchaseOrderDraft) => void
  receivePO: (purchaseOrderId: string) => void
  completeSale: (payload: { payment_method: PaymentMethod; payment_provider?: string; payment_reference?: string | null; amount_tendered: number; location_id: string | null; notes?: string; items: SaleDraftItem[] }) => { receiptNumber: string }
  acknowledge: (alertId: string) => void
  resolve: (alertId: string) => void
  switchTenant: (tenantId: string) => Promise<void>
  signOut: () => Promise<void>
  formatCurrency: (amount: number) => string
}

const DemoSystemContext = createContext<DemoSystemContextValue | null>(null)

function loadCachedState(): DemoSystemState {
  if (typeof window === 'undefined') return seedDemoSystem()

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return seedDemoSystem()

  try {
    const parsed = JSON.parse(raw) as DemoSystemState
    return {
      ...seedDemoSystem(normalizeBusinessType(parsed.tenant?.business_type)),
      ...parsed,
      tenant: {
        ...seedDemoSystem(normalizeBusinessType(parsed.tenant?.business_type)).tenant,
        ...parsed.tenant,
        business_type: normalizeBusinessType(parsed.tenant?.business_type),
      },
    }
  } catch {
    return seedDemoSystem()
  }
}

async function fetchRemoteState(tenantId?: string | null) {
  const url = tenantId ? `/api/system?tenantId=${encodeURIComponent(tenantId)}` : '/api/system'
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || 'Failed to load system state')
  }
  return (await response.json()) as SystemApiResponse
}

async function postMutation(tenantId: string, body: Record<string, unknown>) {
  const response = await fetch('/api/system', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, ...body }),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Failed to save changes')
  }
  return (await response.json()) as SystemApiResponse
}

export function DemoSystemProvider({ children, initialTenantId, authUserEmail = null, isSuperAdminIdentity = false }: PropsWithChildren<{ initialTenantId?: string; authUserEmail?: string | null; isSuperAdminIdentity?: boolean }>) {
  const [state, setState] = useState<DemoSystemState>(() => seedDemoSystem())
  const [availableTenants, setAvailableTenants] = useState<AccessibleTenant[]>([])
  const [activeTenantId, setActiveTenantId] = useState<string>('')
  const [hydrated, setHydrated] = useState(false)
  const supabase = createClient()
  const requestIdRef = useRef(0)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const cachedTenantId = window.localStorage.getItem(ACTIVE_TENANT_KEY)
        const remote = await fetchRemoteState(initialTenantId ?? cachedTenantId)
        if (!mounted) return
        setState(remote.state)
        setAvailableTenants(remote.availableTenants)
        setActiveTenantId(remote.activeTenantId)
        window.localStorage.setItem(ACTIVE_TENANT_KEY, remote.activeTenantId)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.state))
      } catch {
        if (!mounted) return
        const cached = loadCachedState()
        setState(cached)
        setAvailableTenants([{
          id: cached.tenant.id,
          name: cached.tenant.name,
          business_type: cached.tenant.business_type,
          plan: cached.tenant.plan,
          subscription_status: cached.tenant.subscription_status,
          role: isSuperAdminIdentity ? 'super_admin' : 'admin',
          is_default: true,
        }])
        setActiveTenantId(cached.tenant.id)
      } finally {
        if (mounted) setHydrated(true)
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.localStorage.setItem(ACTIVE_TENANT_KEY, activeTenantId || state.tenant.id)
  }, [hydrated, state, activeTenantId])

  function sync<T>(optimistic: (current: DemoSystemState) => DemoSystemState, mutation: Record<string, unknown>) {
    requestIdRef.current += 1
    const currentRequest = requestIdRef.current
    const tenantId = state.tenant.id
    setState((current) => {
      return optimistic(current)
    })

    void postMutation(tenantId, mutation)
      .then((remote) => {
        if (currentRequest === requestIdRef.current) {
          setState(remote.state)
          setAvailableTenants(remote.availableTenants)
          setActiveTenantId(remote.activeTenantId)
        }
      })
      .catch(() => {
        void fetchRemoteState(tenantId)
          .then((remote) => {
            if (currentRequest === requestIdRef.current) {
              setState(remote.state)
              setAvailableTenants(remote.availableTenants)
              setActiveTenantId(remote.activeTenantId)
            }
          })
          .catch(() => {
            // Keep optimistic state if the network is unavailable.
          })
      })
  }

  const value: DemoSystemContextValue = {
    hydrated,
    state,
    availableTenants,
    activeTenantId,
    authUserEmail,
    isSuperAdminIdentity,
    stats: computeDashboardStats(state),
    resetDemo: (businessType = state.tenant.business_type) => sync(
      (current) => remapStateTenantId(seedDemoSystem(businessType), current.tenant.id),
      { action: 'resetDemo', businessType }
    ),
    updateTenant: (patch) => sync(
      (current) => updateTenantSettings(current, patch),
      { action: 'updateTenant', patch }
    ),
    saveProduct: (draft, productId) => sync(
      (current) => addOrUpdateProduct(current, draft, productId),
      { action: 'saveProduct', draft, productId }
    ),
    removeProduct: (productId) => sync(
      (current) => deleteProduct(current, productId),
      { action: 'removeProduct', productId }
    ),
    importProductRows: (drafts) => sync(
      (current) => importProducts(current, drafts),
      { action: 'importProductRows', drafts }
    ),
    addSupplier: (draft) => sync(
      (current) => createSupplier(current, draft),
      { action: 'addSupplier', draft }
    ),
    editSupplier: (supplierId, draft) => sync(
      (current) => updateSupplier(current, supplierId, draft),
      { action: 'editSupplier', supplierId, draft }
    ),
    removeSupplier: (supplierId) => sync(
      (current) => deleteSupplier(current, supplierId),
      { action: 'removeSupplier', supplierId }
    ),
    addUser: (draft) => sync(
      (current) => createUser(current, draft),
      { action: 'addUser', draft }
    ),
    toggleUser: (userId) => sync(
      (current) => toggleUserActive(current, userId),
      { action: 'toggleUser', userId }
    ),
    createPO: (draft) => sync(
      (current) => createPurchaseOrder(current, draft),
      { action: 'createPO', draft }
    ),
    receivePO: (purchaseOrderId) => sync(
      (current) => receivePurchaseOrder(current, purchaseOrderId),
      { action: 'receivePO', purchaseOrderId }
    ),
    completeSale: (payload) => {
      const local = recordSale(state, payload)
      sync(
        () => local.state,
        { action: 'completeSale', payload: { ...payload, receiptNumber: local.receiptNumber } }
      )
      return { receiptNumber: local.receiptNumber }
    },
    acknowledge: (alertId) => sync(
      (current) => acknowledgeAlert(current, alertId),
      { action: 'acknowledge', alertId }
    ),
    resolve: (alertId) => sync(
      (current) => resolveAlert(current, alertId),
      { action: 'resolve', alertId }
    ),
    switchTenant: async (tenantId: string) => {
      const response = await fetch('/api/session/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })
      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to switch tenant')
      }

      const remote = await fetchRemoteState(tenantId)
      setState(remote.state)
      setAvailableTenants(remote.availableTenants)
      setActiveTenantId(remote.activeTenantId)
      window.localStorage.setItem(ACTIVE_TENANT_KEY, remote.activeTenantId)
    },
    signOut: async () => {
      await supabase.auth.signOut()
      window.localStorage.removeItem(ACTIVE_TENANT_KEY)
      window.localStorage.removeItem(STORAGE_KEY)
      window.location.href = '/sign-in'
    },
    formatCurrency,
  }

  return <DemoSystemContext.Provider value={value}>{children}</DemoSystemContext.Provider>
}

export function useDemoSystem() {
  const context = useContext(DemoSystemContext)
  if (!context) {
    throw new Error('useDemoSystem must be used within DemoSystemProvider')
  }

  return context
}
