'use client'

import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { CheckCircle2, X, AlertTriangle } from 'lucide-react'
import {
  addOrUpdateProduct,
  reorderFromAlert,
  reorderAllAlerts,
  closeShift,
  computeDashboardStats,
  createCategory,
  updateCategory,
  deleteCategory,
  createPurchaseOrder,
  createLocation,
  createUnitOfMeasure,
  updateUnitOfMeasure,
  deleteUnitOfMeasure,
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
  setWasteTypes,
  ensureWasteLocation,
  remapStateTenantId,
  resolveAlert,
  resolveAllAlerts,
  syncAlerts,
  toggleProductActive,
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
  buildSaleTransactionId,
  deleteRecipe,
  createProductionTemplate,
  deleteProductionTemplate,
  produceFinishedGood,
  createTransfer,
  requestDeletion,
  approveDeletion,
  rejectDeletion,
  seedDemoSystem,
  emptyDemoSystem,
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
import type { AccessibleTenant, BusinessType, DeletionRequest, PaymentMethod, User, UserRole } from '@/types/database'
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
  updateTenant: (patch: Partial<DemoSystemState['tenant']> & { business_type?: BusinessType }) => void
  addCategory: (draft: CategoryDraft) => void
  editCategory: (categoryId: string, draft: CategoryDraft) => void
  deleteCategory: (categoryId: string) => void
  addUnitOfMeasure: (draft: UnitOfMeasureDraft) => void
  editUnitOfMeasure: (uomId: string, draft: UnitOfMeasureDraft) => void
  deleteUnitOfMeasure: (uomId: string) => void
  addLocation: (draft: LocationDraft) => void
  editLocation: (locationId: string, draft: LocationDraft) => void
  removeLocation: (locationId: string) => void
  saveProduct: (draft: ProductDraft, productId?: string) => void
  removeProduct: (productId: string) => void
  removeProducts: (productIds: string[]) => void
  removeSuppliers: (supplierIds: string[]) => void
  importProductRows: (drafts: ProductDraft[], errorLabel?: string) => void
  addSupplier: (draft: SupplierDraft) => void
  editSupplier: (supplierId: string, draft: SupplierDraft) => void
  removeSupplier: (supplierId: string) => void
  addUser: (draft: UserDraft) => void
  editUser: (userId: string, draft: { full_name: string; email: string; role: UserRole }) => void
  toggleUser: (userId: string) => void
  toggleProduct: (productId: string) => void
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
  completeSale: (payload: { payment_method: PaymentMethod; payment_provider?: string; payment_reference?: string | null; amount_tendered: number; location_id: string | null; notes?: string; items: SaleDraftItem[]; split_payments?: Array<{ payment_method: PaymentMethod; amount: number; reference?: string | null }> }) => { receiptNumber: string; transactionId: string }
  voidSale: (transactionId: string, reason?: string) => void
  refundSale: (transactionId: string, reason?: string) => void
  openShift: (payload: { openingFloat: number; locationId?: string | null; notes?: string; station?: string | null }) => void
  closeShift: (shiftId: string, countedCash: number, notes?: string) => void
  recordCashMovement: (shiftId: string, kind: 'cash_in' | 'cash_out' | 'denomination_adjustment', amount: number, note?: string | null, denominations?: Record<string, number> | null) => void
  acknowledge: (alertId: string) => void
  resolve: (alertId: string) => void
  reorderAlert: (alertId: string) => void
  reorderAllAlerts: () => void
  resolveAll: () => void
  recordWaste: (productId: string, wasteType: 'waste' | 'defect' | 'reject', quantity: number, reason?: string) => void
  reverseWaste: (movementId: string) => void
  setWasteTypes: (productId: string, draft: { waste: number; defect: number; reject: number }, reason?: string) => void
  transferStock: (payload: { productId: string; fromLocationId: string | null; toLocationId: string | null; quantity: number; notes?: string }) => void
  requestDeletion: (requestedAction: string, targetType: string, targetId: string, details: Record<string, unknown>) => void
  approveDeletion: (requestId: string) => void
  rejectDeletion: (requestId: string) => void
  switchTenant: (tenantId: string) => Promise<void>
  signOut: () => Promise<void>
  formatCurrency: (amount: number) => string
  notifySuccess: (message: string) => void
  notifyError: (message: string) => void
  resetDemo: (businessType?: BusinessType) => void
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

// Id-keyed merge where the SERVER wins on id match. Used for records whose
// authoritative status can change on another client (e.g. a sale flips to
// voided/refunded after a superior approves it, or a deletion request flips to
// approved/rejected). mergeArray is local-wins and would otherwise keep a
// stale cached "completed"/"pending" record forever — even after a full reload
// — so the POS never clears the "PENDING APPROVAL" banner. Genuinely local-only
// rows (no server twin) are still preserved.
function mergeByIdRemoteWins<T extends { id: string }>(localItems: T[], remoteItems: T[]): T[] {
  const remoteById = new Map(remoteItems.map((item) => [item.id, item]))
  const merged: T[] = []
  for (const localItem of localItems) {
    merged.push(remoteById.get(localItem.id) ?? localItem)
  }
  for (const remoteItem of remoteItems) {
    if (!localItems.some((item) => item.id === remoteItem.id)) {
      merged.push(remoteItem)
    }
  }
  return merged
}

// Collapse deletion requests that describe the same logical approval (same
// tenant + action + target) into a single record. Historically a request could
// be duplicated — once optimistically on the client and again when replayed on
// the server — producing two separate ids for the same void/refund/delete. When
// only one of those duplicates was later approved, the other orphaned "pending"
// copy survived and made the sales staff POS show "VOIDED · PENDING APPROVAL"
// while a superior (who only ever saw one copy) correctly showed "VOIDED".
// Keeping the resolved copy (approved/rejected) over a lingering pending one
// makes both views consistent.
function dedupeDeletionRequests(requests: DeletionRequest[]): DeletionRequest[] {
  const byKey = new Map<string, DeletionRequest>()
  for (const req of requests) {
    const key = `${req.tenant_id}:${req.action}:${req.target_type}:${req.target_id}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, req)
      continue
    }
    const rank = (status: string) => (status === 'pending' ? 0 : 1)
    byKey.set(key, rank(req.status) >= rank(existing.status) ? req : existing)
  }
  return [...byKey.values()]
}

// Stock movements are generated twice for the same logical event: once
// optimistically on the client (random ids) and again when the server
// recomputes the mutation (different random ids). mergeArray keeps both
// because the ids differ, which double-counts Sales / Void / Refund history.
// Collapse to one per logical movement using a stable natural key so the
// movement ledger shows each event exactly once.
//
// IMPORTANT: the key must NOT include quantity_before / quantity_after. Those
// values are derived from the on-hand snapshot at compute time, and when two
// near-simultaneous sales are each applied against slightly different snapshots
// (optimistic client state vs. server DB snapshot) they can legitimately differ
// for the *same* logical event. Keying on them would let the server's stale
// recomputation survive the merge as a phantom movement with the wrong
// before/after (e.g. "before 3, after 3" while the real stock did decrement).
// Key on the immutable logical identity instead and keep the local record,
// which already reflects every prior local mutation.
type StockMovementLike = {
  id?: string
  reference_id?: string | null
  product_id?: string | null
  movement_type?: string | null
  quantity?: number | null
}
function mergeStockMovements<T extends StockMovementLike>(localItems: T[], remoteItems: T[]): T[] {
  const keyFor = (item: StockMovementLike) =>
    `${item.reference_id ?? ''}|${item.product_id ?? ''}|${item.movement_type ?? ''}|${item.quantity ?? 0}`
  const seen = new Set(localItems.map(keyFor))
  const merged = [...localItems]
  for (const remoteItem of remoteItems) {
    const key = keyFor(remoteItem)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(remoteItem)
    }
  }
  return merged
}

// Products are reconciled by item_code (the real business key), not just id.
// A client optimistic product and its server-persisted twin can carry different
// random ids (e.g. imported items), which would otherwise both survive a plain
// id merge and show up as duplicates / "come back" after a delete. So for a
// shared item_code we keep a single record, preferring the server's metadata.
// However, the server echo can be a stale snapshot (e.g. a PO was received
// client-side but the persisted state hadn't caught up), and because inventory
// lots are merged local-wins, blindly taking the server's quantity_on_hand would
// reset on-hand back to 0 right after the user received stock. We therefore keep
// the server record as the base but always preserve the locally-optimistic stock
// counters so the product total stays in sync with its FIFO lots.
type ProductLike = { id: string; item_code?: string | null; quantity_on_hand?: number; quantity_reserved?: number; is_active?: boolean }
function mergeProducts<T extends ProductLike>(localItems: T[], remoteItems: T[]): T[] {
  const keyFor = (item: ProductLike) => {
    const code = String(item.item_code ?? '').trim().toLowerCase()
    return code ? `code:${code}` : `id:${item.id}`
  }
  const remoteByKey = new Map<string, T>()
  for (const item of remoteItems) remoteByKey.set(keyFor(item), item)
  const result = new Map<string, T>()
  // Server metadata wins for de-duplication / shared item_code.
  for (const item of remoteItems) result.set(keyFor(item), item)
  // Re-apply locally-optimistic stock counters and keep any client-only product.
  for (const item of localItems) {
    const key = keyFor(item)
    const remote = remoteByKey.get(key)
    if (!remote) {
      if (!result.has(key)) result.set(key, item)
    } else {
      result.set(key, { ...remote, quantity_on_hand: item.quantity_on_hand, quantity_reserved: item.quantity_reserved, is_active: item.is_active } as T)
    }
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

// Categories are deduplicated by name (the real business key), not just id.
// A client optimistic category and its server-persisted twin can carry different
// random ids, which would otherwise both survive a plain id merge. The server
// is authoritative, so prefer remote rows and only keep local rows that have
// no remote match by id OR name.
function mergeCategories<T extends { id: string; name: string }>(localItems: T[], remoteItems: T[]): T[] {
  const remoteIds = new Set(remoteItems.map((item) => item.id))
  const remoteNames = new Set(remoteItems.map((item) => item.name.trim().toLowerCase()))
  const localOnly = localItems.filter(
    (item) => !remoteIds.has(item.id) && !remoteNames.has(item.name.trim().toLowerCase())
  )
  return [...remoteItems, ...localOnly]
}

// Locations are deduplicated by id OR (code + name), the real business key.
// A client optimistic location and its server-persisted twin can carry different
// random ids, which would otherwise both survive a plain id merge and appear as
// a duplicate entry in the settings catalog. The server is authoritative, so
// prefer remote rows and only keep local rows that have no remote match by id or
// by code + name.
function mergeLocations<T extends { id: string; code: string; name: string }>(localItems: T[], remoteItems: T[]): T[] {
  const remoteIds = new Set(remoteItems.map((item) => item.id))
  const remoteKeys = new Set(
    remoteItems.map((item) => `${String(item.code).trim().toLowerCase()}|${String(item.name).trim().toLowerCase()}`)
  )
  const localOnly = localItems.filter((item) => {
    const key = `${String(item.code).trim().toLowerCase()}|${String(item.name).trim().toLowerCase()}`
    return !remoteIds.has(item.id) && !remoteKeys.has(key)
  })
  return [...remoteItems, ...localOnly]
}

// Alerts need de-duplication by product: an optimistic client alert and its
// server-persisted twin for the same low-stock product can carry different ids
// (they used to be generated with a random id on each run), so a plain id merge
// would keep both and show a duplicate notification. Remote is authoritative, so
// prefer remote rows, keep any local-only rows by id, then collapse duplicate
// OPEN alerts for the same product into a single row.
type AlertLike = { id: string; product_id?: string | null; status?: string | null }
function mergeAlerts<T extends AlertLike>(localItems: T[], remoteItems: T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of remoteItems) byId.set(item.id, item)
  for (const item of localItems) {
    if (!byId.has(item.id)) byId.set(item.id, item)
  }

  const seenOpenProduct = new Set<string>()
  const result: T[] = []
  for (const item of byId.values()) {
    if (item.status === 'open' && item.product_id) {
      if (seenOpenProduct.has(item.product_id)) continue
      seenOpenProduct.add(item.product_id)
    }
    result.push(item)
  }
  return result
}

type FeedbackItem = {
  id: string
  kind: 'success' | 'error'
  message: string
}

function loadCachedState(): DemoSystemState {
  if (typeof window === 'undefined') return emptyDemoSystem()

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyDemoSystem()

  try {
    const parsed = JSON.parse(raw) as DemoSystemState
    return {
      ...emptyDemoSystem(normalizeBusinessType(parsed.tenant?.business_type)),
      ...parsed,
      tenant: {
        ...emptyDemoSystem(normalizeBusinessType(parsed.tenant?.business_type)).tenant,
        ...parsed.tenant,
        business_type: normalizeBusinessType(parsed.tenant?.business_type),
      },
    }
  } catch {
    return emptyDemoSystem()
  }
}

async function fetchRemoteState(tenantId?: string | null) {
  const url = tenantId ? `/api/system?tenantId=${encodeURIComponent(tenantId)}` : '/api/system'
  // Guard against a hanging request (e.g. a stalled Supabase call behind the
  // Cloudflare -> Vercel proxy). Without a timeout the promise never settles,
  // `hydrated` is never set, and the dashboard is stuck on "Loading..." forever.
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || 'Failed to load system state')
    }
    return (await response.json()) as SystemApiResponse
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function postMutation(tenantId: string, body: Record<string, unknown>) {
  const response = await fetch('/api/system', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, ...body }),
    cache: 'no-store',
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Failed to save changes')
  }
  return (await response.json()) as SystemApiResponse
}

export function DemoSystemProvider({ children, initialTenantId, authUserEmail = null, isSuperAdminIdentity = false }: PropsWithChildren<{ initialTenantId?: string; authUserEmail?: string | null; isSuperAdminIdentity?: boolean }>) {
  // Start from the last-known cached state (if any) so a page reload shows the
  // user's data immediately instead of flashing an empty seed and appearing to
  // "lose everything" while the server fetch is in flight or if it fails.
  const [state, setState] = useState<DemoSystemState>(() => loadCachedState())
  const [availableTenants, setAvailableTenants] = useState<AccessibleTenant[]>([])
  const [activeTenantId, setActiveTenantId] = useState<string>('')
  const [hydrated, setHydrated] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const supabase = createClient()
  const requestIdRef = useRef(0)
  const feedbackIdRef = useRef(0)
  const broadcastInvalidateRef = useRef<(() => void) | null>(null)

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
          const resolvedRemote = resolveCurrentUser(ensureWasteLocation(remote.state))
          if (resolvedRemote.tenant.id !== state.tenant.id) {
            setState(resolvedRemote)
          } else {
            setState((prev) => mergeState(prev, resolvedRemote))
          }
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resolvedRemote))
        }
        setAvailableTenants(remote.availableTenants)
        setActiveTenantId(remote.activeTenantId)
        window.localStorage.setItem(ACTIVE_TENANT_KEY, remote.activeTenantId)
      } catch {
        if (!mounted) return
        // The initial load failed (e.g. onboarding not complete, network down,
        // a request timed out behind the Cloudflare -> Vercel proxy, or the
        // cached tenant no longer exists). Reuse the last-known cached state
        // whenever we have one so the user is never stranded on an empty
        // "Untitled Workspace" and never stuck on the "Loading..." gate. If
        // there is no cache at all we still leave `hydrated` true (via finally)
        // so the page renders something rather than an endless spinner.
        const cached = loadCachedState()
        const cachedId = window.localStorage.getItem(ACTIVE_TENANT_KEY)
        const hasCache = Boolean(cached?.tenant?.id)
        const matchesRequest =
          initialTenantId && (cached.tenant.id === initialTenantId || cachedId === initialTenantId)
        if (hasCache && (matchesRequest || !initialTenantId || !cachedId)) {
          setState(resolveCurrentUser(ensureWasteLocation(cached)))
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
        }
      } finally {
        if (mounted) setHydrated(true)
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [initialTenantId, authUserEmail])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.localStorage.setItem(ACTIVE_TENANT_KEY, activeTenantId || state.tenant.id)
  }, [hydrated, state, activeTenantId])

  // Keep every signed-in client in sync with the server so that an approval
  // performed by a superior (on another device or tab) is reflected in the
  // sales staff's POS — e.g. a void/refund flips from "PENDING APPROVAL" to
  // VOIDED/REFUNDED instead of staying stuck. We re-fetch on a quiet interval
  // (cross-device) and immediately when another tab of the same tenant signals
  // a change via BroadcastChannel (same-browser, instant). The refresh is
  // skipped while the user has a local mutation in flight so we never clobber
  // optimistic state, and mergeState reconciles without dropping local records.
  useEffect(() => {
    if (!hydrated) return
    let cancelled = false

    const refresh = async () => {
      if (cancelled || requestIdRef.current > 0) return
      try {
        const remote = await fetchRemoteState(activeTenantId || state.tenant.id)
        if (cancelled || requestIdRef.current > 0) return
        const resolved = resolveCurrentUser(ensureWasteLocation(remote.state))
        setState((prev) => mergeState(prev, resolved))
        setAvailableTenants(remote.availableTenants)
        setActiveTenantId(remote.activeTenantId)
      } catch {
        // Keep current state if the network is unavailable.
      }
    }

    const intervalId = window.setInterval(refresh, 15000)
    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('codentra.state')
      channel.onmessage = (event) => {
        if (event.data === 'invalidate') void refresh()
      }
    }
    // Expose the invalidation broadcaster so mutations can ping other tabs.
    broadcastInvalidateRef.current = () => {
      try {
        channel?.postMessage('invalidate')
      } catch {
        // ignore
      }
    }

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      channel?.close()
      broadcastInvalidateRef.current = null
    }
  }, [hydrated, activeTenantId, state.tenant.id])

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
  //
  // If the signed-in user has no row in state.users (e.g. they were invited but
  // their users record is missing, or their email casing differs), we synthesize
  // a user entry from their auth identity so the POS always shows the real
  // logged-in person's name and email instead of falling back to the seed
  // superadmin.
  function resolveCurrentUser(next: DemoSystemState): DemoSystemState {
    if (!authUserEmail) return next
    const normalized = authUserEmail.trim().toLowerCase()
    const existing = next.users.find((u) => (u.email ?? '').trim().toLowerCase() === normalized)
    if (existing) {
      return { ...next, currentUserId: existing.id }
    }

    const activeTenantRole = availableTenants.find((t) => t.id === (activeTenantId || next.tenant.id))?.role
    const authUserId = `auth:${normalized}`
    const displayName = (authUserEmail.split('@')[0] || 'User')
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    const syntheticUser: User = {
      id: authUserId,
      tenant_id: next.tenant.id,
      role: (activeTenantRole || next.users[0]?.role || 'sales_staff') as User['role'],
      full_name: displayName,
      email: authUserEmail,
      avatar_url: null,
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return {
      ...next,
      currentUserId: authUserId,
      users: [...next.users, syntheticUser],
    }
  }

  function mergeState(local: DemoSystemState, remote: DemoSystemState): DemoSystemState {
    const merged: DemoSystemState = {
      ...remote,
      currentUserId: resolveCurrentUser(remote).currentUserId,
      tenant: { ...local.tenant, ...remote.tenant },
      categories: mergeCategories(local.categories, remote.categories),
      unitsOfMeasure: mergeArray(local.unitsOfMeasure, remote.unitsOfMeasure),
      locations: mergeLocations(local.locations, remote.locations),
      suppliers: mergeArray(local.suppliers, remote.suppliers),
      users: mergeUsers(local.users, remote.users),
      products: mergeProducts(local.products, remote.products),
      purchaseOrders: mergeArray(local.purchaseOrders, remote.purchaseOrders),
      purchaseOrderItems: mergeArray(local.purchaseOrderItems, remote.purchaseOrderItems),
      salesTransactions: mergeByIdRemoteWins(local.salesTransactions, remote.salesTransactions),
      salesTransactionItems: mergeArray(local.salesTransactionItems, remote.salesTransactionItems),
      stockMovements: mergeStockMovements(local.stockMovements, remote.stockMovements ?? []),
      alerts: mergeAlerts(local.alerts, remote.alerts),
      auditLogs: mergeArray(local.auditLogs, remote.auditLogs),
      productRecipes: mergeArray(local.productRecipes, remote.productRecipes),
      productionTemplates: mergeArray(local.productionTemplates, remote.productionTemplates),
      cashShifts: mergeArray(local.cashShifts, remote.cashShifts),
      cashMovements: mergeArray(local.cashMovements, remote.cashMovements),
      inventoryLots: mergeArray(local.inventoryLots, remote.inventoryLots ?? []),
      deletionRequests: dedupeDeletionRequests(mergeByIdRemoteWins(local.deletionRequests, remote.deletionRequests ?? [])),
    }

    // Always reconcile alerts against the merged product stock so stale
    // notifications (e.g. an out_of_stock row for an item that now has 10 on
    // hand) never display, regardless of cache or prior mutations.
    return syncAlerts(merged)
  }

  function sync<T>(optimistic: (current: DemoSystemState) => DemoSystemState, mutation: Record<string, unknown>, options?: { successMessage?: string; errorLabel?: string }) {
    requestIdRef.current += 1
    const currentRequest = requestIdRef.current
    const tenantId = state.tenant.id

    // The optimistic updater (e.g. addOrUpdateProduct) can throw when it
    // rejects invalid input such as a duplicate item code or product name.
    // Running it inside setState would otherwise crash React with an
    // "application error: a client-side exception has occurred". Catch it
    // here, surface the message, and roll back to the pristine remote state.
    let nextState: DemoSystemState
    try {
      nextState = optimistic(state)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Something went wrong'
      pushFeedback('error', options?.errorLabel ? `${options.errorLabel}: ${detail}` : detail)
      void fetchRemoteState(tenantId)
        .then((remote) => {
          if (currentRequest === requestIdRef.current) {
            setState((prev) => mergeState(prev, remote.state))
            setAvailableTenants(remote.availableTenants)
            setActiveTenantId(remote.activeTenantId)
          }
        })
        .catch(() => {
          // Keep current state if the network is unavailable.
        })
      return
    }
    setState(nextState)

    void postMutation(tenantId, mutation)
      .then((remote) => {
        if (currentRequest === requestIdRef.current) {
          setState((prev) => mergeState(prev, remote.state))
          setAvailableTenants(remote.availableTenants)
          setActiveTenantId(remote.activeTenantId)
        }
        // Ping other open tabs/clients so an approval (e.g. void/refund) made
        // here is reflected immediately in the sales staff's POS.
        broadcastInvalidateRef.current?.()
        if (options?.successMessage) {
          pushFeedback('success', options.successMessage)
        }
      })
      .catch((error) => {
        if (options?.errorLabel) {
          const detail = error instanceof Error ? error.message : 'Something went wrong'
          pushFeedback('error', `${options.errorLabel}: ${detail}`)
        } else {
          const detail = error instanceof Error ? error.message : 'Something went wrong'
          pushFeedback('error', detail)
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
      { action: 'updateTenant', patch },
      { successMessage: 'Settings saved successfully.', errorLabel: 'Could not save settings' }
    ),
    addCategory: (draft) => sync(
      (current) => createCategory(current, draft),
      { action: 'addCategory', draft }
    ),
    editCategory: (categoryId, draft) => sync(
      (current) => updateCategory(current, categoryId, draft),
      { action: 'editCategory', categoryId, draft }
    ),
    deleteCategory: (categoryId) => sync(
      (current) => deleteCategory(current, categoryId),
      { action: 'deleteCategory', categoryId }
    ),
    addUnitOfMeasure: (draft) => sync(
      (current) => createUnitOfMeasure(current, draft),
      { action: 'addUnitOfMeasure', draft }
    ),
    editUnitOfMeasure: (uomId, draft) => sync(
      (current) => updateUnitOfMeasure(current, uomId, draft),
      { action: 'editUnitOfMeasure', uomId, draft }
    ),
    deleteUnitOfMeasure: (uomId) => sync(
      (current) => deleteUnitOfMeasure(current, uomId),
      { action: 'deleteUnitOfMeasure', uomId }
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
  importProductRows: (drafts, errorLabel) => sync(
    (current) => importProducts(current, drafts),
    { action: 'importProductRows', drafts },
    errorLabel ? { errorLabel } : undefined
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
  toggleProduct: (productId) => sync(
    (current) => toggleProductActive(current, productId),
    { action: 'toggleProduct', productId },
    { successMessage: 'Item updated.', errorLabel: 'Could not update item' }
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
      // Generate the receipt/transaction ids up front so the optimistic local
      // state and the reducer (applied once inside sync) stay in lockstep.
      // IMPORTANT: do NOT call recordSale here — sync applies it exactly once.
      // Calling it both places double-deducts stock (duplicate outbound).
      const receiptNumber = buildSaleTransactionId(state)
      const transactionId = id()
      const itemIds = payload.items.map(() => id())
      const movementIds = payload.items.map(() => id())
      const auditLogId = id()
      const local = recordSale(state, {
        ...payload,
        receiptNumber,
        transactionId,
        itemIds,
        movementIds,
        auditLogId,
      })
      sync(
        (current) => recordSale(current, {
          ...payload,
          receiptNumber,
          transactionId,
          itemIds,
          movementIds,
          auditLogId,
        }).state,
        {
          action: 'completeSale',
          payload: {
            ...payload,
            receiptNumber,
            transactionId,
            itemIds,
            movementIds,
            auditLogId,
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
      (current) => resolveAlert(current, alertId),
      { action: 'acknowledge', alertId }
    ),
    resolve: (alertId) => sync(
      (current) => resolveAlert(current, alertId),
      { action: 'resolve', alertId }
    ),
    reorderAlert: (alertId) => sync(
      (current) => reorderFromAlert(current, alertId),
      { action: 'reorderAlert', alertId },
      { successMessage: 'Restock triggered.' }
    ),
    reorderAllAlerts: () => sync(
      (current) => reorderAllAlerts(current),
      { action: 'reorderAllAlerts' },
      { successMessage: 'Restock orders created.' }
    ),
    resolveAll: () => sync(
      (current) => resolveAllAlerts(current),
      { action: 'resolveAll' },
      { successMessage: 'All alerts resolved.' }
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
    setWasteTypes: (productId, draft, reason) => sync(
      (current) => setWasteTypes(current, productId, draft, reason),
      { action: 'setWasteTypes', productId, ...draft },
      { successMessage: 'Waste / defect / reject updated.', errorLabel: 'Could not update waste' }
    ),
    transferStock: (payload) => sync(
      (current) => createTransfer(current, payload),
      { action: 'transferStock', payload }
    ),
    requestDeletion: (requestedAction, targetType, targetId, details) => sync(
      (current) => requestDeletion(current, requestedAction, targetType, targetId, details),
      { action: 'requestDeletion', requestedAction, targetType, targetId, details },
      { successMessage: 'Deletion request sent to manager for approval.', errorLabel: 'Could not request deletion' }
    ),
    approveDeletion: (requestId) => sync(
      (current) => approveDeletion(current, requestId),
      { action: 'approveDeletion', requestId },
      { successMessage: 'Deletion approved and record removed.', errorLabel: 'Could not approve deletion' }
    ),
    rejectDeletion: (requestId) => sync(
      (current) => rejectDeletion(current, requestId),
      { action: 'rejectDeletion', requestId },
      { successMessage: 'Deletion request rejected.', errorLabel: 'Could not reject deletion' }
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
      setState(ensureWasteLocation(remote.state))
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
