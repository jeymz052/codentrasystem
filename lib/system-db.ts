import { randomUUID } from 'crypto'
import type { DemoSystemState } from '@/lib/demo-system'
import {
  addOrUpdateProduct,
  reorderFromAlert,
  reorderAllAlerts,
  syncAlerts,
  closeShift,
  createCategory,
  updateCategory,
  deleteCategory,
  createPurchaseOrder,
  cancelPurchaseOrder,
  createUser,
  createUnitOfMeasure,
  updateUnitOfMeasure,
  deleteUnitOfMeasure,
  createLocation,
  createSupplier,
  deleteLocation,
  updateLocation,
  deleteProduct,
  deleteProducts,
  deleteSupplier,
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
  refundTransaction,
  resolveAlert,
  seedDemoSystem,
  setWasteTypes,
  toggleProductActive,
  toggleUserActive,
  updatePurchaseOrder,
  updateSupplier,
  updateTenantSettings,
  updateUser,
  markInviteResent,
  voidTransaction,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  createProductionTemplate,
  deleteProductionTemplate,
  produceFinishedGood,
  createTransfer,
  requestDeletion,
  approveDeletion,
  rejectDeletion,
  markNotificationRead,
  markAllNotificationsRead,
  buildSaleTransactionId,
  type CategoryDraft,
  type LocationDraft,
  type ProductDraft,
  type PurchaseOrderDraft,
  type SaleDraftItem,
  type SupplierDraft,
  type UnitOfMeasureDraft,
  type UserDraft,
} from '@/lib/demo-system'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { BusinessType, CashMovementKind, MutationAction, PaymentMethod, SubscriptionPlan, SubscriptionStatus, UserRole } from '@/types/database'

type AnyRow = Record<string, any>

type MutationPayload =
  | { action: 'resetDemo'; businessType?: BusinessType }
  | { action: 'updateTenant'; patch: Partial<DemoSystemState['tenant']> & { business_type?: BusinessType } }
  | { action: 'addCategory'; draft: CategoryDraft }
  | { action: 'editCategory'; categoryId: string; draft: CategoryDraft }
  | { action: 'deleteCategory'; categoryId: string }
  | { action: 'addUnitOfMeasure'; draft: UnitOfMeasureDraft }
  | { action: 'editUnitOfMeasure'; uomId: string; draft: UnitOfMeasureDraft }
  | { action: 'deleteUnitOfMeasure'; uomId: string }
  | { action: 'addLocation'; draft: LocationDraft }
  | { action: 'updateLocation'; locationId: string; draft: LocationDraft }
  | { action: 'deleteLocation'; locationId: string }
  | { action: 'saveProduct'; draft: ProductDraft; productId?: string }
  | { action: 'removeProduct'; productId: string; itemCode?: string }
  | { action: 'removeProducts'; productIds: string[]; itemCodes?: string[] }
  | { action: 'importProductRows'; drafts: ProductDraft[] }
  | { action: 'addSupplier'; draft: SupplierDraft }
  | { action: 'editSupplier'; supplierId: string; draft: SupplierDraft }
  | { action: 'removeSupplier'; supplierId: string }
  | { action: 'addUser'; draft: UserDraft }
  | { action: 'editUser'; userId: string; draft: { full_name: string; email: string; role: UserRole } }
  | { action: 'toggleUser'; userId: string }
  | { action: 'toggleProduct'; productId: string }
  | { action: 'resendInvite'; draft: UserDraft }
  | { action: 'createRecipe'; finishedGoodId: string; ingredientId: string; quantityPerUnit: number; uomId?: string | null }
  | { action: 'updateRecipe'; recipeId: string; quantityPerUnit: number; uomId?: string | null }
  | { action: 'deleteRecipe'; recipeId: string }
  | { action: 'createProductionTemplate'; name: string; finishedGoodId: string; quantity: number; locationId?: string | null; notes?: string | null }
  | { action: 'deleteProductionTemplate'; templateId: string }
  | { action: 'produceFinishedGood'; finishedGoodId: string; quantity: number; locationId?: string | null }
  | { action: 'createPO'; draft: PurchaseOrderDraft; orderId: string }
  | { action: 'receivePO'; purchaseOrderId: string }
  | { action: 'completeSale'; payload: { payment_method: PaymentMethod; payment_provider?: string; payment_reference?: string | null; amount_tendered: number; location_id: string | null; notes?: string; items: SaleDraftItem[]; receiptNumber?: string; transactionId?: string; itemIds?: string[]; movementIds?: string[]; auditLogId?: string; split_payments?: Array<{ payment_method: PaymentMethod; amount: number; reference?: string | null }> } }
  | { action: 'voidSale'; transactionId: string; reason?: string }
  | { action: 'refundSale'; transactionId: string; reason?: string }
  | { action: 'openShift'; payload: { openingFloat: number; locationId?: string | null; notes?: string } }
  | { action: 'closeShift'; payload: { shiftId: string; countedCash: number; notes?: string } }
  | { action: 'recordCashMovement'; payload: { shiftId: string; kind: CashMovementKind; amount: number; note?: string | null; denominations?: Record<string, number> | null } }
  | { action: 'acknowledge'; alertId: string }
  | { action: 'resolve'; alertId: string }
  | { action: 'reorderAlert'; alertId: string }
  | { action: 'reorderAllAlerts' }
  | { action: 'recordWaste'; productId: string; wasteType: 'waste' | 'defect' | 'reject'; quantity: number; reason?: string }
  | { action: 'setWasteTypes'; productId: string; waste: number; defect: number; reject: number; reason?: string }
  | { action: 'reverseWaste'; movementId: string }
  | { action: 'editWaste'; movementId: string; wasteType: 'waste' | 'defect' | 'reject'; quantity: number; reason?: string }
  | { action: 'transferStock'; payload: { productId: string; fromLocationId: string | null; toLocationId: string | null; quantity: number; notes?: string } }
  | { action: 'updatePurchaseOrder'; purchaseOrderId: string; draft: PurchaseOrderDraft }
  | { action: 'cancelPurchaseOrder'; purchaseOrderId: string }
  | { action: 'requestDeletion'; requestedAction: MutationAction; targetType: string; targetId: string; details: Record<string, unknown>; requestedBy: string }
  | { action: 'approveDeletion'; requestId: string }
  | { action: 'rejectDeletion'; requestId: string }
  | { action: 'markNotificationRead'; notificationId: string }
  | { action: 'markAllNotificationsRead' }

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
    locations: state.locations.filter((location) => !location.is_waste_location).length,
  }[resource]

  const limit = Number(state.tenant[limitKey] ?? 0)
  if (currentCount >= limit) {
    throw new Error(`Data cannot be loaded due to Plan package limitation. Your ${state.tenant.plan} plan allows up to ${limit} ${resource}.`)
  }
}

export async function loadTenantState(tenantId?: string | null) {
  const client = getSupabaseAdminClient()
  const tenantQuery = tenantId
    ? client.from('tenants').select('*').eq('id', tenantId).maybeSingle()
    : client.from('tenants').select('*').order('created_at', { ascending: true }).limit(1)

  const tenantResult = await tenantQuery
  const tenantRow = tenantId ? (tenantResult.data ?? null) : firstRow(tenantResult.data as AnyRow[] | null)

  if (!tenantRow) {
    return null
  }

  const tenant = {
    ...tenantRow,
    pos_location_id: tenantRow.pos_location_id ?? null,
    pos_store_locations: Array.isArray(tenantRow.pos_store_locations) ? tenantRow.pos_store_locations : [],
    pos_stations: Array.isArray(tenantRow.pos_stations) ? tenantRow.pos_stations : [],
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
    auditLogsResult,
    recipesResult,
    cashShiftsResult,
    cashMovementsResult,
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
    client.from('audit_logs').select('*').eq('tenant_id', tenant.id).order('performed_at', { ascending: false }),
    client.from('product_recipes').select('*').eq('tenant_id', tenant.id),
    client.from('cash_shifts').select('*').eq('tenant_id', tenant.id),
    client.from('cash_movements').select('*').eq('tenant_id', tenant.id),
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
  const auditLogs = asArray(auditLogsResult.data)
  const productRecipes = asArray(recipesResult.data)
  const cashShiftsRaw = asArray(cashShiftsResult.data)
  const cashMovementsRaw = asArray(cashMovementsResult.data)
  let deletionRequestsRaw: AnyRow[] = []
  try {
    const deletionResult = await client.from('deletion_requests').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false })
    deletionRequestsRaw = asArray(deletionResult.data as AnyRow[] | null)
  } catch {
    // deletion_requests table may not exist in older deployments; requests are best-effort loaded.
    deletionRequestsRaw = []
  }

  let notificationsRaw: AnyRow[] = []
  try {
    const notificationsResult = await client.from('notifications').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50)
    notificationsRaw = asArray(notificationsResult.data as AnyRow[] | null)
  } catch {
    // notifications table may not exist in older deployments; notifications are best-effort loaded.
    notificationsRaw = []
  }

  let inventoryLots: AnyRow[] = []
  try {
    const lotsResult = await client.from('inventory_lots').select('*').eq('tenant_id', tenant.id)
    inventoryLots = asArray(lotsResult.data)
  } catch {
    inventoryLots = []
  }

  let productionTemplates: AnyRow[] = []
  try {
    const templatesResult = await client.from('production_templates').select('*').eq('tenant_id', tenant.id)
    productionTemplates = asArray(templatesResult.data)
  } catch {
    productionTemplates = []
  }

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
    shift_id: row.shift_id ?? null,
    payment_provider: row.payment_provider ?? null,
    payment_reference: row.payment_reference ?? null,
    voided_by: row.voided_by ?? null,
    voided_at: row.voided_at ?? null,
    void_reason: row.void_reason ?? null,
    refunded_by: row.refunded_by ?? null,
    refunded_at: row.refunded_at ?? null,
    refund_reason: row.refund_reason ?? null,
    parent_transaction_id: row.parent_transaction_id ?? null,
    split_payments: Array.isArray(row.split_payments) && row.split_payments.length > 0 ? row.split_payments : undefined,
    cash_sales_total: Number(row.cash_sales_total ?? 0),
    qr_sales_total: Number(row.qr_sales_total ?? 0),
    cashier: row.cashier_id ? userById.get(row.cashier_id) ?? undefined : undefined,
    items: salesItemsByTxId.get(row.id) ?? [],
  }))

  const alerts = mapRow(alertsRaw, (row) => ({
    ...row,
    product: row.product_id ? productById.get(row.product_id) ?? undefined : undefined,
  }))

  const built = {
    tenant,
    currentUserId: users.find((user) => user.role === 'super_admin')?.id ?? users.find((user) => user.role === 'admin')?.id ?? users[0]?.id ?? '',
    categories,
    unitsOfMeasure,
    locations,
    suppliers,
    products,
    users,
    cashShifts: cashShiftsRaw.map((row) => ({
      ...row,
      opened_by_user: userById.get(row.opened_by) ?? undefined,
      closed_by_user: row.closed_by ? userById.get(row.closed_by) ?? null : null,
      location: row.location_id ? locationById.get(row.location_id) ?? undefined : undefined,
    })),
    purchaseOrders,
    purchaseOrderItems,
    salesTransactions,
    salesTransactionItems,
    stockMovements,
    alerts,
    auditLogs,
    productRecipes,
    productionTemplates: productionTemplates as DemoSystemState['productionTemplates'],
    cashMovements: cashMovementsRaw.map((row) => ({
      ...row,
    })),
    deletionRequests: deletionRequestsRaw.map((row) => ({
      ...row,
      requested_by_user: userById.get(row.requested_by) ?? undefined,
      reviewed_by_user: row.reviewed_by ? userById.get(row.reviewed_by) ?? null : null,
    })) as DemoSystemState['deletionRequests'],
    inventoryLots: inventoryLots as DemoSystemState['inventoryLots'],
    notifications: notificationsRaw as DemoSystemState['notifications'],
  } satisfies DemoSystemState
  // Reconcile alerts against current product stock on every load so stale
  // out_of_stock / low_stock rows (left over from when an item was at zero
  // but has since been restocked) are never shown, and resolved alerts don't
  // reappear for items that are actually fine.
  const state = built
  return syncAlerts(state)
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
    // Safety guard: never mass-delete a table. If the in-memory state ever
    // loses its rows (merge bug, stale snapshot, empty list), an unguarded
    // prune would delete EVERY row for the tenant and make all data vanish on
    // the next reload. Only prune when we actually have a non-empty keep-set.
    if (!keepIds.length) return

    const { data, error } = await client.from(table).select('id').eq('tenant_id', tenantId)
    if (error) throw error

    const currentIds = asArray(data).map((row) => String(row.id))
    const staleIds = currentIds.filter((id) => !keepIds.includes(id))
    if (!staleIds.length) return

    const { error: deleteError } = await client.from(table).delete().in('id', staleIds)
    if (deleteError) throw deleteError
  }

  // sales_transaction_items / purchase_order_items have no tenant_id column
  // (they're isolated via their parent transaction / PO). Prune orphaned rows
  // for this tenant by scoping to the parent ids we still keep, then dropping
  // any row whose id isn't in the current state (e.g. an item referencing a
  // product that was just deleted).
  const pruneByParent = async (table: string, parentColumn: string, parentKeepIds: string[], keepRowIds: string[]) => {
    if (!parentKeepIds.length) return
    const { data, error } = await client.from(table).select('id').in(parentColumn, parentKeepIds)
    if (error) throw error

    const currentIds = asArray(data).map((row) => String(row.id))
    const staleIds = currentIds.filter((id) => !keepRowIds.includes(id))
    if (!staleIds.length) return

    const { error: deleteError } = await client.from(table).delete().in('id', staleIds)
    if (deleteError) throw deleteError
  }

  const tenantRow = {
    ...state.tenant,
    plan: state.tenant.plan as SubscriptionPlan,
    subscription_status: state.tenant.subscription_status as SubscriptionStatus,
    pos_location_id: state.tenant.pos_location_id ?? null,
    pos_store_locations: Array.isArray(state.tenant.pos_store_locations) ? state.tenant.pos_store_locations : [],
    pos_stations: Array.isArray(state.tenant.pos_stations) ? state.tenant.pos_stations : [],
  }

  const productRows = state.products.map(({ category, supplier, location, uom, ...row }) => row)
  const purchaseOrderRows = state.purchaseOrders.map(({ supplier, items, ...row }) => row)
  const salesTransactionRows = state.salesTransactions.map(({ cashier, items, split_payments, cash_sales_total, qr_sales_total, ...row }) => ({
    ...row,
    // Persist the full split breakdown so the transactions list can reflect the
    // real mode(s) of payment instead of collapsing every sale to a single method.
    split_payments: split_payments && split_payments.length > 0 ? split_payments : null,
    cash_sales_total: cash_sales_total ?? 0,
    qr_sales_total: qr_sales_total ?? 0,
  }))
  const purchaseOrderItemRows = state.purchaseOrderItems.map(({ product, ...row }) => row)
  const salesTransactionItemRows = state.salesTransactionItems.map(({ product, ...row }) => row)
  const alertRows = state.alerts.map(({ product, purchase_order_id, ...row }) => row)
  const auditLogRows = state.auditLogs.map(({ performed_by, ...row }) => row)
  const recipeRows = state.productRecipes.map((row) => row)
  const stockMovementRows = state.stockMovements.map(({ product, ...row }) => row)
  const cashShiftRows = state.cashShifts.map(({ opened_by_user, closed_by_user, location, ...row }) => row)
  const cashMovementRows = state.cashMovements.map(({ performed_by, ...row }) => row)
  const deletionRequestRows = state.deletionRequests.map(({ requested_by_user, reviewed_by_user, ...row }) => row)
  const notificationRows = state.notifications.map((row) => row)

  const baseTenantRow = {
    id: tenantId,
    name: state.tenant.name,
    business_type: state.tenant.business_type,
    logo_url: state.tenant.logo_url,
    address: state.tenant.address,
    phone: state.tenant.phone,
    email: state.tenant.email,
    tax_id: state.tenant.tax_id,
    currency: state.tenant.currency,
    timezone: state.tenant.timezone,
    billing_email: state.tenant.billing_email,
    plan: state.tenant.plan,
    subscription_status: state.tenant.subscription_status,
    trial_ends_at: state.tenant.trial_ends_at,
    subscription_ends_at: state.tenant.subscription_ends_at,
    max_users: state.tenant.max_users,
    max_products: state.tenant.max_products,
    max_locations: state.tenant.max_locations,
    stripe_customer_id: state.tenant.stripe_customer_id,
    stripe_subscription_id: state.tenant.stripe_subscription_id,
    stripe_price_id: state.tenant.stripe_price_id,
    is_active: state.tenant.is_active,
    created_at: state.tenant.created_at,
    updated_at: state.tenant.updated_at,
  }
  await upsert('tenants', [baseTenantRow])

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
  await upsert('notifications', notificationRows)
  await upsert('stock_movements', stockMovementRows)
  await upsert('audit_logs', auditLogRows)
  await upsert('product_recipes', recipeRows)
  await upsert('cash_shifts', cashShiftRows)
  await upsert('cash_movements', cashMovementRows)

  try {
    await upsert('inventory_lots', state.inventoryLots)
    await prune('inventory_lots', state.inventoryLots.map((row) => row.id))
  } catch {
    // inventory_lots table may not exist in older deployments; FIFO lots are best-effort persisted.
  }

  try {
    await upsert('production_templates', state.productionTemplates)
    await prune('production_templates', state.productionTemplates.map((row) => row.id))
  } catch {
    // production_templates table may not exist in older deployments; templates are best-effort persisted.
  }

  try {
    await upsert('deletion_requests', deletionRequestRows)
    await prune('deletion_requests', state.deletionRequests.map((row) => row.id))
  } catch {
    // deletion_requests table may not exist in older deployments; requests are best-effort persisted.
  }

  // Prune product-dependent rows FIRST. Several child tables use
  // ON DELETE RESTRICT on product_id, so deleting a product while its rows
  // still exist fails with a 500. Removing the children before the products
  // guarantees the product prune (below) succeeds.
  await Promise.all([
    pruneByParent('sales_transaction_items', 'transaction_id', state.salesTransactions.map((row) => row.id), state.salesTransactionItems.map((row) => row.id)),
    pruneByParent('purchase_order_items', 'po_id', state.purchaseOrders.map((row) => row.id), state.purchaseOrderItems.map((row) => row.id)),
    prune('stock_movements', state.stockMovements.map((row) => row.id)),
    prune('inventory_lots', state.inventoryLots.map((row) => row.id)),
    prune('alerts', state.alerts.map((row) => row.id)),
    prune('notifications', state.notifications.map((row) => row.id)),
    prune('product_recipes', state.productRecipes.map((row) => row.id)),
  ])

  await Promise.all([
    prune('categories', state.categories.map((row) => row.id)),
    prune('units_of_measure', state.unitsOfMeasure.map((row) => row.id)),
    prune('locations', state.locations.map((row) => row.id)),
    prune('suppliers', state.suppliers.map((row) => row.id)),
    prune('users', state.users.map((row) => row.id)),
    prune('products', state.products.map((row) => row.id)),
    prune('purchase_orders', state.purchaseOrders.map((row) => row.id)),
    prune('sales_transactions', state.salesTransactions.map((row) => row.id)),
    prune('audit_logs', state.auditLogs.map((row) => row.id)),
    prune('notifications', state.notifications.map((row) => row.id)),
    prune('production_templates', state.productionTemplates.map((row) => row.id)),
    prune('cash_shifts', state.cashShifts.map((row) => row.id)),
    prune('cash_movements', state.cashMovements.map((row) => row.id)),
  ])

  // The base tenant row was already inserted above (before child tables) to
  // satisfy FK constraints. Now persist the full tenant row with newer optional
  // columns (JSONB fields such as payment_accounts). If a migration hasn't been
  // applied yet the upsert would throw. Previously that aborted the whole save
  // — dropping sales, stock and other transactional data so it "disappeared"
  // after a reload. We therefore never let a tenant-column error abort
  // persistence: on failure we retry without the optional JSONB columns and
  // otherwise continue, so the business data is always saved even before every
  // migration is deployed.
  const optionalTenantColumns = ['payment_accounts', 'pos_store_locations', 'pos_stations']
  try {
    await upsert('tenants', [tenantRow])
  } catch (error) {
    console.warn('[upsertTenantState] tenant upsert failed; retrying without optional columns', error)
    const fallback = { ...tenantRow } as Record<string, unknown>
    for (const column of optionalTenantColumns) delete fallback[column]
    try {
      await upsert('tenants', [fallback as AnyRow])
    } catch (fallbackError) {
      console.warn('[upsertTenantState] tenant upsert failed even without optional columns', fallbackError)
    }
  }
}

function normalizeSeedState(state: DemoSystemState, tenantId?: string) {
  return tenantId ? remapStateTenantId(state, tenantId) : state
}

// Builds the "set up your password" URL invitees are redirected to. Prefers the
// live request origin (so a link created on localhost points back to localhost,
// and one created on the deployed domain points to that domain), and falls back
// to NEXT_PUBLIC_APP_URL, then to the Supabase-configured Site URL.
// NOTE: whatever origin is used must be listed under Supabase Auth -> URL
// Configuration -> Redirect URLs, otherwise Supabase rejects the invite.
function resolveInviteRedirect(origin?: string | null) {
  const base = (origin || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  return base ? `${base}/set-password` : undefined
}

export async function provisionTenantUserAccess(tenantId: string, draft: UserDraft, origin?: string | null) {
  const client = getSupabaseAdminClient()
  const email = draft.email.trim().toLowerCase()
  if (!email) {
    throw new Error('email is required')
  }

  // Pull the tenant name so the invitation email can greet the invitee with
  // the store they are being invited to.
  const { data: tenantRow } = await client
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .maybeSingle()
  const tenantName: string | null = tenantRow?.name ?? null

  const { data: usersResult, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) {
    throw new Error(`listUsers failed: ${listError.message}`)
  }

  const existing = usersResult.users.find((entry) => entry.email?.toLowerCase() === email) ?? null

  // Where the invitee lands to choose their password. Falls back to the
  // Supabase-configured Site URL when no origin/app URL is available.
  const redirectTo = resolveInviteRedirect(origin)

  const inviteMetadata = {
    full_name: draft.full_name?.trim() || null,
    invited_role: draft.role,
    tenant_name: tenantName,
    invitation: true,
  }

  let authUserId: string
  if (existing) {
    // The person already has a Codentra login. Don't send an invite (they
    // already have a password) — just grant them access to this tenant. Make
    // sure their display name is populated for a nicer experience.
    authUserId = existing.id
    if (draft.full_name?.trim() && !existing.user_metadata?.full_name) {
      await client.auth.admin.updateUserById(authUserId, {
        user_metadata: { ...existing.user_metadata, full_name: draft.full_name.trim() },
      })
    }
  } else {
    // Brand-new team member: send a dedicated invitation email that carries a
    // "set up your password" link (Supabase "Invite user" template), NOT the
    // generic password-reset email.
    const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
      data: inviteMetadata,
      ...(redirectTo ? { redirectTo } : {}),
    })
    if (error) {
      throw new Error(`inviteUserByEmail failed: ${error.message}`)
    }
    if (!data.user) {
      throw new Error('Invitation did not return a user')
    }
    authUserId = data.user.id
  }

  const { error: membershipError } = await client.from('tenant_memberships').upsert({
    id: randomUUID(),
    tenant_id: tenantId,
    auth_user_id: authUserId,
    role: draft.role,
    is_default: false,
  }, {
    onConflict: 'tenant_id,auth_user_id',
  })

  if (membershipError) {
    throw new Error(`membership upsert failed: ${membershipError.message}`)
  }

  // Mirror the membership into the app `users` table (keyed by the auth user
  // id, matching the convention used by addUser). Without this row, the tenant
  // admin exists in tenant_memberships but is absent from `users`, so the
  // tenant monitor's user count shows 0 even though the member is real.
  const now = new Date().toISOString()
  const { error: userError } = await client.from('users').upsert({
    id: authUserId,
    tenant_id: tenantId,
    role: draft.role,
    full_name: draft.full_name?.trim() || draft.email.split('@')[0] || 'User',
    email: email,
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: now,
    updated_at: now,
  }, {
    onConflict: 'id',
  })

  if (userError) {
    // A missing users row should not block the invitation itself.
    console.error('[provisionTenantUserAccess] users upsert failed:', userError.message)
  }

  return authUserId
}

// Re-sends the "set up your password" email to a pending invitee (someone who
// was invited but has not activated their account yet). Safe: it never touches
// a user who has already signed in / confirmed, so an active account can never
// be reset by this action.
async function resendTenantInvite(tenantId: string, draft: UserDraft, origin?: string | null) {
  const client = getSupabaseAdminClient()
  const email = draft.email.trim().toLowerCase()
  if (!email) {
    throw new Error('email is required')
  }

  const { data: tenantRow } = await client
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .maybeSingle()
  const tenantName: string | null = tenantRow?.name ?? null

  const { data: usersResult, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) {
    throw new Error(`listUsers failed: ${listError.message}`)
  }
  const existing = usersResult.users.find((entry) => entry.email?.toLowerCase() === email) ?? null

  // If the auth account no longer exists, fall back to a full (re)provision.
  if (!existing) {
    return provisionTenantUserAccess(tenantId, draft, origin)
  }

  // Never re-invite (which could reset) an account that is already active.
  if (existing.email_confirmed_at || existing.last_sign_in_at) {
    throw new Error('This user has already activated their account.')
  }

  const redirectTo = resolveInviteRedirect(origin)
  const inviteMetadata = {
    full_name: draft.full_name?.trim() || null,
    invited_role: draft.role,
    tenant_name: tenantName,
    invitation: true,
  }

  // Pending invitee. Supabase's inviteUserByEmail refuses to re-send to an
  // already-registered user ("already registered"), and a password-reset email
  // is the wrong (and often rate-limited) message. So delete the stale pending
  // account and invite fresh — this reliably delivers a real invitation email.
  const previousAuthUserId = existing.id
  const { error: deleteError } = await client.auth.admin.deleteUser(previousAuthUserId)
  if (deleteError) {
    throw new Error(`could not refresh invitation: ${deleteError.message}`)
  }

  const { data: invited, error: inviteError } = await client.auth.admin.inviteUserByEmail(email, {
    data: inviteMetadata,
    ...(redirectTo ? { redirectTo } : {}),
  })
  if (inviteError || !invited?.user) {
    throw new Error(`inviteUserByEmail failed: ${inviteError?.message ?? 'no user returned'}`)
  }
  const authUserId = invited.user.id

  // Relink the tenant membership to the fresh auth user id (the old row pointed
  // at the account we just deleted). Fall back to an upsert if nothing matched.
  const { data: relinked, error: relinkError } = await client.from('tenant_memberships')
    .update({ auth_user_id: authUserId })
    .eq('tenant_id', tenantId)
    .eq('auth_user_id', previousAuthUserId)
    .select('id')
  if (relinkError) {
    throw new Error(`membership relink failed: ${relinkError.message}`)
  }
  if (!relinked || relinked.length === 0) {
    const { error: membershipError } = await client.from('tenant_memberships').upsert({
      id: randomUUID(),
      tenant_id: tenantId,
      auth_user_id: authUserId,
      role: draft.role,
      is_default: false,
    }, {
      onConflict: 'tenant_id,auth_user_id',
    })
    if (membershipError) {
      throw new Error(`membership upsert failed: ${membershipError.message}`)
    }
  }

  // The app `users` row is keyed by the auth user id (users.id === auth id).
  // Since we deleted and recreated the auth account, its id changed, so the
  // stored row must be re-pointed too — otherwise sign-in can't find it to
  // stamp `last_login`, and the app can't recognize the user after they log in.
  // Safe here: a pending invitee has no activity rows referencing this id yet.
  const { error: userRelinkError } = await client.from('users')
    .update({ id: authUserId, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('id', previousAuthUserId)
  if (userRelinkError) {
    throw new Error(`user record relink failed: ${userRelinkError.message}`)
  }

  return authUserId
}

// Creates a tenant on behalf of the platform owner (super admin) for a specific
// client, with the contracted plan and its hard limits applied server-side. The
// client never supplies or can override the plan — this is the source of truth
// that enforces the agreed contract. Seeds default UOMs, categories and a Main
// Storage location the same way a fresh workspace is prepared.
const PROVISION_PLAN_LIMITS: Record<SubscriptionPlan, { max_users: number; max_products: number; max_locations: number }> = {
  starter: { max_users: 3, max_products: 100, max_locations: 1 },
  professional: { max_users: 10, max_products: 1000, max_locations: 5 },
  enterprise: { max_users: 999, max_products: 9999, max_locations: 99 },
}

export async function createProvisionedTenant(params: {
  name: string
  business_type: BusinessType
  plan: SubscriptionPlan
  billing_email?: string | null
  timezone?: string
}): Promise<string> {
  const client = getSupabaseAdminClient()
  const limits = PROVISION_PLAN_LIMITS[params.plan]
  const now = new Date().toISOString()
  const subscriptionEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await client
    .from('tenants')
    .insert({
      name: params.name,
      business_type: params.business_type,
      currency: 'PHP',
      timezone: params.timezone ?? 'Asia/Manila',
      plan: params.plan,
      subscription_status: 'active',
      trial_ends_at: null,
      subscription_ends_at: subscriptionEndsAt,
      max_users: limits.max_users,
      max_products: limits.max_products,
      max_locations: limits.max_locations,
      enable_production: params.business_type === 'manufacturing',
      is_active: true,
      billing_email: params.billing_email ?? null,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`create tenant failed: ${error.message}`)
  }

  const tenantId = data.id as string

  // Prepare the workspace the same way onboarding would: categories, UOMs, and
  // a default Main Storage location.
  await client.rpc('seed_tenant_defaults', {
    p_tenant_id: tenantId,
    p_business_type: params.business_type,
  })

  return tenantId
}

export async function ensureDatabaseState(tenantId?: string | null, businessType: BusinessType = 'retail') {
  const existing = await loadTenantState(tenantId)
  if (existing) return existing

  const seed = normalizeSeedState(seedDemoSystem(businessType))
  await upsertTenantState(seed)
  return seed
}

export async function applyDatabaseMutation(
  currentTenantId: string,
  mutation: MutationPayload,
  origin?: string | null
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
    case 'addCategory':
      state = createCategory(state, mutation.draft)
      break
    case 'editCategory':
      state = updateCategory(state, mutation.categoryId, mutation.draft)
      break
    case 'deleteCategory':
      state = deleteCategory(state, mutation.categoryId)
      break
    case 'addUnitOfMeasure':
      state = createUnitOfMeasure(state, mutation.draft)
      break
    case 'editUnitOfMeasure':
      state = updateUnitOfMeasure(state, mutation.uomId, mutation.draft)
      break
    case 'deleteUnitOfMeasure':
      state = deleteUnitOfMeasure(state, mutation.uomId)
      break
    case 'addLocation':
      state = createLocation(state, mutation.draft)
      break
    case 'updateLocation':
      state = updateLocation(state, mutation.locationId, mutation.draft)
      break
    case 'deleteLocation':
      state = deleteLocation(state, mutation.locationId)
      break
    case 'saveProduct':
      state = addOrUpdateProduct(state, mutation.draft, mutation.productId)
      break
    case 'removeProduct':
      state = deleteProduct(state, mutation.productId, mutation.itemCode)
      break
    case 'removeProducts':
      state = deleteProducts(state, mutation.productIds, mutation.itemCodes)
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
      const authUserId = await provisionTenantUserAccess(currentTenantId, mutation.draft, origin)
      state = createUser(state, mutation.draft, authUserId)
      break
    case 'editUser':
      state = updateUser(state, mutation.userId, mutation.draft)
      break
    case 'toggleUser':
      state = toggleUserActive(state, mutation.userId)
      break
    case 'toggleProduct':
      state = toggleProductActive(state, mutation.productId)
      break
    case 'resendInvite':
      await resendTenantInvite(currentTenantId, mutation.draft, origin)
      state = markInviteResent(state, mutation.draft.email)
      break
    case 'createRecipe':
      state = createRecipe(state, mutation.finishedGoodId, mutation.ingredientId, mutation.quantityPerUnit, mutation.uomId)
      break
    case 'updateRecipe':
      state = updateRecipe(state, mutation.recipeId, mutation.quantityPerUnit, mutation.uomId)
      break
    case 'deleteRecipe':
      state = deleteRecipe(state, mutation.recipeId)
      break
    case 'createProductionTemplate':
      state = createProductionTemplate(state, { name: mutation.name, finishedGoodId: mutation.finishedGoodId, quantity: mutation.quantity, locationId: mutation.locationId, notes: mutation.notes })
      break
    case 'deleteProductionTemplate':
      state = deleteProductionTemplate(state, mutation.templateId)
      break
    case 'produceFinishedGood':
      state = produceFinishedGood(state, mutation.finishedGoodId, mutation.quantity, mutation.locationId)
      break
    case 'createPO':
      state = createPurchaseOrder(state, mutation.draft, mutation.orderId)
      break
    case 'receivePO':
      state = receivePurchaseOrder(state, mutation.purchaseOrderId)
      break
    case 'completeSale': {
      const payload = { ...mutation.payload }
      const existingReceipts = new Set(state.salesTransactions.map((tx) => tx.receipt_number))
      if (payload.receiptNumber && existingReceipts.has(payload.receiptNumber)) {
        payload.receiptNumber = buildSaleTransactionId(state)
      }
      let result = recordSale(state, payload)
      state = result.state
      try {
        await upsertTenantState(state)
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('receipt_number') && message.includes('already exists')) {
          state = await ensureDatabaseState(state.tenant.id)
          payload.receiptNumber = buildSaleTransactionId(state)
          result = recordSale(state, payload)
          state = result.state
          await upsertTenantState(state)
        } else {
          throw error
        }
      }
      break
    }
    case 'voidSale':
      state = voidTransaction(state, { transactionId: mutation.transactionId, reason: mutation.reason })
      break
    case 'refundSale':
      state = refundTransaction(state, { transactionId: mutation.transactionId, reason: mutation.reason })
      break
    case 'openShift':
      state = openShift(state, mutation.payload)
      break
    case 'closeShift':
      const closed = closeShift(state, mutation.payload)
      if (!closed) throw new Error('Shift not found or already closed')
      state = closed
      break
    case 'recordCashMovement':
      state = recordCashMovement(state, mutation.payload)
      break
    case 'acknowledge':
      state = resolveAlert(state, mutation.alertId)
      break
    case 'resolve':
      state = resolveAlert(state, mutation.alertId)
      break
    case 'reorderAlert':
      state = reorderFromAlert(state, mutation.alertId)
      break
    case 'reorderAllAlerts':
      state = reorderAllAlerts(state)
      break
    case 'recordWaste':
      state = recordWaste(state, { productId: mutation.productId, wasteType: mutation.wasteType, quantity: mutation.quantity, reason: mutation.reason })
      break
    case 'setWasteTypes':
      state = setWasteTypes(
        state,
        mutation.productId,
        { waste: Number(mutation.waste) || 0, defect: Number(mutation.defect) || 0, reject: Number(mutation.reject) || 0 },
        mutation.reason
      )
      break
    case 'reverseWaste':
      state = reverseWaste(state, mutation.movementId)
      break
    case 'editWaste':
      state = editWaste(state, mutation.movementId, { wasteType: mutation.wasteType, quantity: mutation.quantity, reason: mutation.reason })
      break
    case 'transferStock':
      state = createTransfer(state, mutation.payload)
      break
    case 'updatePurchaseOrder':
      state = updatePurchaseOrder(state, { purchaseOrderId: mutation.purchaseOrderId, draft: mutation.draft })
      break
    case 'cancelPurchaseOrder':
      state = cancelPurchaseOrder(state, mutation.purchaseOrderId)
      break
    case 'requestDeletion':
      state = requestDeletion(state, mutation.requestedAction, mutation.targetType, mutation.targetId, mutation.details, mutation.requestedBy)
      break
    case 'approveDeletion':
      state = approveDeletion(state, mutation.requestId)
      break
    case 'rejectDeletion':
      state = rejectDeletion(state, mutation.requestId)
      break
    case 'markNotificationRead':
      state = markNotificationRead(state, mutation.notificationId)
      break
    case 'markAllNotificationsRead':
      state = markAllNotificationsRead(state)
      break
  }

  await upsertTenantState(state)
  return state
}
