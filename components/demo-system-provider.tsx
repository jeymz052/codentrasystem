'use client'

import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { CheckCircle2, X, AlertTriangle } from 'lucide-react'
import {
  addOrUpdateProduct,
  acknowledgeAlert,
  closeShift,
  computeDashboardStats,
  createCategory,
  createPurchaseOrder,
  createLocation,
  createUnitOfMeasure,
  deleteLocation,
  updateLocation,
  createSupplier,
  createUser,
  cancelPurchaseOrder,
  deleteProduct,
  deleteProducts,
  deleteSupplier,
  deleteSuppliers,
  formatCurrency,
  id,
  importProducts,
  normalizeBusinessType,
  openShift,
  receivePurchaseOrder,
  recordCashMovement,
  recordSale,
  recordWaste,
  reverseWaste,
  editWaste,
  remapStateTenantId,
  resolveAlert,
  seedDemoSystem,
  toggleUserActive,
  updatePurchaseOrder,
  updateSupplier,
  updateTenantSettings,
  updateUser,
  markInviteResent,
  voidTransaction,
  refundTransaction,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  createProductionTemplate,
  deleteProductionTemplate,
  produceFinishedGood,
  createTransfer,
  type DemoSystemState,
  type CategoryDraft,
  type LocationDraft,
  type ProductDraft,
  type PurchaseOrderDraft,
  type SaleDraftItem,
  type SupplierDraft,
  type UnitOfMeasureDraft,
  type UserDraft,
} from '@/lib/demo-system'
import type { AccessibleTenant, BusinessType, PaymentMethod, UserRole } from '@/types/database'
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
  addCategory: (draft: CategoryDraft) => void
  addUnitOfMeasure: (draft: UnitOfMeasureDraft) => void
  addLocation: (draft: LocationDraft) => void
  editLocation: (locationId: string, draft: LocationDraft) => void
  removeLocation: (locationId: string) => void
  saveProduct: (draft: ProductDraft, productId?: string) => void
  removeProduct: (productId: string) => void
  removeProducts: (productIds: string[]) => void
  removeSuppliers: (supplierIds: string[]) => void
  importProductRows: (drafts: ProductDraft[]) => void
  addSupplier: (draft: SupplierDraft) => void
  editSupplier: (supplierId: string, draft: SupplierDraft) => void
  removeSupplier: (supplierId: string) => void
  addUser: (draft: UserDraft) => void
  editUser: (userId: string, draft: { full_name: string; email: string; role: UserRole }) => void
  toggleUser: (userId: string) => void
  resendInvite: (draft: UserDraft) => void
  createRecipe: (finishedGoodId: string, ingredientId: string, quantityPerUnit: number, uomId?: string | null) => void
  updateRecipe: (recipeId: string, quantityPerUnit: number, uomId?: string | null) => void
  deleteRecipe: (recipeId: string) => void
  createProductionTemplate: (draft: { name: string; finishedGoodId: string; quantity: number; locationId?: string | null; notes?: string | null }) => void
  deleteProductionTemplate: (templateId: string) => void
  produceFinishedGood: (finishedGoodId: string, quantity: number, locationId?: string | null) => void
  createPO: (draft: PurchaseOrderDraft) => void
  receivePO: (purchaseOrderId: string) => void
  updatePO: (purchaseOrderId: string, draft: PurchaseOrderDraft) => void
  cancelPO: (purchaseOrderId: string) => void
  completeSale: (payload: { payment_method: PaymentMethod; payment_provider?: string; payment_reference?: string | null; amount_tendered: number; location_id: string | null; notes?: string; items: SaleDraftItem[] }) => { receiptNumber: string; transactionId: string }
  voidSale: (transactionId: string, reason?: string) => void
  refundSale: (transactionId: string, reason?: string) => void
  openShift: (payload: { openingFloat: number; locationId?: string | null; notes?: string; station?: string | null }) => void
  closeShift: (shiftId: string, countedCash: number, notes?: string) => void
  recordCashMovement: (shiftId: string, kind: 'cash_in' | 'cash_out' | 'denomination_adjustment', amount: number, note?: string | null, denominations?: Record<string, number> | null) => void
  acknowledge: (alertId: string) => void
  resolve: (alertId: string) => void
  recordWaste: (productId: string, wasteType: 'waste' | 'defect' | 'reject', quantity: number, reason?: string) => void
  reverseWaste: (movementId: string) => void
  editWaste: (movementId: string, draft: { wasteType: 'waste' | 'defect' | 'reject'; quantity: number; reason?: string }) => void
  transferStock: (payload: { productId: string; fromLocationId: string | null; toLocationId: string | null; quantity: number; notes?: string }) => void
  switchTenant: (tenantId: string) => Promise<void>
  signOut: () => Promise<void>
  formatCurrency: (amount: number) => string
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
}

const DemoSystemContext = createContext<DemoSystemContextValue | null>(null)

// Union two id-keyed arrays keeping the local (optimistic) record on id match
// and appending any remote-only record. Used so optimistic stock movements /
// lots are never dropped when a stale server snapshot arrives.
function mergeArray<T extends { id: string }>(localItems: T[], remoteItems: T[]): T[] {
  const localById = new Map(localItems.map((item) => [item.id, item]))
  const merged = [...localItems]
  for (const remoteItem of remoteItems) {
    if (!localById.has(remoteItem.id)) {
      merged.push(remoteItem)
    }
  }
  return merged
}

// Products are reconciled by item_code (the real business key), not just id.
// A client optimistic product and its server-persisted twin can carry different
// random ids (e.g. imported items), which would otherwise both survive a plain
// id merge and show up as duplicates / "come back" after a delete. Here the
// server record wins for a shared item_code, and any client-only duplicate is
// dropped — so deleting by item_code on the server leaves the list empty.
type ProductLike = { id: string; item_code?: string | null }
function mergeProducts<T extends ProductLike>(localItems: T[], remoteItems: T[]): T[] {
  const keyFor = (item: ProductLike) => {
    const code = String(item.item_code ?? '').trim().toLowerCase()
    return code ? `code:${code}` : `id:${item.id}`
  }
  const result = new Map<string, T>()
  for (const item of remoteItems) result.set(keyFor(item), item)
  for (const item of localItems) {
    const key = keyFor(item)
    if (!result.has(key)) result.set(key, item)
  }
  return Array.from(result.values())
}

// Users need special handling: when a user is invited, the optimistic local row
// gets a temporary random id while the server persists the row with the real
// Supabase auth-user id. A plain id-based merge would keep both and show a
// duplicate. The server is authoritative, so prefer remote rows and only keep
// local rows that have no remote match by id OR email.
function mergeUsers<T extends { id: string; email: string }>(localItems: T[], remoteItems: T[]): T[] {
  const remoteIds = new Set(remoteItems.map((item) => item.id))
  const remoteEmails = new Set(remoteItems.map((item) => item.email.trim().toLowerCase()))
  const localOnly = localItems.filter(
    (item) => !remoteIds.has(item.id) && !remoteEmails.has(item.email.trim().toLowerCase())
  )
  return [...remoteItems, ...localOnly]
}

type FeedbackItem = {
  id: string
  kind: 'success' | 'error'
  message: string
}

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
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const supabase = createClient()
  const requestIdRef = useRef(0)
  const feedbackIdRef = useRef(0)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const cachedTenantId = window.localStorage.getItem(ACTIVE_TENANT_KEY)
        const remote = await fetchRemoteState(initialTenantId ?? cachedTenantId)
        if (!mounted) return
        // Don't clobber local state if the user already started mutating it
        // while this initial load was still in flight (e.g. marking a PO
        // received). Otherwise the late snapshot would reset the record back
        // to its server-side status (e.g. draft) after a few seconds.
        const hasMutated = requestIdRef.current > 0
        if (!hasMutated) {
          setState((prev) => ({
            ...remote.state,
            currentUserId: resolveCurrentUserId(remote.state),
          }))
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.state))
        }
        setAvailableTenants(remote.availableTenants)
        setActiveTenantId(remote.activeTenantId)
        window.localStorage.setItem(ACTIVE_TENANT_KEY, remote.activeTenantId)
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

  useEffect(() => {
    if (!feedback.length) return

    const timeoutIds = feedback.map((item) =>
      window.setTimeout(() => {
        setFeedback((current) => current.filter((entry) => entry.id !== item.id))
      }, 3200)
    )

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [feedback])

  function pushFeedback(kind: FeedbackItem['kind'], message: string) {
    feedbackIdRef.current += 1
    const id = `${kind}-${feedbackIdRef.current}`
    setFeedback((current) => [...current, { id, kind, message }].slice(-3))
  }

  // The real signed-in user is identified by their auth email (passed from the
  // server layout). The persisted demo state defaults currentUserId to the
  // superadmin/admin seed, so we re-point it at the matching user row. This
  // makes the POS show the actual cashier (not "superadmin") and attribute
  // sales/actions to the right person.
  function resolveCurrentUserId(next: DemoSystemState): string {
    if (authUserEmail) {
      const normalized = authUserEmail.trim().toLowerCase()
      const match = next.users.find((u) => (u.email ?? '').trim().toLowerCase() === normalized)
      if (match) return match.id
    }
    return next.currentUserId
  }

  function mergeState(local: DemoSystemState, remote: DemoSystemState): DemoSystemState {
    return {
      ...remote,
      currentUserId: resolveCurrentUserId(remote),
      categories: mergeArray(local.categories, remote.categories),
      unitsOfMeasure: mergeArray(local.unitsOfMeasure, remote.unitsOfMeasure),
      locations: mergeArray(local.locations, remote.locations),
      suppliers: mergeArray(local.suppliers, remote.suppliers),
      users: mergeUsers(local.users, remote.users),
      products: mergeProducts(local.products, remote.products),
      purchaseOrders: mergeArray(local.purchaseOrders, remote.purchaseOrders),
      purchaseOrderItems: mergeArray(local.purchaseOrderItems, remote.purchaseOrderItems),
      salesTransactions: mergeArray(local.salesTransactions, remote.salesTransactions),
      salesTransactionItems: mergeArray(local.salesTransactionItems, remote.salesTransactionItems),
      stockMovements: mergeArray(local.stockMovements, remote.stockMovements ?? []),
      alerts: mergeArray(local.alerts, remote.alerts),
      auditLogs: mergeArray(local.auditLogs, remote.auditLogs),
      productRecipes: mergeArray(local.productRecipes, remote.productRecipes),
      productionTemplates: mergeArray(local.productionTemplates, remote.productionTemplates),
      cashShifts: mergeArray(local.cashShifts, remote.cashShifts),
      cashMovements: mergeArray(local.cashMovements, remote.cashMovements),
      inventoryLots: mergeArray(local.inventoryLots, remote.inventoryLots ?? []),
    }
  }

  function sync<T>(optimistic: (current: DemoSystemState) => DemoSystemState, mutation: Record<string, unknown>, options?: { successMessage?: string; errorLabel?: string }) {
    requestIdRef.current += 1
    const currentRequest = requestIdRef.current
    const tenantId = state.tenant.id
    setState((current) => {
      return optimistic(current)
    })

    void postMutation(tenantId, mutation)
      .then((remote) => {
        if (currentRequest === requestIdRef.current) {
          setState((prev) => mergeState(prev, remote.state))
          setAvailableTenants(remote.availableTenants)
          setActiveTenantId(remote.activeTenantId)
        }
        if (options?.successMessage) {
          pushFeedback('success', options.successMessage)
        }
      })
      .catch((error) => {
        if (options?.errorLabel) {
          const detail = error instanceof Error ? error.message : 'Something went wrong'
          pushFeedback('error', `${options.errorLabel}: ${detail}`)
        }
        void fetchRemoteState(tenantId)
          .then((remote) => {
            if (currentRequest === requestIdRef.current) {
              setState((prev) => mergeState(prev, remote.state))
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
    addCategory: (draft) => sync(
      (current) => createCategory(current, draft),
      { action: 'addCategory', draft }
    ),
    addUnitOfMeasure: (draft) => sync(
      (current) => createUnitOfMeasure(current, draft),
      { action: 'addUnitOfMeasure', draft }
    ),
    addLocation: (draft) => sync(
      (current) => createLocation(current, draft),
      { action: 'addLocation', draft }
    ),
    editLocation: (locationId, draft) => sync(
      (current) => updateLocation(current, locationId, draft),
      { action: 'updateLocation', locationId, draft }
    ),
    removeLocation: (locationId) => sync(
      (current) => deleteLocation(current, locationId),
      { action: 'deleteLocation', locationId }
    ),
    saveProduct: (draft, productId) => sync(
      (current) => addOrUpdateProduct(current, draft, productId),
      { action: 'saveProduct', draft, productId }
    ),
    removeProduct: (productId) => {
      const itemCode = state.products.find((entry) => entry.id === productId)?.item_code
      sync(
        (current) => deleteProduct(current, productId),
        { action: 'removeProduct', productId, itemCode }
      )
    },
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
    removeProducts: (productIds) => {
      const itemCodes = state.products
        .filter((entry) => productIds.includes(entry.id))
        .map((entry) => entry.item_code)
      sync(
        (current) => deleteProducts(current, productIds),
        { action: 'removeProducts', productIds, itemCodes }
      )
    },
    removeSuppliers: (supplierIds) => sync(
      (current) => deleteSuppliers(current, supplierIds),
      { action: 'removeSuppliers', supplierIds }
    ),
  addUser: (draft) => sync(
    (current) => createUser(current, draft),
    { action: 'addUser', draft },
    { successMessage: 'Invitation sent. They\u2019ll get an email to set up their password.', errorLabel: 'Could not send invitation' }
  ),
  editUser: (userId, draft) => sync(
    (current) => updateUser(current, userId, draft),
    { action: 'editUser', userId, draft }
  ),
  toggleUser: (userId) => sync(
    (current) => toggleUserActive(current, userId),
    { action: 'toggleUser', userId }
  ),
  resendInvite: (draft) => sync(
    (current) => markInviteResent(current, draft.email),
    { action: 'resendInvite', draft },
    { successMessage: 'Invitation resent. We\u2019ve emailed a fresh setup link.', errorLabel: 'Could not resend invitation' }
  ),
  createRecipe: (finishedGoodId, ingredientId, quantityPerUnit, uomId) => sync(
    (current) => createRecipe(current, finishedGoodId, ingredientId, quantityPerUnit, uomId),
    { action: 'createRecipe', finishedGoodId, ingredientId, quantityPerUnit, uomId }
  ),
  updateRecipe: (recipeId, quantityPerUnit, uomId) => sync(
    (current) => updateRecipe(current, recipeId, quantityPerUnit, uomId),
    { action: 'updateRecipe', recipeId, quantityPerUnit, uomId }
  ),
  deleteRecipe: (recipeId) => sync(
    (current) => deleteRecipe(current, recipeId),
    { action: 'deleteRecipe', recipeId }
  ),
  createProductionTemplate: (draft) => sync(
    (current) => createProductionTemplate(current, draft),
    { action: 'createProductionTemplate', ...draft }
  ),
  deleteProductionTemplate: (templateId) => sync(
    (current) => deleteProductionTemplate(current, templateId),
    { action: 'deleteProductionTemplate', templateId }
  ),
  produceFinishedGood: (finishedGoodId, quantity, locationId) => sync(
    (current) => produceFinishedGood(current, finishedGoodId, quantity, locationId),
    { action: 'produceFinishedGood', finishedGoodId, quantity, locationId }
  ),
  createPO: (draft) => {
    const orderId = id()
    sync(
      (current) => createPurchaseOrder(current, draft, orderId),
      { action: 'createPO', draft, orderId }
    )
  },
  receivePO: (purchaseOrderId) => sync(
    (current) => receivePurchaseOrder(current, purchaseOrderId),
    { action: 'receivePO', purchaseOrderId }
  ),
  updatePO: (purchaseOrderId, draft) => sync(
    (current) => updatePurchaseOrder(current, { purchaseOrderId, draft }),
    { action: 'updatePurchaseOrder', purchaseOrderId, draft }
  ),
  cancelPO: (purchaseOrderId) => sync(
    (current) => cancelPurchaseOrder(current, purchaseOrderId),
    { action: 'cancelPurchaseOrder', purchaseOrderId }
  ),
    completeSale: (payload) => {
      const local = recordSale(state, payload)
      sync(
        () => local.state,
        {
          action: 'completeSale',
          payload: {
            ...payload,
            receiptNumber: local.receiptNumber,
            transactionId: local.transactionId,
            itemIds: local.itemIds,
            movementIds: local.movementIds,
            auditLogId: local.auditLogId,
          },
        }
      )
      return { receiptNumber: local.receiptNumber, transactionId: local.transactionId }
    },
    voidSale: (transactionId, reason) =>
      sync(
        (current) => voidTransaction(current, { transactionId, reason }),
        { action: 'voidSale', transactionId, reason }
      ),
    refundSale: (transactionId, reason) =>
      sync(
        (current) => refundTransaction(current, { transactionId, reason }),
        { action: 'refundSale', transactionId, reason }
      ),
    openShift: (payload) =>
      sync(
        (current) => openShift(current, payload),
        { action: 'openShift', payload }
      ),
    closeShift: (shiftId, countedCash, notes) =>
      sync(
        (current) => {
          const updated = closeShift(current, { shiftId, countedCash, notes })
          if (!updated) throw new Error('Shift not found or already closed')
          return updated
        },
        { action: 'closeShift', payload: { shiftId, countedCash, notes } }
      ),
    recordCashMovement: (shiftId, kind, amount, note, denominations) =>
      sync(
        (current) => recordCashMovement(current, { shiftId, kind, amount, note, denominations }),
        { action: 'recordCashMovement', payload: { shiftId, kind, amount, note, denominations } }
      ),
    acknowledge: (alertId) => sync(
      (current) => acknowledgeAlert(current, alertId),
      { action: 'acknowledge', alertId }
    ),
    resolve: (alertId) => sync(
      (current) => resolveAlert(current, alertId),
      { action: 'resolve', alertId }
    ),
    recordWaste: (productId, wasteType, quantity, reason) => sync(
      (current) => recordWaste(current, { productId, wasteType, quantity, reason }),
      { action: 'recordWaste', productId, wasteType, quantity, reason }
    ),
    reverseWaste: (movementId) => sync(
      (current) => reverseWaste(current, movementId),
      { action: 'reverseWaste', movementId },
      { successMessage: 'Waste entry reversed — stock restored.', errorLabel: 'Could not reverse waste' }
    ),
    editWaste: (movementId, draft) => sync(
      (current) => editWaste(current, movementId, draft),
      { action: 'editWaste', movementId, ...draft },
      { successMessage: 'Waste entry updated.', errorLabel: 'Could not update waste' }
    ),
    transferStock: (payload) => sync(
      (current) => createTransfer(current, payload),
      { action: 'transferStock', payload }
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
      try {
        await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      } catch {
        // best-effort logout audit
      }
      await supabase.auth.signOut()
      window.localStorage.removeItem(ACTIVE_TENANT_KEY)
      window.localStorage.removeItem(STORAGE_KEY)
      window.location.href = '/sign-in'
    },
    formatCurrency,
    notifySuccess: (message) => pushFeedback('success', message),
    notifyError: (message) => pushFeedback('error', message),
  }

  return (
    <DemoSystemContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 70, display: 'grid', gap: 10, width: 'min(360px, calc(100vw - 32px))', pointerEvents: 'none' }}>
        {feedback.map((item) => (
          <div
            key={item.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              border: item.kind === 'success' ? '1px solid #BBF7D0' : '1px solid #FECACA',
              background: item.kind === 'success' ? 'linear-gradient(180deg, #ECFDF5 0%, #F0FDF4 100%)' : 'linear-gradient(180deg, #FEF2F2 0%, #FFF1F2 100%)',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
              color: '#0F172A',
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.kind === 'success' ? '#D1FAE5' : '#FEE2E2', color: item.kind === 'success' ? '#059669' : '#DC2626', flexShrink: 0 }}>
              {item.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.25 }}>{item.message}</div>
            </div>
            <button
              type="button"
              onClick={() => setFeedback((current) => current.filter((entry) => entry.id !== item.id))}
              aria-label="Dismiss notification"
              style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </DemoSystemContext.Provider>
  )
}

export function useDemoSystem() {
  const context = useContext(DemoSystemContext)
  if (!context) {
    throw new Error('useDemoSystem must be used within DemoSystemProvider')
  }

  return context
}
