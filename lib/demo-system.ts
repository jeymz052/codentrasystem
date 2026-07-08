import type {
  Alert,
  AlertStatus,
  AlertType,
  AuditLog,
  BusinessType,
  CashShift,
  Category,
  DashboardStats,
  Location,
  MovementType,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductRecipe,
  PurchaseOrder,
  PurchaseOrderItem,
  SalesTransaction,
  SalesTransactionItem,
  ShiftStatus,
  StockMovement,
  Supplier,
  SubscriptionPlan,
  Tenant,
  TransactionStatus,
  UnitOfMeasure,
  User,
  UserRole,
} from '@/types/database'
export { formatCurrency } from '@/lib/utils'

export type ProductDraft = {
  item_code: string
  name: string
  category: string
  uom: string
  unit_cost: number
  selling_price: number
  quantity_on_hand: number
  reorder_point: number
  supplier: string
  location: string
  description?: string
}

export type SupplierDraft = {
  name: string
  contact_name: string
  email: string
  phone: string
  address: string
  lead_days: number
  notes: string
}

export type CategoryDraft = {
  name: string
  color?: string
  description?: string
}

export type UnitOfMeasureDraft = {
  name: string
  abbreviation: string
}

export type LocationDraft = {
  code: string
  name: string
  zone?: string
}

export type UserDraft = {
  full_name: string
  email: string
  role: UserRole
}

export type PurchaseOrderDraft = {
  supplier_id: string
  expected_date: string
  notes: string
  items: Array<{
    product_id: string
    quantity_ordered: number
    unit_cost: number
  }>
}

export type SaleDraftItem = {
  product_id: string
  quantity: number
  unit_price: number
  unit_cost: number | null
  discount: number
}

export type DemoSystemState = {
  tenant: Tenant
  currentUserId: string
  categories: Category[]
  unitsOfMeasure: UnitOfMeasure[]
  locations: Location[]
  suppliers: Supplier[]
  products: Product[]
  users: User[]
  cashShifts: CashShift[]
  purchaseOrders: PurchaseOrder[]
  purchaseOrderItems: PurchaseOrderItem[]
  salesTransactions: SalesTransaction[]
  salesTransactionItems: SalesTransactionItem[]
  stockMovements: StockMovement[]
  alerts: Alert[]
  auditLogs: AuditLog[]
  productRecipes: ProductRecipe[]
}

const PLAN_LIMITS: Record<SubscriptionPlan, Pick<Tenant, 'max_users' | 'max_products' | 'max_locations'>> = {
  starter: { max_users: 3, max_products: 100, max_locations: 1 },
  professional: { max_users: 10, max_products: 1000, max_locations: 5 },
  enterprise: { max_users: 999, max_products: 9999, max_locations: 99 },
}

function id() {
  const crypto = globalThis.crypto
  if (crypto?.randomUUID) return crypto.randomUUID()

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.random() * 16 | 0
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8
    return value.toString(16)
  })
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function lower(value: string) {
  return normalizeName(value).toLowerCase()
}

function isValidBusinessType(value: string): value is BusinessType {
  return ['coffee_shop', 'manufacturing', 'convenience_store', 'restaurant', 'retail', 'pharmacy', 'general'].includes(value)
}

export function normalizeBusinessType(value?: string | null): BusinessType {
  return isValidBusinessType(String(value ?? '').trim()) ? String(value).trim() as BusinessType : 'general'
}

function baseTenant(businessType: BusinessType): Tenant {
  const limits = PLAN_LIMITS.starter
  const timestamp = nowIso()
  return {
    id: id(),
    name: 'Untitled Workspace',
    business_type: businessType,
    logo_url: null,
    address: null,
    phone: null,
    email: null,
    tax_id: null,
    currency: 'PHP',
    timezone: 'Asia/Manila',
    plan: 'starter',
    subscription_status: 'trial',
    trial_ends_at: null,
    subscription_ends_at: null,
    max_users: limits.max_users,
    max_products: limits.max_products,
    max_locations: limits.max_locations,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
    billing_email: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
  }
}

function emptyState(businessType: BusinessType): DemoSystemState {
  return {
    tenant: baseTenant(businessType),
    currentUserId: '',
    categories: [],
    unitsOfMeasure: [],
    locations: [],
    suppliers: [],
    products: [],
    users: [],
    cashShifts: [],
    purchaseOrders: [],
    purchaseOrderItems: [],
    salesTransactions: [],
    salesTransactionItems: [],
    stockMovements: [],
    alerts: [],
    auditLogs: [],
    productRecipes: [],
  }
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

export function seedDemoSystem(businessType: BusinessType = 'general'): DemoSystemState {
  const tenant = baseTenant(normalizeBusinessType(businessType))
  const baseTime = '2026-07-07T08:00:00.000Z'

  const categories: Category[] = [
    { id: id(), tenant_id: tenant.id, name: 'Coffee Beans', description: null, color: '#3B82F6', is_active: true, created_at: addMinutes(baseTime, 0) },
    { id: id(), tenant_id: tenant.id, name: 'Dairy', description: null, color: '#10B981', is_active: true, created_at: addMinutes(baseTime, 1) },
    { id: id(), tenant_id: tenant.id, name: 'Ingredients', description: null, color: '#8B5CF6', is_active: true, created_at: addMinutes(baseTime, 2) },
    { id: id(), tenant_id: tenant.id, name: 'Flavoring', description: null, color: '#F59E0B', is_active: true, created_at: addMinutes(baseTime, 3) },
    { id: id(), tenant_id: tenant.id, name: 'Tea', description: null, color: '#0F766E', is_active: true, created_at: addMinutes(baseTime, 4) },
    { id: id(), tenant_id: tenant.id, name: 'Bakery', description: null, color: '#F97316', is_active: true, created_at: addMinutes(baseTime, 5) },
  ]

  const unitsOfMeasure: UnitOfMeasure[] = [
    { id: id(), tenant_id: tenant.id, name: 'Kilogram', abbreviation: 'kg', is_active: true, created_at: addMinutes(baseTime, 6) },
    { id: id(), tenant_id: tenant.id, name: 'Liter', abbreviation: 'liter', is_active: true, created_at: addMinutes(baseTime, 7) },
    { id: id(), tenant_id: tenant.id, name: 'Bottle', abbreviation: 'bottle', is_active: true, created_at: addMinutes(baseTime, 8) },
    { id: id(), tenant_id: tenant.id, name: 'Box', abbreviation: 'box', is_active: true, created_at: addMinutes(baseTime, 9) },
    { id: id(), tenant_id: tenant.id, name: 'Piece', abbreviation: 'pcs', is_active: true, created_at: addMinutes(baseTime, 10) },
    { id: id(), tenant_id: tenant.id, name: 'Pack', abbreviation: 'pack', is_active: true, created_at: addMinutes(baseTime, 11) },
  ]

  const suppliers: Supplier[] = [
    { id: id(), tenant_id: tenant.id, name: 'BeanCo', contact_name: 'Ana Cruz', email: 'orders@beanco.example', phone: '555-0101', address: '1 Coffee Lane', lead_days: 3, is_active: true, notes: null, created_at: addMinutes(baseTime, 12), updated_at: addMinutes(baseTime, 12) },
    { id: id(), tenant_id: tenant.id, name: 'FreshDairy', contact_name: 'Luis Santos', email: 'sales@freshdairy.example', phone: '555-0102', address: '2 Dairy Road', lead_days: 2, is_active: true, notes: null, created_at: addMinutes(baseTime, 13), updated_at: addMinutes(baseTime, 13) },
    { id: id(), tenant_id: tenant.id, name: 'SweetCorp', contact_name: 'Maya Lim', email: 'hello@sweetcorp.example', phone: '555-0103', address: '3 Sweet Street', lead_days: 4, is_active: true, notes: null, created_at: addMinutes(baseTime, 14), updated_at: addMinutes(baseTime, 14) },
    { id: id(), tenant_id: tenant.id, name: 'ChocoMix', contact_name: 'Rex Velasco', email: 'support@chocomix.example', phone: '555-0104', address: '4 Cocoa Avenue', lead_days: 5, is_active: true, notes: null, created_at: addMinutes(baseTime, 15), updated_at: addMinutes(baseTime, 15) },
    { id: id(), tenant_id: tenant.id, name: 'TeaHouse', contact_name: 'Nina Flores', email: 'orders@teahouse.example', phone: '555-0105', address: '5 Leaf Blvd', lead_days: 3, is_active: true, notes: null, created_at: addMinutes(baseTime, 16), updated_at: addMinutes(baseTime, 16) },
    { id: id(), tenant_id: tenant.id, name: 'BakeCo', contact_name: 'Paolo Reyes', email: 'sales@bakeco.example', phone: '555-0106', address: '6 Oven Drive', lead_days: 2, is_active: true, notes: null, created_at: addMinutes(baseTime, 17), updated_at: addMinutes(baseTime, 17) },
  ]

  const locations: Location[] = [
    { id: id(), tenant_id: tenant.id, code: 'MAIN', name: 'Main Storage', zone: 'Backroom', is_active: true, created_at: addMinutes(baseTime, 18) },
    { id: id(), tenant_id: tenant.id, code: 'COLD', name: 'Cold Storage', zone: 'Chiller', is_active: true, created_at: addMinutes(baseTime, 19) },
    { id: id(), tenant_id: tenant.id, code: 'BULK', name: 'Bulk Storage', zone: 'Warehouse', is_active: true, created_at: addMinutes(baseTime, 20) },
    { id: id(), tenant_id: tenant.id, code: 'SHELF-A', name: 'Shelf A', zone: 'Front rack', is_active: true, created_at: addMinutes(baseTime, 21) },
    { id: id(), tenant_id: tenant.id, code: 'SHELF-B', name: 'Shelf B', zone: 'Front rack', is_active: true, created_at: addMinutes(baseTime, 22) },
  ]

  const [coffeeCat, dairyCat, ingredientCat, flavorCat, teaCat, bakeryCat] = categories
  const [kgUom, literUom, bottleUom, boxUom, pcsUom, packUom] = unitsOfMeasure
  const [beanCo, freshDairy, sweetCorp, chocoMix, teaHouse, bakeCo] = suppliers
  const [mainStorage, coldStorage, bulkStorage, shelfA, shelfB] = locations

  const products: Product[] = [
    {
      id: id(),
      tenant_id: tenant.id,
      item_code: 'COF001',
      name: 'Espresso Beans',
      description: 'House espresso blend',
      category_id: coffeeCat.id,
      supplier_id: beanCo.id,
      location_id: mainStorage.id,
      uom_id: kgUom.id,
      quantity_on_hand: 20,
      quantity_reserved: 0,
      reorder_point: 5,
      reorder_quantity: 10,
      max_stock: null,
      unit_cost: 500,
      selling_price: 800,
      barcode: null,
      image_url: null,
      is_active: true,
      expiry_date: null,
      created_at: addMinutes(baseTime, 30),
      updated_at: addMinutes(baseTime, 35),
      category: coffeeCat,
      supplier: beanCo,
      location: mainStorage,
      uom: kgUom,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      item_code: 'COF003',
      name: 'Milk',
      description: 'Fresh dairy milk',
      category_id: dairyCat.id,
      supplier_id: freshDairy.id,
      location_id: coldStorage.id,
      uom_id: literUom.id,
      quantity_on_hand: 45,
      quantity_reserved: 0,
      reorder_point: 10,
      reorder_quantity: 20,
      max_stock: null,
      unit_cost: 60,
      selling_price: 90,
      barcode: null,
      image_url: null,
      is_active: true,
      expiry_date: null,
      created_at: addMinutes(baseTime, 31),
      updated_at: addMinutes(baseTime, 39),
      category: dairyCat,
      supplier: freshDairy,
      location: coldStorage,
      uom: literUom,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      item_code: 'COF004',
      name: 'Sugar',
      description: 'Granulated white sugar',
      category_id: ingredientCat.id,
      supplier_id: sweetCorp.id,
      location_id: bulkStorage.id,
      uom_id: kgUom.id,
      quantity_on_hand: 33,
      quantity_reserved: 0,
      reorder_point: 5,
      reorder_quantity: 10,
      max_stock: null,
      unit_cost: 40,
      selling_price: 70,
      barcode: null,
      image_url: null,
      is_active: true,
      expiry_date: null,
      created_at: addMinutes(baseTime, 32),
      updated_at: addMinutes(baseTime, 40),
      category: ingredientCat,
      supplier: sweetCorp,
      location: bulkStorage,
      uom: kgUom,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      item_code: 'COF005',
      name: 'Chocolate Syrup',
      description: 'Topping syrup',
      category_id: flavorCat.id,
      supplier_id: chocoMix.id,
      location_id: shelfA.id,
      uom_id: bottleUom.id,
      quantity_on_hand: 18,
      quantity_reserved: 0,
      reorder_point: 5,
      reorder_quantity: 10,
      max_stock: null,
      unit_cost: 120,
      selling_price: 180,
      barcode: null,
      image_url: null,
      is_active: true,
      expiry_date: null,
      created_at: addMinutes(baseTime, 33),
      updated_at: addMinutes(baseTime, 41),
      category: flavorCat,
      supplier: chocoMix,
      location: shelfA,
      uom: bottleUom,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      item_code: 'COF006',
      name: 'Tea Leaves',
      description: 'Premium tea leaves',
      category_id: teaCat.id,
      supplier_id: teaHouse.id,
      location_id: mainStorage.id,
      uom_id: boxUom.id,
      quantity_on_hand: 12,
      quantity_reserved: 0,
      reorder_point: 3,
      reorder_quantity: 8,
      max_stock: null,
      unit_cost: 200,
      selling_price: 350,
      barcode: null,
      image_url: null,
      is_active: true,
      expiry_date: null,
      created_at: addMinutes(baseTime, 34),
      updated_at: addMinutes(baseTime, 34),
      category: teaCat,
      supplier: teaHouse,
      location: mainStorage,
      uom: boxUom,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      item_code: 'COF007',
      name: 'Pastry Croissant',
      description: 'Fresh bakery item',
      category_id: bakeryCat.id,
      supplier_id: bakeCo.id,
      location_id: shelfB.id,
      uom_id: pcsUom.id,
      quantity_on_hand: 40,
      quantity_reserved: 0,
      reorder_point: 10,
      reorder_quantity: 20,
      max_stock: null,
      unit_cost: 30,
      selling_price: 60,
      barcode: null,
      image_url: null,
      is_active: true,
      expiry_date: null,
      created_at: addMinutes(baseTime, 35),
      updated_at: addMinutes(baseTime, 35),
      category: bakeryCat,
      supplier: bakeCo,
      location: shelfB,
      uom: pcsUom,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      item_code: 'COF020',
      name: 'Hot Chocolate Powder',
      description: 'Powder for hot chocolate drinks',
      category_id: flavorCat.id,
      supplier_id: chocoMix.id,
      location_id: bulkStorage.id,
      uom_id: packUom.id,
      quantity_on_hand: 6,
      quantity_reserved: 0,
      reorder_point: 3,
      reorder_quantity: 6,
      max_stock: null,
      unit_cost: 150,
      selling_price: 250,
      barcode: null,
      image_url: null,
      is_active: true,
      expiry_date: null,
      created_at: addMinutes(baseTime, 36),
      updated_at: addMinutes(baseTime, 42),
      category: flavorCat,
      supplier: chocoMix,
      location: bulkStorage,
      uom: packUom,
    },
  ]

  const [espresso, milk, sugar, , , , hotChocolate] = products

  const stockMovements: StockMovement[] = [
    {
      id: id(),
      tenant_id: tenant.id,
      product_id: espresso.id,
      movement_type: 'inbound',
      quantity: 20,
      quantity_before: 0,
      quantity_after: 20,
      reference_id: 'seed-opening',
      reference_type: 'seed',
      location_id: espresso.location_id,
      performed_by: null,
      notes: 'Opening stock seeded',
      created_at: addMinutes(baseTime, 50),
      product: espresso,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      product_id: milk.id,
      movement_type: 'inbound',
      quantity: 50,
      quantity_before: 0,
      quantity_after: 50,
      reference_id: 'po-seed-001',
      reference_type: 'purchase_order',
      location_id: milk.location_id,
      performed_by: null,
      notes: 'Supplier delivery received',
      created_at: addMinutes(baseTime, 51),
      product: milk,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      product_id: milk.id,
      movement_type: 'outbound',
      quantity: 5,
      quantity_before: 50,
      quantity_after: 45,
      reference_id: 'rcp-seed-001',
      reference_type: 'sales_transaction',
      location_id: milk.location_id,
      performed_by: null,
      notes: 'Sale processed via POS',
      created_at: addMinutes(baseTime, 61),
      product: milk,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      product_id: sugar.id,
      movement_type: 'adjustment',
      quantity: 3,
      quantity_before: 30,
      quantity_after: 33,
      reference_id: 'adj-seed-001',
      reference_type: 'inventory_adjustment',
      location_id: sugar.location_id,
      performed_by: null,
      notes: 'Cycle count correction',
      created_at: addMinutes(baseTime, 71),
      product: sugar,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      product_id: hotChocolate.id,
      movement_type: 'production',
      quantity: 6,
      quantity_before: 0,
      quantity_after: 6,
      reference_id: 'prod-seed-001',
      reference_type: 'production_batch',
      location_id: hotChocolate.location_id,
      performed_by: null,
      notes: 'Finished goods production',
      created_at: addMinutes(baseTime, 81),
      product: hotChocolate,
    },
  ]

  const adminUser: User = {
    id: id(),
    tenant_id: tenant.id,
    role: 'admin',
    full_name: 'Admin User',
    email: 'admin@codentra.example',
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: addMinutes(baseTime, 90),
    updated_at: addMinutes(baseTime, 90),
  }
  const managerUser: User = {
    id: id(),
    tenant_id: tenant.id,
    role: 'manager',
    full_name: 'Store Manager',
    email: 'manager@codentra.example',
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: addMinutes(baseTime, 91),
    updated_at: addMinutes(baseTime, 91),
  }
  const cashierUser: User = {
    id: id(),
    tenant_id: tenant.id,
    role: 'cashier',
    full_name: 'Cashier One',
    email: 'cashier@codentra.example',
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: addMinutes(baseTime, 92),
    updated_at: addMinutes(baseTime, 92),
  }

  const seedAuditLogs: AuditLog[] = [
    {
      id: id(),
      tenant_id: tenant.id,
      user_id: adminUser.id,
      action: 'user.created',
      target_type: 'user',
      target_id: adminUser.id,
      details: { role: adminUser.role, email: adminUser.email },
      performed_by: null,
      performed_at: adminUser.created_at,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      user_id: managerUser.id,
      action: 'user.created',
      target_type: 'user',
      target_id: managerUser.id,
      details: { role: managerUser.role, email: managerUser.email },
      performed_by: adminUser.id,
      performed_at: managerUser.created_at,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      user_id: cashierUser.id,
      action: 'user.created',
      target_type: 'user',
      target_id: cashierUser.id,
      details: { role: cashierUser.role, email: cashierUser.email },
      performed_by: adminUser.id,
      performed_at: cashierUser.created_at,
    },
  ]

  return syncAlerts({
    tenant,
    currentUserId: adminUser.id,
    categories,
    unitsOfMeasure,
    locations,
    suppliers,
    products,
    users: [adminUser, managerUser, cashierUser],
    cashShifts: [],
    purchaseOrders: [],
    purchaseOrderItems: [],
    salesTransactions: [],
    salesTransactionItems: [],
    stockMovements,
    alerts: [],
    auditLogs: seedAuditLogs,
    productRecipes: [],
  })
}

function ensurePlanCapacity(state: DemoSystemState, resource: 'users' | 'products' | 'locations', isUpdate = false) {
  if (isUpdate) return

  const currentCount = {
    users: state.users.length,
    products: state.products.length,
    locations: state.locations.length,
  }[resource]

  const limitKey = {
    users: 'max_users',
    products: 'max_products',
    locations: 'max_locations',
  }[resource] as keyof Pick<Tenant, 'max_users' | 'max_products' | 'max_locations'>

  const limit = Number(state.tenant[limitKey] ?? 0)
  if (currentCount >= limit) {
    throw new Error(`Your ${state.tenant.plan} plan allows up to ${limit} ${resource}. Upgrade your subscription to continue.`)
  }
}

function nextCode(prefix: string, currentCount: number) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(currentCount + 1).padStart(3, '0')}`
}

function remapArrayTenantId<T extends { tenant_id: string }>(rows: T[], tenantId: string) {
  return rows.map((row) => ({ ...row, tenant_id: tenantId }))
}

export function remapStateTenantId(state: DemoSystemState, tenantId: string): DemoSystemState {
  return {
    ...state,
    tenant: {
      ...state.tenant,
      id: tenantId,
      updated_at: nowIso(),
    },
    categories: remapArrayTenantId(state.categories, tenantId),
    unitsOfMeasure: remapArrayTenantId(state.unitsOfMeasure, tenantId),
    locations: remapArrayTenantId(state.locations, tenantId),
    suppliers: remapArrayTenantId(state.suppliers, tenantId),
    products: remapArrayTenantId(state.products, tenantId),
    users: remapArrayTenantId(state.users, tenantId),
    cashShifts: remapArrayTenantId(state.cashShifts, tenantId),
    purchaseOrders: remapArrayTenantId(state.purchaseOrders, tenantId),
    salesTransactions: remapArrayTenantId(state.salesTransactions, tenantId),
    stockMovements: remapArrayTenantId(state.stockMovements, tenantId),
    alerts: remapArrayTenantId(state.alerts, tenantId),
  }
}

function findCategory(state: DemoSystemState, name: string) {
  return state.categories.find((row) => lower(row.name) === lower(name))
}

function findSupplier(state: DemoSystemState, name: string) {
  return state.suppliers.find((row) => lower(row.name) === lower(name))
}

function findLocation(state: DemoSystemState, name: string) {
  return state.locations.find((row) => lower(row.name) === lower(name))
}

function findUom(state: DemoSystemState, value: string) {
  const normalized = lower(value)
  return state.unitsOfMeasure.find((row) => lower(row.name) === normalized || lower(row.abbreviation) === normalized)
}

function deriveAlertMeta(product: Product): { alert_type: AlertType; status: AlertStatus; threshold: number | null; current_qty: number | null; message: string } | null {
  const qty = Number(product.quantity_on_hand ?? 0)
  const threshold = Number(product.reorder_point ?? 0)
  if (qty <= 0) {
    return {
      alert_type: 'out_of_stock',
      status: 'open',
      threshold,
      current_qty: qty,
      message: `${product.name} is out of stock.`,
    }
  }
  if (qty <= threshold) {
    return {
      alert_type: 'low_stock',
      status: 'open',
      threshold,
      current_qty: qty,
      message: `${product.name} is below reorder point.`,
    }
  }
  return null
}

function syncAlerts(state: DemoSystemState): DemoSystemState {
  const nextAlerts = state.alerts.filter((alert) => {
    if (alert.status !== 'open') return true
    const product = state.products.find((item) => item.id === alert.product_id)
    return Boolean(product && deriveAlertMeta(product))
  }).map((alert) => {
    const product = state.products.find((item) => item.id === alert.product_id)
    const meta = product ? deriveAlertMeta(product) : null
    if (!meta || alert.status !== 'open') return alert
    return {
      ...alert,
      alert_type: meta.alert_type,
      status: meta.status,
      threshold: meta.threshold,
      current_qty: meta.current_qty,
      message: meta.message,
    }
  })

  for (const product of state.products) {
    const meta = deriveAlertMeta(product)
    if (!meta) continue

    const existingOpen = nextAlerts.find((alert) => alert.product_id === product.id && alert.status === 'open')
    if (existingOpen) continue

    nextAlerts.push({
      id: id(),
      tenant_id: state.tenant.id,
      product_id: product.id,
      alert_type: meta.alert_type,
      status: 'open',
      message: meta.message,
      threshold: meta.threshold,
      current_qty: meta.current_qty,
      acknowledged_by: null,
      acknowledged_at: null,
      resolved_at: null,
      created_at: nowIso(),
    })
  }

  return {
    ...state,
    alerts: nextAlerts,
  }
}

function setCurrentUser(state: DemoSystemState) {
  const currentUserId =
    state.users.find((user) => user.role === 'super_admin')?.id ??
    state.users.find((user) => user.role === 'admin')?.id ??
    state.users[0]?.id ??
    ''
  return { ...state, currentUserId }
}

function toProductRow(product: Product) {
  const { category, supplier, location, uom, ...row } = product
  return row
}

function toPurchaseOrderRow(order: PurchaseOrder) {
  const { supplier, items, ...row } = order
  return row
}

function toSalesTransactionRow(transaction: SalesTransaction) {
  const { cashier, items, ...row } = transaction
  return row
}

function toPurchaseOrderItemRow(item: PurchaseOrderItem) {
  const { product, ...row } = item
  return row
}

function toSalesTransactionItemRow(item: SalesTransactionItem) {
  const { product, ...row } = item
  return row
}

function toAlertRow(alert: Alert) {
  const { product, ...row } = alert
  return row
}

export function updateTenantSettings(state: DemoSystemState, patch: Partial<DemoSystemState['tenant']> & { business_type?: BusinessType }): DemoSystemState {
  const businessType = patch.business_type ? normalizeBusinessType(patch.business_type) : state.tenant.business_type
  return {
    ...state,
    tenant: {
      ...state.tenant,
      ...patch,
      business_type: businessType,
      updated_at: nowIso(),
    },
  }
}

export function addOrUpdateProduct(state: DemoSystemState, draft: ProductDraft, productId?: string): DemoSystemState {
  const isUpdate = Boolean(productId)
  ensurePlanCapacity(state, 'products', isUpdate)

  const category = draft.category ? findCategory(state, draft.category) ?? {
    id: id(),
    tenant_id: state.tenant.id,
    name: normalizeName(draft.category),
    description: null,
    color: '#3B82F6',
    is_active: true,
    created_at: nowIso(),
  } : null

  const supplier = draft.supplier ? findSupplier(state, draft.supplier) ?? {
    id: id(),
    tenant_id: state.tenant.id,
    name: normalizeName(draft.supplier),
    contact_name: null,
    email: null,
    phone: null,
    address: null,
    lead_days: 0,
    is_active: true,
    notes: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  } : null

  const location = draft.location ? findLocation(state, draft.location) ?? {
    id: id(),
    tenant_id: state.tenant.id,
    code: normalizeName(draft.location).slice(0, 12).toUpperCase().replace(/[^A-Z0-9]/g, ''),
    name: normalizeName(draft.location),
    zone: null,
    is_active: true,
    created_at: nowIso(),
  } : null

  const uom = draft.uom ? findUom(state, draft.uom) ?? {
    id: id(),
    tenant_id: state.tenant.id,
    name: normalizeName(draft.uom),
    abbreviation: normalizeName(draft.uom),
    is_active: true,
    created_at: nowIso(),
  } : null

  const existing = productId ? state.products.find((row) => row.id === productId) : undefined
  const product: Product = {
    id: existing?.id ?? id(),
    tenant_id: state.tenant.id,
    item_code: normalizeName(draft.item_code),
    name: normalizeName(draft.name),
    description: draft.description?.trim() ? draft.description.trim() : null,
    category_id: category?.id ?? null,
    supplier_id: supplier?.id ?? null,
    location_id: location?.id ?? null,
    uom_id: uom?.id ?? null,
    quantity_on_hand: Number(draft.quantity_on_hand ?? 0),
    quantity_reserved: existing?.quantity_reserved ?? 0,
    reorder_point: Number(draft.reorder_point ?? 0),
    reorder_quantity: existing?.reorder_quantity ?? Math.max(Number(draft.reorder_point ?? 0) * 2, 1),
    max_stock: existing?.max_stock ?? null,
    unit_cost: Number(draft.unit_cost ?? 0),
    selling_price: Number(draft.selling_price ?? 0),
    barcode: existing?.barcode ?? null,
    image_url: existing?.image_url ?? null,
    is_active: existing?.is_active ?? true,
    expiry_date: existing?.expiry_date ?? null,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
    category: category ?? undefined,
    supplier: supplier ?? undefined,
    location: location ?? undefined,
    uom: uom ?? undefined,
  }

  const nextProducts = existing
    ? state.products.map((row) => (row.id === existing.id ? product : row))
    : [...state.products, product]

  return syncAlerts({
    ...state,
    categories: category && !state.categories.some((row) => row.id === category.id) ? [...state.categories, category] : state.categories,
    suppliers: supplier && !state.suppliers.some((row) => row.id === supplier.id) ? [...state.suppliers, supplier] : state.suppliers,
    locations: location && !state.locations.some((row) => row.id === location.id) ? [...state.locations, location] : state.locations,
    unitsOfMeasure: uom && !state.unitsOfMeasure.some((row) => row.id === uom.id) ? [...state.unitsOfMeasure, uom] : state.unitsOfMeasure,
    products: nextProducts,
  })
}

export function deleteProduct(state: DemoSystemState, productId: string): DemoSystemState {
  return syncAlerts({
    ...state,
    products: state.products.filter((row) => row.id !== productId),
    alerts: state.alerts.filter((alert) => alert.product_id !== productId),
    stockMovements: state.stockMovements.filter((movement) => movement.product_id !== productId),
  })
}

export function importProducts(state: DemoSystemState, drafts: ProductDraft[]): DemoSystemState {
  return drafts.reduce((current, draft) => addOrUpdateProduct(current, draft), state)
}

export function createSupplier(state: DemoSystemState, draft: SupplierDraft): DemoSystemState {
  const supplier: Supplier = {
    id: id(),
    tenant_id: state.tenant.id,
    name: normalizeName(draft.name),
    contact_name: draft.contact_name.trim() || null,
    email: draft.email.trim() || null,
    phone: draft.phone.trim() || null,
    address: draft.address.trim() || null,
    lead_days: Number(draft.lead_days ?? 0),
    is_active: true,
    notes: draft.notes.trim() || null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }

  return { ...state, suppliers: [...state.suppliers, supplier] }
}

export function createCategory(state: DemoSystemState, draft: CategoryDraft): DemoSystemState {
  const name = normalizeName(draft.name)
  if (!name) return state

  const existing = state.categories.find((category) => lower(category.name) === lower(name))
  if (existing) {
    return {
      ...state,
      categories: state.categories.map((category) =>
        category.id === existing.id
          ? { ...category, color: draft.color?.trim() || category.color, description: draft.description?.trim() || category.description }
          : category
      ),
    }
  }

  const category: Category = {
    id: id(),
    tenant_id: state.tenant.id,
    name,
    description: draft.description?.trim() || null,
    color: draft.color?.trim() || '#3B82F6',
    is_active: true,
    created_at: nowIso(),
  }

  return { ...state, categories: [...state.categories, category] }
}

export function createUnitOfMeasure(state: DemoSystemState, draft: UnitOfMeasureDraft): DemoSystemState {
  const name = normalizeName(draft.name)
  const abbreviation = normalizeName(draft.abbreviation)
  if (!name || !abbreviation) return state

  const existing = state.unitsOfMeasure.find((uom) => lower(uom.abbreviation) === lower(abbreviation) || lower(uom.name) === lower(name))
  if (existing) {
    return {
      ...state,
      unitsOfMeasure: state.unitsOfMeasure.map((uom) =>
        uom.id === existing.id
          ? { ...uom, name, abbreviation, is_active: true }
          : uom
      ),
    }
  }

  const uom: UnitOfMeasure = {
    id: id(),
    tenant_id: state.tenant.id,
    name,
    abbreviation,
    is_active: true,
    created_at: nowIso(),
  }

  return { ...state, unitsOfMeasure: [...state.unitsOfMeasure, uom] }
}

export function createLocation(state: DemoSystemState, draft: LocationDraft): DemoSystemState {
  const code = normalizeName(draft.code).toUpperCase()
  const name = normalizeName(draft.name)
  if (!code || !name) return state

  ensurePlanCapacity(state, 'locations')

  const existing = state.locations.find((location) => lower(location.code) === lower(code) || lower(location.name) === lower(name))
  if (existing) {
    return {
      ...state,
      locations: state.locations.map((location) =>
        location.id === existing.id
          ? { ...location, code, name, zone: draft.zone?.trim() || location.zone, is_active: true }
          : location
      ),
    }
  }

  const location: Location = {
    id: id(),
    tenant_id: state.tenant.id,
    code,
    name,
    zone: draft.zone?.trim() || null,
    is_active: true,
    created_at: nowIso(),
  }

  return { ...state, locations: [...state.locations, location] }
}

export function updateSupplier(state: DemoSystemState, supplierId: string, draft: SupplierDraft): DemoSystemState {
  return {
    ...state,
    suppliers: state.suppliers.map((supplier) =>
      supplier.id === supplierId
        ? {
            ...supplier,
            name: normalizeName(draft.name),
            contact_name: draft.contact_name.trim() || null,
            email: draft.email.trim() || null,
            phone: draft.phone.trim() || null,
            address: draft.address.trim() || null,
            lead_days: Number(draft.lead_days ?? 0),
            notes: draft.notes.trim() || null,
            updated_at: nowIso(),
          }
        : supplier
    ),
  }
}

export function deleteSupplier(state: DemoSystemState, supplierId: string): DemoSystemState {
  return {
    ...state,
    suppliers: state.suppliers.filter((supplier) => supplier.id !== supplierId),
    products: state.products.map((product) =>
      product.supplier_id === supplierId ? { ...product, supplier_id: null, supplier: undefined, updated_at: nowIso() } : product
    ),
  }
}

export function createUser(state: DemoSystemState, draft: UserDraft, userId?: string): DemoSystemState {
  ensurePlanCapacity(state, 'users')
  const user: User = {
    id: userId ?? id(),
    tenant_id: state.tenant.id,
    role: draft.role,
    full_name: normalizeName(draft.full_name),
    email: draft.email.trim().toLowerCase(),
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }

  return setCurrentUser({
    ...state,
    users: [...state.users, user],
    auditLogs: [
      ...state.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: user.id,
        action: 'user.created',
        target_type: 'user',
        target_id: user.id,
        details: { full_name: user.full_name, email: user.email, role: user.role },
        performed_by: state.currentUserId,
        performed_at: nowIso(),
      },
    ],
  })
}

export function toggleUserActive(state: DemoSystemState, userId: string): DemoSystemState {
  const user = state.users.find((entry) => entry.id === userId)
  const next = {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active, updated_at: nowIso() } : u)),
  }
  if (user) {
    next.auditLogs = [
      ...next.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: userId,
        action: user.is_active ? 'user.deactivated' : 'user.activated',
        target_type: 'user',
        target_id: userId,
        details: { full_name: user.full_name, email: user.email },
        performed_by: state.currentUserId,
        performed_at: nowIso(),
      },
    ]
  }
  return next
}

export function updateUser(state: DemoSystemState, userId: string, draft: { full_name: string; email: string; role: UserRole }): DemoSystemState {
  const user = state.users.find((entry) => entry.id === userId)
  if (!user) return state
  const updated = {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, ...draft, full_name: normalizeName(draft.full_name), email: draft.email.trim().toLowerCase(), updated_at: nowIso() } : u)),
  }
  updated.auditLogs = [
    ...updated.auditLogs,
    {
      id: id(),
      tenant_id: state.tenant.id,
      user_id: userId,
      action: 'user.updated',
      target_type: 'user',
      target_id: userId,
      details: { full_name: draft.full_name, email: draft.email, role: draft.role, previous_role: user.role },
      performed_by: state.currentUserId,
      performed_at: nowIso(),
    },
  ]
  return updated
}

export function createRecipe(state: DemoSystemState, finishedGoodId: string, ingredientId: string, quantityPerUnit: number, uomId?: string | null): DemoSystemState {
  const existing = state.productRecipes.find(
    (r) => r.finished_good_id === finishedGoodId && r.ingredient_id === ingredientId
  )
  if (existing) return state

  const recipe: ProductRecipe = {
    id: id(),
    tenant_id: state.tenant.id,
    finished_good_id: finishedGoodId,
    ingredient_id: ingredientId,
    quantity_per_unit: quantityPerUnit,
    uom_id: uomId ?? null,
    created_at: nowIso(),
  }

  return {
    ...state,
    productRecipes: [...state.productRecipes, recipe],
  }
}

export function updateRecipe(state: DemoSystemState, recipeId: string, quantityPerUnit: number, uomId?: string | null): DemoSystemState {
  return {
    ...state,
    productRecipes: state.productRecipes.map((r) =>
      r.id === recipeId ? { ...r, quantity_per_unit: quantityPerUnit, uom_id: uomId ?? r.uom_id } : r
    ),
  }
}

export function deleteRecipe(state: DemoSystemState, recipeId: string): DemoSystemState {
  return {
    ...state,
    productRecipes: state.productRecipes.filter((r) => r.id !== recipeId),
  }
}

export function produceFinishedGood(state: DemoSystemState, finishedGoodId: string, quantity: number, locationId?: string | null): DemoSystemState {
  const recipeLines = state.productRecipes.filter((r) => r.finished_good_id === finishedGoodId)
  if (!recipeLines.length) return state

  const finishedGood = state.products.find((p) => p.id === finishedGoodId)
  if (!finishedGood) return state

  const updatedProducts = new Map(state.products.map((p) => [p.id, { ...p }]))
  const newMovements: StockMovement[] = []

  for (const line of recipeLines) {
    const ingredient = updatedProducts.get(line.ingredient_id)
    if (!ingredient) continue

    const deductQty = Number((line.quantity_per_unit * quantity).toFixed(4))
    const before = ingredient.quantity_on_hand
    const after = Math.max(0, before - deductQty)
    ingredient.quantity_on_hand = after
    ingredient.updated_at = nowIso()

    newMovements.push({
      id: id(),
      tenant_id: state.tenant.id,
      product_id: line.ingredient_id,
      movement_type: 'production',
      quantity: -deductQty,
      quantity_before: before,
      quantity_after: after,
      reference_id: null,
      reference_type: 'production_batch',
      location_id: locationId ?? finishedGood.location_id,
      performed_by: state.currentUserId || null,
      notes: `Produced ${quantity} x ${finishedGood.name}`,
      created_at: nowIso(),
    })
  }

  const fg = updatedProducts.get(finishedGoodId)
  if (fg) {
    const beforeQty = fg.quantity_on_hand
    const afterQty = beforeQty + quantity
    fg.quantity_on_hand = afterQty
    fg.updated_at = nowIso()

    newMovements.push({
      id: id(),
      tenant_id: state.tenant.id,
      product_id: finishedGoodId,
      movement_type: 'production',
      quantity,
      quantity_before: beforeQty,
      quantity_after: afterQty,
      reference_id: null,
      reference_type: 'production_batch',
      location_id: locationId ?? finishedGood.location_id,
      performed_by: state.currentUserId || null,
      notes: `Produced ${quantity} x ${finishedGood.name}`,
      created_at: nowIso(),
    })
  }

  return {
    ...state,
    products: Array.from(updatedProducts.values()),
    stockMovements: [...state.stockMovements, ...newMovements],
  }
}

export function createPurchaseOrder(state: DemoSystemState, draft: PurchaseOrderDraft): DemoSystemState {
  const supplier = state.suppliers.find((row) => row.id === draft.supplier_id) ?? null
  const orderId = id()
  const createdAt = nowIso()
  const po: PurchaseOrder = {
    id: orderId,
    tenant_id: state.tenant.id,
    po_number: nextCode('PO', state.purchaseOrders.length),
    supplier_id: draft.supplier_id,
    status: 'draft',
    created_by: state.currentUserId || null,
    approved_by: null,
    approved_at: null,
    expected_date: draft.expected_date || null,
    received_date: null,
    notes: draft.notes.trim() || null,
    created_at: createdAt,
    updated_at: createdAt,
    supplier: supplier ?? undefined,
    items: [],
  }

  const items: PurchaseOrderItem[] = draft.items.map((item) => {
    const product = state.products.find((row) => row.id === item.product_id)
    return {
      id: id(),
      po_id: orderId,
      product_id: item.product_id,
      quantity_ordered: Number(item.quantity_ordered ?? 0),
      quantity_received: 0,
      unit_cost: Number(item.unit_cost ?? product?.unit_cost ?? 0),
      notes: null,
      created_at: createdAt,
      product: product ?? undefined,
    }
  })

  return {
    ...state,
    purchaseOrders: [...state.purchaseOrders, po],
    purchaseOrderItems: [...state.purchaseOrderItems, ...items],
  }
}

export function updatePurchaseOrder(
  state: DemoSystemState,
  payload: { purchaseOrderId: string; draft: PurchaseOrderDraft }
): DemoSystemState {
  const order = state.purchaseOrders.find((row) => row.id === payload.purchaseOrderId)
  if (!order) return state
  if (order.status === 'received' || order.status === 'cancelled') return state

  const supplier = state.suppliers.find((row) => row.id === payload.draft.supplier_id) ?? null
  const now = nowIso()
  const updatedOrder: PurchaseOrder = {
    ...order,
    supplier_id: payload.draft.supplier_id,
    expected_date: payload.draft.expected_date || null,
    notes: payload.draft.notes.trim() || null,
    updated_at: now,
    supplier: supplier ?? undefined,
  }

  const orderItems = state.purchaseOrderItems.filter((row) => row.po_id === order.id)
  let updatedItems = state.purchaseOrderItems
  if (orderItems.length > 0 && payload.draft.items.length > 0) {
    const firstItemId = orderItems[0].id
    const draftItem = payload.draft.items[0]
    const product = state.products.find((row) => row.id === draftItem.product_id)
    updatedItems = state.purchaseOrderItems.map((row) =>
      row.id === firstItemId
        ? {
            ...row,
            product_id: draftItem.product_id,
            quantity_ordered: Number(draftItem.quantity_ordered ?? 0),
            unit_cost: Number(draftItem.unit_cost ?? product?.unit_cost ?? 0),
            product: product ?? undefined,
          }
        : row
    )
  }

  return {
    ...state,
    purchaseOrders: state.purchaseOrders.map((row) => (row.id === order.id ? updatedOrder : row)),
    purchaseOrderItems: updatedItems,
  }
}

export function cancelPurchaseOrder(state: DemoSystemState, purchaseOrderId: string): DemoSystemState {
  const order = state.purchaseOrders.find((row) => row.id === purchaseOrderId)
  if (!order) return state
  if (order.status === 'received' || order.status === 'cancelled') return state

  return {
    ...state,
    purchaseOrders: state.purchaseOrders.map((row) =>
      row.id === purchaseOrderId ? { ...row, status: 'cancelled', updated_at: nowIso() } : row
    ),
  }
}

export function receivePurchaseOrder(state: DemoSystemState, purchaseOrderId: string): DemoSystemState {
  const order = state.purchaseOrders.find((row) => row.id === purchaseOrderId)
  if (!order) return state

  const orderItems = state.purchaseOrderItems.filter((row) => row.po_id === purchaseOrderId)
  const now = nowIso()
  const movements: StockMovement[] = []
  const updatedProducts = [...state.products]

  for (const item of orderItems) {
    const index = updatedProducts.findIndex((row) => row.id === item.product_id)
    if (index < 0) continue
    const product = updatedProducts[index]
    const before = Number(product.quantity_on_hand ?? 0)
    const after = before + Number(item.quantity_ordered ?? 0)
    updatedProducts[index] = {
      ...product,
      quantity_on_hand: after,
      updated_at: now,
    }
    movements.push({
      id: id(),
      tenant_id: state.tenant.id,
      product_id: product.id,
      movement_type: 'inbound',
      quantity: Number(item.quantity_ordered ?? 0),
      quantity_before: before,
      quantity_after: after,
      reference_id: order.id,
      reference_type: 'purchase_order',
      location_id: product.location_id,
      performed_by: state.currentUserId || null,
      notes: order.notes,
      created_at: now,
      product: updatedProducts[index],
    })
  }

  return syncAlerts({
    ...state,
    products: updatedProducts,
    purchaseOrders: state.purchaseOrders.map((row) =>
      row.id === purchaseOrderId
        ? {
            ...row,
            status: 'received' as OrderStatus,
            received_date: now,
            updated_at: now,
          }
        : row
    ),
    purchaseOrderItems: state.purchaseOrderItems.map((row) =>
      row.po_id === purchaseOrderId ? { ...row, quantity_received: Number(row.quantity_ordered ?? 0) } : row
    ),
    stockMovements: [...state.stockMovements, ...movements],
  })
}

function buildSaleTransactionId(state: DemoSystemState) {
  return nextCode('RCP', state.salesTransactions.length)
}

export function recordSale(
  state: DemoSystemState,
  payload: {
    payment_method: PaymentMethod
    payment_provider?: string
    payment_reference?: string | null
    amount_tendered: number
    location_id: string | null
    notes?: string
    items: SaleDraftItem[]
  }
): { state: DemoSystemState; receiptNumber: string } {
  const now = nowIso()
  const transactionId = id()
  const receiptNumber = buildSaleTransactionId(state)

  const updatedProducts = [...state.products]
  const items: SalesTransactionItem[] = []
  const movements: StockMovement[] = []

  for (const item of payload.items) {
    const index = updatedProducts.findIndex((row) => row.id === item.product_id)
    if (index < 0) continue
    const product = updatedProducts[index]
    const before = Number(product.quantity_on_hand ?? 0)
    const sold = Math.max(0, Number(item.quantity ?? 0))
    const after = Math.max(0, before - sold)
    updatedProducts[index] = {
      ...product,
      quantity_on_hand: after,
      updated_at: now,
    }

    items.push({
      id: id(),
      transaction_id: transactionId,
      product_id: product.id,
      quantity: sold,
      unit_price: Number(item.unit_price ?? 0),
      unit_cost: item.unit_cost ?? product.unit_cost ?? null,
      discount: Number(item.discount ?? 0),
      subtotal: (Number(item.unit_price ?? 0) * sold) - Number(item.discount ?? 0),
      created_at: now,
      product: updatedProducts[index],
    })

    movements.push({
      id: id(),
      tenant_id: state.tenant.id,
      product_id: product.id,
      movement_type: 'outbound',
      quantity: sold,
      quantity_before: before,
      quantity_after: after,
      reference_id: transactionId,
      reference_type: 'sales_transaction',
      location_id: payload.location_id,
      performed_by: state.currentUserId || null,
      notes: payload.notes?.trim() || null,
      created_at: now,
      product: updatedProducts[index],
    })
  }

  const subtotal = items.reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0)
  const totalAmount = subtotal
  const changeAmount = Math.max(0, Number(payload.amount_tendered ?? 0) - totalAmount)
  const transaction: SalesTransaction = {
    id: transactionId,
    tenant_id: state.tenant.id,
    receipt_number: receiptNumber,
    cashier_id: state.currentUserId || null,
    shift_id: state.cashShifts[0]?.id ?? null,
    location_id: payload.location_id,
    status: 'completed',
    payment_method: payload.payment_method,
    payment_provider: payload.payment_provider ?? null,
    payment_reference: payload.payment_reference ?? null,
    subtotal,
    discount_amount: items.reduce((sum, row) => sum + Number(row.discount ?? 0), 0),
    tax_amount: 0,
    total_amount: totalAmount,
    amount_tendered: Number(payload.amount_tendered ?? 0),
    change_amount: changeAmount,
    notes: payload.notes?.trim() || null,
    voided_by: null,
    voided_at: null,
    void_reason: null,
    created_at: now,
    cashier: state.users.find((user) => user.id === state.currentUserId) ?? undefined,
    items,
  }

  const nextState = syncAlerts({
    ...state,
    products: updatedProducts,
    salesTransactions: [...state.salesTransactions, transaction],
    salesTransactionItems: [...state.salesTransactionItems, ...items],
    stockMovements: [...state.stockMovements, ...movements],
  })

  return { state: nextState, receiptNumber }
}

export type WasteType = 'waste' | 'defect' | 'reject'

export function recordWaste(
  state: DemoSystemState,
  payload: { productId: string; wasteType: WasteType; quantity: number; reason?: string }
): DemoSystemState {
  const productIndex = state.products.findIndex((product) => product.id === payload.productId)
  if (productIndex < 0) return state

  const product = state.products[productIndex]
  const before = Number(product.quantity_on_hand ?? 0)
  const quantity = Math.max(0, Math.min(Number(payload.quantity ?? 0), before))
  if (quantity <= 0) return state

  const after = before - quantity
  const now = nowIso()
  const updatedProduct: Product = {
    ...product,
    quantity_on_hand: after,
    updated_at: now,
  }

  const movement: StockMovement = {
    id: id(),
    tenant_id: state.tenant.id,
    product_id: product.id,
    movement_type: payload.wasteType,
    quantity,
    quantity_before: before,
    quantity_after: after,
    reference_id: null,
    reference_type: 'waste',
    location_id: product.location_id,
    performed_by: state.currentUserId || null,
    notes: payload.reason?.trim() || `${payload.wasteType} write-off`,
    created_at: now,
    product: updatedProduct,
  }

  return {
    ...state,
    products: state.products.map((row, index) => (index === productIndex ? updatedProduct : row)),
    stockMovements: [...state.stockMovements, movement],
  }
}

export function acknowledgeAlert(state: DemoSystemState, alertId: string): DemoSystemState {
  return {
    ...state,
    alerts: state.alerts.map((alert) =>
      alert.id === alertId && alert.status === 'open'
        ? { ...alert, status: 'acknowledged', acknowledged_by: state.currentUserId || null, acknowledged_at: nowIso() }
        : alert
    ),
  }
}

export function resolveAlert(state: DemoSystemState, alertId: string): DemoSystemState {
  return {
    ...state,
    alerts: state.alerts.map((alert) =>
      alert.id === alertId
        ? { ...alert, status: 'resolved', resolved_at: nowIso() }
        : alert
    ),
  }
}

export function computeDashboardStats(state: DemoSystemState): DashboardStats {
  const today = new Date().toDateString()
  const lowStock = state.products.filter((product) => product.quantity_on_hand > 0 && product.quantity_on_hand <= product.reorder_point)
  const outOfStock = state.products.filter((product) => product.quantity_on_hand <= 0)

  return {
    total_products: state.products.filter((product) => product.is_active !== false).length,
    total_value: state.products.reduce((sum, product) => sum + Number(product.quantity_on_hand ?? 0) * Number(product.unit_cost ?? 0), 0),
    low_stock_count: lowStock.length,
    out_of_stock_count: outOfStock.length,
    open_alerts: state.alerts.filter((alert) => alert.status === 'open').length,
    pending_orders: state.purchaseOrders.filter((order) => order.status !== 'received' && order.status !== 'cancelled').length,
    sales_today: state.salesTransactions.filter((tx) => new Date(tx.created_at).toDateString() === today).reduce((sum, tx) => sum + Number(tx.total_amount ?? 0), 0),
    transactions_today: state.salesTransactions.filter((tx) => new Date(tx.created_at).toDateString() === today).length,
  }
}
