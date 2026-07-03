import type { DemoSystemState } from '@/lib/demo-system'
import {
  addOrUpdateProduct,
  acknowledgeAlert,
  createPurchaseOrder,
  createSupplier,
  createUser,
  deleteProduct,
  deleteSupplier,
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
  type ProductDraft,
  type PurchaseOrderDraft,
  type SaleDraftItem,
  type SupplierDraft,
  type UserDraft,
} from '@/lib/demo-system'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { BusinessType, PaymentMethod, SubscriptionPlan, SubscriptionStatus } from '@/types/database'

type AnyRow = Record<string, any>

type MutationPayload =
  | { action: 'resetDemo'; businessType?: BusinessType }
  | { action: 'updateTenant'; patch: Partial<DemoSystemState['tenant']> & { business_type?: BusinessType } }
  | { action: 'saveProduct'; draft: ProductDraft; productId?: string }
  | { action: 'removeProduct'; productId: string }
  | { action: 'importProductRows'; drafts: ProductDraft[] }
  | { action: 'addSupplier'; draft: SupplierDraft }
  | { action: 'editSupplier'; supplierId: string; draft: SupplierDraft }
  | { action: 'removeSupplier'; supplierId: string }
  | { action: 'addUser'; draft: UserDraft }
  | { action: 'toggleUser'; userId: string }
  | { action: 'createPO'; draft: PurchaseOrderDraft }
  | { action: 'receivePO'; purchaseOrderId: string }
  | { action: 'completeSale'; payload: { payment_method: PaymentMethod; payment_provider?: string; payment_reference?: string | null; amount_tendered: number; location_id: string | null; notes?: string; items: SaleDraftItem[] } }
  | { action: 'acknowledge'; alertId: string }
  | { action: 'resolve'; alertId: string }

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function firstRow<T extends AnyRow>(rows: T[] | null | undefined) {
  return asArray(rows)[0] ?? null
}

function mapRow<T extends AnyRow, R>(rows: T[], mapper: (row: T) => R) {
  return rows.map(mapper)
}

function ensurePlanCapacity(state: DemoSystemState, resource: 'users' | 'products' | 'locations', isUpdate = false) {
  if (isUpdate) return

  const limitKey = {
    users: 'max_users',
    products: 'max_products',
    locations: 'max_locations',
  }[resource] as keyof DemoSystemState['tenant']

  const currentCount = {
    users: state.users.length,
    products: state.products.length,
    locations: state.locations.length,
  }[resource]

  const limit = Number(state.tenant[limitKey] ?? 0)
  if (currentCount >= limit) {
    throw new Error(`Your ${state.tenant.plan} plan allows up to ${limit} ${resource}. Upgrade your subscription to continue.`)
  }
}

export async function loadTenantState(tenantId?: string | null) {
  const client = getSupabaseAdminClient()
  const tenantQuery = tenantId
    ? client.from('tenants').select('*').eq('id', tenantId).maybeSingle()
    : client.from('tenants').select('*').order('created_at', { ascending: true }).limit(1)

  const tenantResult = await tenantQuery
  const tenant = tenantId ? (tenantResult.data ?? null) : firstRow(tenantResult.data as AnyRow[] | null)

  if (!tenant) {
    return null
  }

  const [
    categoriesResult,
    uomsResult,
    locationsResult,
    suppliersResult,
    usersResult,
    productsResult,
    alertsResult,
    poResult,
    poItemsResult,
    salesResult,
    salesItemsResult,
    movementResult,
  ] = await Promise.all([
    client.from('categories').select('*').eq('tenant_id', tenant.id),
    client.from('units_of_measure').select('*').eq('tenant_id', tenant.id),
    client.from('locations').select('*').eq('tenant_id', tenant.id),
    client.from('suppliers').select('*').eq('tenant_id', tenant.id),
    client.from('users').select('*').eq('tenant_id', tenant.id),
    client.from('products').select('*').eq('tenant_id', tenant.id),
    client.from('alerts').select('*').eq('tenant_id', tenant.id),
    client.from('purchase_orders').select('*').eq('tenant_id', tenant.id),
    client.from('purchase_order_items').select('*'),
    client.from('sales_transactions').select('*').eq('tenant_id', tenant.id),
    client.from('sales_transaction_items').select('*'),
    client.from('stock_movements').select('*').eq('tenant_id', tenant.id),
  ])

  const categories = asArray(categoriesResult.data)
  const unitsOfMeasure = asArray(uomsResult.data)
  const locations = asArray(locationsResult.data)
  const suppliers = asArray(suppliersResult.data)
  const users = asArray(usersResult.data)
  const productsRaw = asArray(productsResult.data)
  const alertsRaw = asArray(alertsResult.data)
  const purchaseOrdersRaw = asArray(poResult.data)
  const purchaseOrderItemsRaw = asArray(poItemsResult.data)
  const salesTransactionsRaw = asArray(salesResult.data)
  const salesTransactionItemsRaw = asArray(salesItemsResult.data)
  const stockMovements = asArray(movementResult.data)

  const categoryById = new Map(categories.map((row) => [row.id, row]))
  const uomById = new Map(unitsOfMeasure.map((row) => [row.id, row]))
  const locationById = new Map(locations.map((row) => [row.id, row]))
  const supplierById = new Map(suppliers.map((row) => [row.id, row]))
  const userById = new Map(users.map((row) => [row.id, row]))
  const productById = new Map<string, AnyRow>()

  const products = mapRow(productsRaw, (row) => {
    const product = {
      ...row,
      category: row.category_id ? categoryById.get(row.category_id) ?? undefined : undefined,
      supplier: row.supplier_id ? supplierById.get(row.supplier_id) ?? undefined : undefined,
      location: row.location_id ? locationById.get(row.location_id) ?? undefined : undefined,
      uom: row.uom_id ? uomById.get(row.uom_id) ?? undefined : undefined,
    }
    productById.set(product.id, product)
    return product
  })

  const purchaseOrderItems = mapRow(purchaseOrderItemsRaw, (row) => ({
    ...row,
    product: productById.get(row.product_id) ?? undefined,
  }))

  const salesTransactionItems = mapRow(salesTransactionItemsRaw, (row) => ({
    ...row,
    product: productById.get(row.product_id) ?? undefined,
  }))

  const purchaseOrderItemsByPoId = new Map<string, AnyRow[]>()
  for (const item of purchaseOrderItems) {
    const list = purchaseOrderItemsByPoId.get(item.po_id) ?? []
    list.push(item)
    purchaseOrderItemsByPoId.set(item.po_id, list)
  }

  const salesItemsByTxId = new Map<string, AnyRow[]>()
  for (const item of salesTransactionItems) {
    const list = salesItemsByTxId.get(item.transaction_id) ?? []
    list.push(item)
    salesItemsByTxId.set(item.transaction_id, list)
  }

  const purchaseOrders = mapRow(purchaseOrdersRaw, (row) => ({
    ...row,
    supplier: row.supplier_id ? supplierById.get(row.supplier_id) ?? undefined : undefined,
    items: purchaseOrderItemsByPoId.get(row.id) ?? [],
  }))

  const salesTransactions = mapRow(salesTransactionsRaw, (row) => ({
    ...row,
    cashier: row.cashier_id ? userById.get(row.cashier_id) ?? undefined : undefined,
    items: salesItemsByTxId.get(row.id) ?? [],
  }))

  const alerts = mapRow(alertsRaw, (row) => ({
    ...row,
    product: row.product_id ? productById.get(row.product_id) ?? undefined : undefined,
  }))

  return {
    tenant,
    currentUserId: users.find((user) => user.role === 'super_admin')?.id ?? users.find((user) => user.role === 'admin')?.id ?? users[0]?.id ?? '',
    categories,
    unitsOfMeasure,
    locations,
    suppliers,
    products,
    users,
    purchaseOrders,
    purchaseOrderItems,
    salesTransactions,
    salesTransactionItems,
    stockMovements,
    alerts,
  } satisfies DemoSystemState
}

export async function upsertTenantState(state: DemoSystemState) {
  const client = getSupabaseAdminClient()
  const tenantId = state.tenant.id

  const upsert = async (table: string, rows: AnyRow[]) => {
    if (!rows.length) return
    const { error } = await client.from(table).upsert(rows, { onConflict: 'id' })
    if (error) throw error
  }

  const prune = async (table: string, keepIds: string[]) => {
    const { data, error } = await client.from(table).select('id').eq('tenant_id', tenantId)
    if (error) throw error

    const currentIds = asArray(data).map((row) => String(row.id))
    const staleIds = currentIds.filter((id) => !keepIds.includes(id))
    if (!staleIds.length) return

    const { error: deleteError } = await client.from(table).delete().in('id', staleIds)
    if (deleteError) throw deleteError
  }

  const tenantRow = {
    ...state.tenant,
    plan: state.tenant.plan as SubscriptionPlan,
    subscription_status: state.tenant.subscription_status as SubscriptionStatus,
  }

  const productRows = state.products.map(({ category, supplier, location, uom, ...row }) => row)
  const purchaseOrderRows = state.purchaseOrders.map(({ supplier, items, ...row }) => row)
  const salesTransactionRows = state.salesTransactions.map(({ cashier, items, ...row }) => row)
  const purchaseOrderItemRows = state.purchaseOrderItems.map(({ product, ...row }) => row)
  const salesTransactionItemRows = state.salesTransactionItems.map(({ product, ...row }) => row)
  const alertRows = state.alerts.map(({ product, ...row }) => row)

  await upsert('tenants', [tenantRow])
  await upsert('categories', state.categories)
  await upsert('units_of_measure', state.unitsOfMeasure)
  await upsert('locations', state.locations)
  await upsert('suppliers', state.suppliers)
  await upsert('users', state.users)
  await upsert('products', productRows)
  await upsert('purchase_orders', purchaseOrderRows)
  await upsert('sales_transactions', salesTransactionRows)
  await upsert('purchase_order_items', purchaseOrderItemRows)
  await upsert('sales_transaction_items', salesTransactionItemRows)
  await upsert('alerts', alertRows)
  await upsert('stock_movements', state.stockMovements)

  await Promise.all([
    prune('categories', state.categories.map((row) => row.id)),
    prune('units_of_measure', state.unitsOfMeasure.map((row) => row.id)),
    prune('locations', state.locations.map((row) => row.id)),
    prune('suppliers', state.suppliers.map((row) => row.id)),
    prune('users', state.users.map((row) => row.id)),
    prune('products', state.products.map((row) => row.id)),
    prune('purchase_orders', state.purchaseOrders.map((row) => row.id)),
    prune('sales_transactions', state.salesTransactions.map((row) => row.id)),
    prune('alerts', state.alerts.map((row) => row.id)),
    prune('stock_movements', state.stockMovements.map((row) => row.id)),
  ])
}

function normalizeSeedState(state: DemoSystemState, tenantId?: string) {
  return tenantId ? remapStateTenantId(state, tenantId) : state
}

export async function ensureDatabaseState(tenantId?: string | null, businessType: BusinessType = 'coffee_shop') {
  const existing = await loadTenantState(tenantId)
  if (existing) return existing

  const seed = normalizeSeedState(seedDemoSystem(businessType))
  await upsertTenantState(seed)
  return seed
}

export async function applyDatabaseMutation(
  currentTenantId: string,
  mutation: MutationPayload
): Promise<DemoSystemState> {
  let state = await ensureDatabaseState(currentTenantId)

  switch (mutation.action) {
    case 'resetDemo': {
      const next = normalizeSeedState(seedDemoSystem(mutation.businessType ?? state.tenant.business_type), state.tenant.id)
      await upsertTenantState(next)
      return next
    }
    case 'updateTenant':
      state = updateTenantSettings(state, mutation.patch)
      break
    case 'saveProduct':
      state = addOrUpdateProduct(state, mutation.draft, mutation.productId)
      break
    case 'removeProduct':
      state = deleteProduct(state, mutation.productId)
      break
    case 'importProductRows':
      state = importProducts(state, mutation.drafts)
      break
    case 'addSupplier':
      state = createSupplier(state, mutation.draft)
      break
    case 'editSupplier':
      state = updateSupplier(state, mutation.supplierId, mutation.draft)
      break
    case 'removeSupplier':
      state = deleteSupplier(state, mutation.supplierId)
      break
    case 'addUser':
      state = createUser(state, mutation.draft)
      break
    case 'toggleUser':
      state = toggleUserActive(state, mutation.userId)
      break
    case 'createPO':
      state = createPurchaseOrder(state, mutation.draft)
      break
    case 'receivePO':
      state = receivePurchaseOrder(state, mutation.purchaseOrderId)
      break
    case 'completeSale':
      state = recordSale(state, mutation.payload).state
      break
    case 'acknowledge':
      state = acknowledgeAlert(state, mutation.alertId)
      break
    case 'resolve':
      state = resolveAlert(state, mutation.alertId)
      break
  }

  await upsertTenantState(state)
  return state
}
