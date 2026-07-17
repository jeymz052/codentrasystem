import type {
  Alert,
  InventoryLot,
  AlertStatus,
  AlertType,
  AuditLog,
  BusinessType,
  CashMovement,
  CashMovementKind,
  CashShift,
  Category,
  DashboardStats,
  DeletionRequest,
  Location,
  MovementType,
  OrderStatus,
  PaymentAccount,
  PaymentMethod,
  Product,
  ProductionTemplate,
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
  is_finished_good?: boolean
  barcode?: string
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
  delivery_date?: string
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

export type SplitPayment = {
  payment_method: PaymentMethod
  amount: number
  reference?: string | null
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
  cashMovements: CashMovement[]
  purchaseOrders: PurchaseOrder[]
  purchaseOrderItems: PurchaseOrderItem[]
  salesTransactions: SalesTransaction[]
  salesTransactionItems: SalesTransactionItem[]
  stockMovements: StockMovement[]
  alerts: Alert[]
  auditLogs: AuditLog[]
  productRecipes: ProductRecipe[]
  productionTemplates: ProductionTemplate[]
  inventoryLots: InventoryLot[]
  deletionRequests: DeletionRequest[]
}

const PLAN_LIMITS: Record<SubscriptionPlan, Pick<Tenant, 'max_users' | 'max_products' | 'max_locations'>> = {
  starter: { max_users: 3, max_products: 100, max_locations: 1 },
  professional: { max_users: 10, max_products: 1000, max_locations: 5 },
  enterprise: { max_users: 999, max_products: 9999, max_locations: 99 },
}

export function id() {
  const crypto = globalThis.crypto
  if (crypto?.randomUUID) return crypto.randomUUID()

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.random() * 16 | 0
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8
    return value.toString(16)
  })
}

// Deterministic, UUID-shaped id derived from string parts. Unlike id() (random),
// this lets the client's optimistic record and the server's persisted record
// share the same id, so reconciliation merges them into one (instead of
// duplicating or dropping). The output is a valid RFC-4122-format string so it
// can be stored in a Postgres `uuid` primary key column.
export function deterministicUuid(...parts: string[]): string {
  const input = parts.join('::')
  const fnv = (seed: number) => {
    let hash = seed >>> 0
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
  }
  const hex = [fnv(0x811c9dc5), fnv(0x9e3779b1), fnv(0x85ebca77), fnv(0xc2b2ae3d)]
    .map((value) => value.toString(16).padStart(8, '0'))
    .join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-8${hex.slice(15, 18)}-${hex.slice(18, 30)}`
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

type FixedPaymentColumns = {
  gcash_account: string | null
  gcash_qr_url: string | null
  maya_account: string | null
  maya_qr_url: string | null
  bdo_account: string | null
  bdo_qr_url: string | null
  maribank_account: string | null
  maribank_qr_url: string | null
}

// Build the dynamic payment-account list from the legacy fixed columns. Used
// when seeding a fresh tenant (all null => empty list) and when migrating an
// existing tenant that still stores its accounts in the old columns.
export function buildDefaultPaymentAccounts(fixed: FixedPaymentColumns, tenantId = 'seed'): PaymentAccount[] {
  const entries: Array<{ label: string; kind: 'ewallet' | 'bank'; account: string | null; qr_url: string | null }> = [
    { label: 'GCash', kind: 'ewallet', account: fixed.gcash_account, qr_url: fixed.gcash_qr_url },
    { label: 'Maya', kind: 'ewallet', account: fixed.maya_account, qr_url: fixed.maya_qr_url },
    { label: 'BDO', kind: 'bank', account: fixed.bdo_account, qr_url: fixed.bdo_qr_url },
    { label: 'Maribank', kind: 'bank', account: fixed.maribank_account, qr_url: fixed.maribank_qr_url },
  ]
  return entries
    .filter((entry) => entry.account || entry.qr_url)
    .map((entry) => ({
      id: deterministicUuid(tenantId, 'payacct', entry.label),
      label: entry.label,
      kind: entry.kind,
      account: entry.account ?? '',
      qr_url: entry.qr_url ?? null,
    }))
}

// Ensure a loaded tenant has a populated payment_accounts list. If the new
// JSONB column is empty but the legacy fixed columns carry data, fold them in
// so existing setups aren't lost.
export function migratePaymentAccounts(tenant: Tenant): PaymentAccount[] {
  const existing = Array.isArray(tenant.payment_accounts) ? tenant.payment_accounts.filter(Boolean) : []
  if (existing.length > 0) return existing
  return buildDefaultPaymentAccounts(tenant, tenant.id)
}

function isValidBusinessType(value: string): value is BusinessType {
  return ['retail', 'manufacturing'].includes(value)
}

export function normalizeBusinessType(value?: string | null): BusinessType {
  return isValidBusinessType(String(value ?? '').trim()) ? String(value).trim() as BusinessType : 'retail'
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
    subscription_status: 'active',
    trial_ends_at: null,
    subscription_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_users: limits.max_users,
    max_products: limits.max_products,
    max_locations: limits.max_locations,
    enable_production: businessType === 'manufacturing',
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
    billing_email: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    gcash_account: null,
    gcash_qr_url: null,
    maya_account: null,
    maya_qr_url: null,
    bdo_account: null,
    bdo_qr_url: null,
      maribank_account: null,
      maribank_qr_url: null,
      payment_accounts: buildDefaultPaymentAccounts({
        gcash_account: null,
        gcash_qr_url: null,
        maya_account: null,
        maya_qr_url: null,
        bdo_account: null,
        bdo_qr_url: null,
        maribank_account: null,
        maribank_qr_url: null,
      }),
      pos_location_id: null,
      pos_store_locations: [],
      pos_stations: [],
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
    cashMovements: [],
    purchaseOrders: [],
    purchaseOrderItems: [],
    salesTransactions: [],
    salesTransactionItems: [],
    stockMovements: [],
    alerts: [],
    auditLogs: [],
    productRecipes: [],
    productionTemplates: [],
    inventoryLots: [],
    deletionRequests: [],
  }
}

export function emptyDemoSystem(businessType: BusinessType = 'retail'): DemoSystemState {
  return emptyState(businessType)
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

export function seedDemoSystem(businessType: BusinessType = 'retail'): DemoSystemState {
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

  // Exactly one real storage location (MAIN) counts toward the plan quota. The
  // waste / defect / reject bins are quarantine storage kept separate from the
  // billable storage count, so a starter tenant (1 storage slot) starts at 1/1
  // storage plus its 3 quarantine bins instead of appearing over-limit (3/1).
  const mainStorage = { id: id(), tenant_id: tenant.id, code: 'MAIN', name: 'Main Storage', zone: 'Backroom', is_active: true, is_waste_location: false, created_at: addMinutes(baseTime, 18) }
  const locations: Location[] = [
    mainStorage,
    { id: deterministicUuid(tenant.id, 'waste-location'), tenant_id: tenant.id, code: 'WASTE', name: 'Waste', zone: 'Quarantine', is_active: true, is_waste_location: true, created_at: addMinutes(baseTime, 23) },
    { id: deterministicUuid(tenant.id, 'defect-location'), tenant_id: tenant.id, code: 'DEFECT', name: 'Defect', zone: 'Quarantine', is_active: true, is_waste_location: true, created_at: addMinutes(baseTime, 24) },
    { id: deterministicUuid(tenant.id, 'reject-location'), tenant_id: tenant.id, code: 'REJECT', name: 'Reject', zone: 'Quarantine', is_active: true, is_waste_location: true, created_at: addMinutes(baseTime, 25) },
  ]

  const [coffeeCat, dairyCat, ingredientCat, flavorCat, teaCat, bakeryCat] = categories
  const [kgUom, literUom, bottleUom, boxUom, pcsUom, packUom] = unitsOfMeasure
  const [beanCo, freshDairy, sweetCorp, chocoMix, teaHouse, bakeCo] = suppliers

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
      is_finished_good: false,
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
      location_id: mainStorage.id,
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
      is_finished_good: false,
      expiry_date: null,
      created_at: addMinutes(baseTime, 31),
      updated_at: addMinutes(baseTime, 39),
      category: dairyCat,
      supplier: freshDairy,
      location: mainStorage,
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
      location_id: mainStorage.id,
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
      is_finished_good: false,
      expiry_date: null,
      created_at: addMinutes(baseTime, 32),
      updated_at: addMinutes(baseTime, 40),
      category: ingredientCat,
      supplier: sweetCorp,
      location: mainStorage,
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
      location_id: mainStorage.id,
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
      is_finished_good: false,
      expiry_date: null,
      created_at: addMinutes(baseTime, 33),
      updated_at: addMinutes(baseTime, 41),
      category: flavorCat,
      supplier: chocoMix,
      location: mainStorage,
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
      is_finished_good: false,
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
      location_id: mainStorage.id,
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
      is_finished_good: false,
      expiry_date: null,
      created_at: addMinutes(baseTime, 35),
      updated_at: addMinutes(baseTime, 35),
      category: bakeryCat,
      supplier: bakeCo,
      location: mainStorage,
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
      location_id: mainStorage.id,
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
      is_finished_good: false,
      expiry_date: null,
      created_at: addMinutes(baseTime, 36),
      updated_at: addMinutes(baseTime, 42),
      category: flavorCat,
      supplier: chocoMix,
      location: mainStorage,
      uom: packUom,
    },
    {
      id: id(),
      tenant_id: tenant.id,
      item_code: 'COF050',
      name: 'Iced Caramel Macchiato',
      description: 'Ready-to-serve iced coffee (finished good)',
      category_id: coffeeCat.id,
      supplier_id: null,
      location_id: mainStorage.id,
      uom_id: pcsUom.id,
      quantity_on_hand: 0,
      quantity_reserved: 0,
      reorder_point: 12,
      reorder_quantity: 24,
      max_stock: null,
      unit_cost: 45,
      selling_price: 120,
      barcode: null,
      image_url: null,
      is_active: true,
      is_finished_good: true,
      expiry_date: null,
      created_at: addMinutes(baseTime, 37),
      updated_at: addMinutes(baseTime, 43),
      category: coffeeCat,
      supplier: undefined,
      location: mainStorage,
      uom: pcsUom,
    },
  ]

  const [espresso, milk, sugar, , , , hotChocolate] = products
  const icedCoffee = products.find((p) => p.item_code === 'COF050')!

  const stockMovements: StockMovement[] = [
    {
      id: id(),
      tenant_id: tenant.id,
      product_id: espresso.id,
      movement_type: 'inbound',
      quantity: 20,
      quantity_before: 0,
      quantity_after: 20,
      reference_id: id(),
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
      reference_id: id(),
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
      reference_id: id(),
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
      reference_id: id(),
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
      reference_id: id(),
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
  const salesUser: User = {
    id: id(),
    tenant_id: tenant.id,
    role: 'sales_staff',
    full_name: 'Sales Staff One',
    email: 'salesstaff@codentra.example',
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: addMinutes(baseTime, 92),
    updated_at: addMinutes(baseTime, 92),
  }
  const supervisorUser: User = {
    id: id(),
    tenant_id: tenant.id,
    role: 'supervisor',
    full_name: 'Shift Supervisor',
    email: 'supervisor@codentra.example',
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: addMinutes(baseTime, 93),
    updated_at: addMinutes(baseTime, 93),
  }
  const inventoryUser: User = {
    id: id(),
    tenant_id: tenant.id,
    role: 'inventory_staff',
    full_name: 'Inventory Clerk',
    email: 'inventory@codentra.example',
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: addMinutes(baseTime, 94),
    updated_at: addMinutes(baseTime, 94),
  }
  const productionUser: User = {
    id: id(),
    tenant_id: tenant.id,
    role: 'production_staff',
    full_name: 'Production Controller',
    email: 'production@codentra.example',
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: addMinutes(baseTime, 96),
    updated_at: addMinutes(baseTime, 96),
  }
  const purchasingUser: User = {
    id: id(),
    tenant_id: tenant.id,
    role: 'purchasing_staff',
    full_name: 'Purchasing Officer',
    email: 'purchasing@codentra.example',
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: addMinutes(baseTime, 97),
    updated_at: addMinutes(baseTime, 97),
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
      performed_at: addMinutes(adminUser.created_at, 1),
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
      performed_at: addMinutes(managerUser.created_at, 1),
    },
    {
      id: id(),
      tenant_id: tenant.id,
      user_id: salesUser.id,
      action: 'user.created',
      target_type: 'user',
      target_id: salesUser.id,
      details: { role: salesUser.role, email: salesUser.email },
      performed_by: adminUser.id,
      performed_at: addMinutes(salesUser.created_at, 1),
    },
    {
      id: id(),
      tenant_id: tenant.id,
      user_id: supervisorUser.id,
      action: 'user.created',
      target_type: 'user',
      target_id: supervisorUser.id,
      details: { role: supervisorUser.role, email: supervisorUser.email },
      performed_by: adminUser.id,
      performed_at: addMinutes(supervisorUser.created_at, 1),
    },
    {
      id: id(),
      tenant_id: tenant.id,
      user_id: inventoryUser.id,
      action: 'user.created',
      target_type: 'user',
      target_id: inventoryUser.id,
      details: { role: inventoryUser.role, email: inventoryUser.email },
      performed_by: adminUser.id,
      performed_at: addMinutes(inventoryUser.created_at, 1),
    },
    {
      id: id(),
      tenant_id: tenant.id,
      user_id: productionUser.id,
      action: 'user.created',
      target_type: 'user',
      target_id: productionUser.id,
      details: { role: productionUser.role, email: productionUser.email },
      performed_by: adminUser.id,
      performed_at: addMinutes(productionUser.created_at, 1),
    },
    {
      id: id(),
      tenant_id: tenant.id,
      user_id: purchasingUser.id,
      action: 'user.created',
      target_type: 'user',
      target_id: purchasingUser.id,
      details: { role: purchasingUser.role, email: purchasingUser.email },
      performed_by: adminUser.id,
      performed_at: addMinutes(purchasingUser.created_at, 1),
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
    users: [adminUser, managerUser, salesUser, supervisorUser, inventoryUser, productionUser, purchasingUser],
    cashShifts: [],
    cashMovements: [],
    purchaseOrders: [],
    purchaseOrderItems: [],
    salesTransactions: [],
    salesTransactionItems: [],
    stockMovements,
    alerts: [],
    auditLogs: seedAuditLogs,
    productRecipes: [
      { id: id(), tenant_id: tenant.id, finished_good_id: icedCoffee.id, ingredient_id: espresso.id, quantity_per_unit: 0.02, uom_id: null, created_at: addMinutes(baseTime, 38) },
      { id: id(), tenant_id: tenant.id, finished_good_id: icedCoffee.id, ingredient_id: milk.id, quantity_per_unit: 0.15, uom_id: null, created_at: addMinutes(baseTime, 38) },
      { id: id(), tenant_id: tenant.id, finished_good_id: icedCoffee.id, ingredient_id: hotChocolate.id, quantity_per_unit: 0.05, uom_id: null, created_at: addMinutes(baseTime, 38) },
    ],
    productionTemplates: [
      { id: id(), tenant_id: tenant.id, name: 'Morning Batch', finished_good_id: icedCoffee.id, quantity: 20, location_id: mainStorage.id, notes: 'Daily opening batch', created_at: addMinutes(baseTime, 39) },
    ],
    inventoryLots: products.map((product) => ({
      id: id(),
      tenant_id: tenant.id,
      product_id: product.id,
      quantity: product.quantity_on_hand,
      unit_cost: product.unit_cost ?? 0,
      received_at: product.created_at ?? baseTime,
      source: 'seed' as const,
      reference_id: id(),
      location_id: product.location_id,
      created_at: product.created_at ?? baseTime,
    })),
    deletionRequests: [],
  })
}

// Waste / defect / reject storage are kept as locations in the catalog but are
// NOT part of the plan's billable storage quota. Keeping them separate means a
// starter tenant (1 real storage location) can still carry its quarantine bins
// without consuming the single allowed real storage slot.
export function countStorageLocations(locations: Location[]): number {
  return locations.filter((location) => !location.is_waste_location).length
}

export function PLAN_LIMIT_MESSAGE(plan: string, resource: string, limit: number) {
  return `Data cannot be loaded due to Plan package limitation. Your ${plan} plan allows up to ${limit} ${resource}.`
}

function ensurePlanCapacity(state: DemoSystemState, resource: 'users' | 'products' | 'locations', isUpdate = false) {
  if (isUpdate) return

  const currentCount = {
    users: state.users.length,
    products: state.products.length,
    locations: countStorageLocations(state.locations),
  }[resource]

  const limitKey = {
    users: 'max_users',
    products: 'max_products',
    locations: 'max_locations',
  }[resource] as keyof Pick<Tenant, 'max_users' | 'max_products' | 'max_locations'>

  const limit = Number(state.tenant[limitKey] ?? 0)
  if (currentCount >= limit) {
    throw new Error(PLAN_LIMIT_MESSAGE(state.tenant.plan, resource, limit))
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
    auditLogs: remapArrayTenantId(state.auditLogs, tenantId),
    productRecipes: remapArrayTenantId(state.productRecipes, tenantId),
    cashMovements: remapArrayTenantId(state.cashMovements, tenantId),
    productionTemplates: remapArrayTenantId(state.productionTemplates, tenantId),
    inventoryLots: remapArrayTenantId(state.inventoryLots, tenantId),
  }
}

function findCategory(state: DemoSystemState, name: string) {
  return state.categories.find((row) => lower(row.name) === lower(name))
}

function findSupplier(state: DemoSystemState, name: string) {
  return state.suppliers.find((row) => lower(row.name) === lower(name))
}

function findLocation(state: DemoSystemState, name: string) {
  const normalized = lower(name)
  return state.locations.find((row) => row.id === name || lower(row.name) === normalized)
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

export function syncAlerts(state: DemoSystemState): DemoSystemState {
  const seenOpenProductIds = new Set<string>()
  // History (past acknowledged / resolved alerts) is preserved so the ledger
  // keeps an audit trail. We never drop them, but a resolved alert must NOT
  // block a fresh alert from being raised again if the product is low / out of
  // stock once more — that is what made "resolve" silently kill notifications
  // for that product forever.
  const historyAlerts: DemoSystemState['alerts'] = []
  const nextAlerts: DemoSystemState['alerts'] = []

  // Products that already have an alert record AND are STILL low / out of
  // stock. A manual resolve must stick while the item is short, so we don't
  // regenerate a fresh open alert for it. Once the item is restocked (healthy),
  // it drops out of this set and a future shortage can re-alert normally.
  const alertedProductIds = new Set(
    state.alerts
      .filter((alert) => {
        const product = state.products.find((item) => item.id === alert.product_id)
        return product ? Boolean(deriveAlertMeta(product)) : false
      })
      .map((alert) => alert.product_id)
  )

  // A product with a purchase order that is still incoming (anything except
  // received / cancelled) is being replenished. Its low / out-of-stock alert
  // must stay resolved so it does not keep reappearing until the stock
  // actually arrives. Once the PO is received the product's real quantity
  // decides whether a fresh alert is raised.
  const pendingPoProductIds = new Set<string>()
  for (const item of state.purchaseOrderItems) {
    const order = state.purchaseOrders.find((order) => order.id === item.po_id)
    if (order && order.status !== 'received' && order.status !== 'cancelled') {
      pendingPoProductIds.add(item.product_id)
    }
  }

  for (const alert of state.alerts) {
    const product = state.products.find((item) => item.id === alert.product_id)
    const meta = product ? deriveAlertMeta(product) : null

    if (alert.status !== 'open') {
      // A previously resolved / acknowledged alert: keep it only while the
      // item is STILL short (manual resolve sticks). If the item is now healthy
      // (restocked), the shortage episode is over — drop the record so a future
      // genuine shortage can raise a brand-new alert.
      if (meta && !pendingPoProductIds.has(alert.product_id)) historyAlerts.push(alert)
      continue
    }

    // Open alert: the product has been restocked (or removed), or a PO is on
    // the way — the alert is satisfied. End the episode (drop it) rather than
    // keeping a stale open row. A fresh alert is raised later only if the
    // product goes short again from a healthy state.
    if (!meta || pendingPoProductIds.has(alert.product_id)) continue

    // Collapse duplicate open alerts for the same product into a single row.
    if (alert.product_id && seenOpenProductIds.has(alert.product_id)) continue
    if (alert.product_id) seenOpenProductIds.add(alert.product_id)
    nextAlerts.push({
      ...alert,
      alert_type: meta.alert_type,
      status: meta.status,
      threshold: meta.threshold,
      current_qty: meta.current_qty,
      message: meta.message,
    })
  }

  for (const product of state.products) {
    const meta = deriveAlertMeta(product)
    if (!meta) continue
    // Already have a live open alert for this product — keep it.
    if (seenOpenProductIds.has(product.id)) continue
    // Stock is low / out, but a purchase order is already on the way. Don't
    // raise a duplicate notification; it will reappear only if the product is
    // still short after the PO is received.
    if (pendingPoProductIds.has(product.id)) continue
    // The product already has an alert record (open or previously resolved /
    // acknowledged). A manual resolve must stick — do not regenerate a fresh
    // open alert for the same item while it is still low / out. It only clears
    // (and can re-raise) once the stock is actually replenished via a PO
    // receipt or production, which flips deriveAlertMeta to null first.
    if (alertedProductIds.has(product.id)) continue

    // A product that is low / out of stock again raises a BRAND-NEW open alert,
    // even if it was resolved/acknowledged before. The id is timestamped so it
    // is distinct from any historical alert (a deterministic per-product id
    // would collide and get de-duplicated on merge). The old resolved alert is
    // kept in history.
    seenOpenProductIds.add(product.id)
    nextAlerts.push({
      id: deterministicUuid(state.tenant.id, 'alert', product.id, meta.alert_type, nowIso()),
      tenant_id: state.tenant.id,
      product_id: product.id,
      alert_type: meta.alert_type,
      status: 'open',
      message: meta.message,
      threshold: meta.threshold,
      current_qty: meta.current_qty,
      purchase_order_id: null,
      acknowledged_by: null,
      acknowledged_at: null,
      resolved_at: null,
      created_at: nowIso(),
    })
  }

  // Live alerts first (newest first), then history (newest first).
  const sortedLive = [...nextAlerts].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const sortedHistory = [...historyAlerts].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return {
    ...state,
    alerts: [...sortedLive, ...sortedHistory],
  }
}

// ----- FIFO inventory lot helpers -----

function lotQuantity(state: DemoSystemState, productId: string, locationId?: string | null) {
  return lotsForProduct(state, productId, locationId)
    .reduce((sum, lot) => sum + lot.quantity, 0)
}

// Returns the single location that holds *all* of a product's non-waste on-hand
// stock, or null when its stock is spread across zero or multiple locations.
function primaryProductLocation(state: DemoSystemState, productId: string): string | null {
  const wasteIds = state.locations.filter((location) => location.is_waste_location).map((location) => location.id)
  const byLocation = new Map<string, number>()
  for (const lot of state.inventoryLots) {
    if (lot.product_id !== productId || lot.quantity <= 0 || !lot.location_id) continue
    if (wasteIds.includes(lot.location_id)) continue
    byLocation.set(lot.location_id, (byLocation.get(lot.location_id) ?? 0) + lot.quantity)
  }
  return byLocation.size === 1 ? [...byLocation.keys()][0] : null
}

function lotsForProduct(state: DemoSystemState, productId: string, locationId?: string | null) {
  return state.inventoryLots
    .filter((lot) => lot.product_id === productId && lot.quantity > 0 && (locationId == null || lot.location_id === locationId))
    .sort((a, b) => a.received_at.localeCompare(b.received_at) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
}

function addLot(
  state: DemoSystemState,
  lot: Omit<InventoryLot, 'id' | 'created_at'> & { id?: string; created_at?: string }
): DemoSystemState {
  const fullLot: InventoryLot = {
    id: lot.id ?? id(),
    created_at: lot.created_at ?? nowIso(),
    tenant_id: lot.tenant_id,
    product_id: lot.product_id,
    quantity: lot.quantity,
    unit_cost: lot.unit_cost,
    received_at: lot.received_at,
    source: lot.source,
    reference_id: lot.reference_id,
    location_id: lot.location_id,
  }
  return { ...state, inventoryLots: [...state.inventoryLots, fullLot] }
}

function syncProductQuantity(state: DemoSystemState, productId: string): DemoSystemState {
  const wasteIds = state.locations.filter((location) => location.is_waste_location).map((location) => location.id)
  const quantity = lotsForProduct(state, productId)
    .filter((lot) => lot.location_id == null || !wasteIds.includes(lot.location_id))
    .reduce((sum, lot) => sum + lot.quantity, 0)
  return {
    ...state,
    products: state.products.map((product) =>
      product.id === productId ? { ...product, quantity_on_hand: quantity } : product
    ),
  }
}

// Consume `quantity` from the oldest lots first (FIFO). Returns the next state
// plus the total cost of the consumed units. When `excludeLocationId` is set,
// lots at that location are skipped — used to keep stock quarantined in a
// Waste / Defect / Reject location from being sold.
function consumeFifo(
  state: DemoSystemState,
  productId: string,
  quantity: number,
  locationId?: string | null,
  excludeLocationId?: string | null | string[]
): { state: DemoSystemState; consumedQuantity: number; consumedCost: number; consumedLotIds: string[] } {
  let lots = lotsForProduct(state, productId, locationId)
  const excluded = excludeLocationId ? (Array.isArray(excludeLocationId) ? excludeLocationId : [excludeLocationId]) : []
  if (excluded.length > 0) lots = lots.filter((lot) => lot.location_id !== null && !excluded.includes(lot.location_id))

  // A product can have on-hand stock without any FIFO lot row (stock created
  // directly, or lots never seeded). Treat the on-hand quantity as a single
  // implicit lot so the sale can proceed and the ledger stays accurate.
  if (lots.length === 0 && locationId == null) {
    const product = state.products.find((entry) => entry.id === productId)
    const onHand = Number(product?.quantity_on_hand ?? 0)
    if (onHand > 0) {
      lots = [{
        id: id(),
        tenant_id: state.tenant.id,
        product_id: productId,
        quantity: onHand,
        unit_cost: Number(product?.unit_cost ?? 0),
        received_at: product?.created_at ?? nowIso(),
        source: 'adjustment',
        reference_id: null,
        location_id: locationId ?? product?.location_id ?? null,
        created_at: nowIso(),
      }]
    }
  }

  const available = lots.reduce((sum, lot) => sum + lot.quantity, 0)
  const take = Math.max(0, Math.min(quantity, available))

  let remaining = take
  let cost = 0
  const kept: InventoryLot[] = []
  const consumedLotIds: string[] = []

  for (const lot of lots) {
    if (remaining <= 0) {
      kept.push(lot)
      continue
    }
    const fromLot = Math.min(lot.quantity, remaining)
    cost += fromLot * lot.unit_cost
    remaining -= fromLot
    if (fromLot < lot.quantity) {
      kept.push({ ...lot, quantity: lot.quantity - fromLot })
    } else {
      consumedLotIds.push(lot.id)
    }
  }

  // Rebuild the lots we touched. A partially-consumed lot keeps its original id
  // but with the reduced quantity (we replace it with `kept`, never append a
  // second copy). Fully-consumed lots are dropped. Lots we never touched (e.g.
  // stock quarantined in a waste location) are left exactly as-is.
  const touchedIds = new Set(lots.map((lot) => lot.id))
  const nextLots = [
    ...state.inventoryLots.filter((lot) => !touchedIds.has(lot.id)),
    ...kept,
  ]
  let nextState: DemoSystemState = { ...state, inventoryLots: nextLots }
  nextState = syncProductQuantity(nextState, productId)
  return { state: nextState, consumedQuantity: take, consumedCost: cost, consumedLotIds }
}

// Returns the id of the designated Waste / Defect / Reject storage location,
// creating it on the fly if a tenant does not have one yet (so it is always
// "set in place"). Stock held there cannot be issued or sold.
function wasteLocationIds(state: DemoSystemState): string[] {
  return state.locations.filter((location) => location.is_waste_location).map((location) => location.id)
}

function wasteLocationId(state: DemoSystemState, wasteType?: 'waste' | 'defect' | 'reject'): string | null {
  if (wasteType) {
    const found = state.locations.find((location) => location.is_waste_location && location.code === wasteType.toUpperCase())
    if (found) return found.id
  }
  return wasteLocationIds(state)[0] ?? null
}

const WASTE_LOCATION_SEED = [
  { code: 'WASTE', name: 'Waste', key: 'waste-location' },
  { code: 'DEFECT', name: 'Defect', key: 'defect-location' },
  { code: 'REJECT', name: 'Reject', key: 'reject-location' },
] as const

export function ensureWasteLocation(state: DemoSystemState): DemoSystemState {
  const tenant = { ...state.tenant, payment_accounts: migratePaymentAccounts(state.tenant) }
  const existing = new Set(state.locations.filter((location) => location.is_waste_location).map((location) => location.code))
  const missing = WASTE_LOCATION_SEED.filter((seed) => !existing.has(seed.code))
  if (missing.length === 0) return { ...state, tenant }

  const additions: Location[] = missing.map((seed) => ({
    id: deterministicUuid(state.tenant.id, seed.key),
    tenant_id: state.tenant.id,
    code: seed.code,
    name: seed.name,
    zone: 'Quarantine',
    is_active: true,
    is_waste_location: true,
    created_at: nowIso(),
  }))
  return { ...state, tenant, locations: [...state.locations, ...additions] }
}

function setCurrentUser(state: DemoSystemState) {
  // Preserve the real signed-in user whenever their row still exists. The
  // persisted/cached state already points currentUserId at the actual person
  // (resolved from the auth session by the client), so unless that row has been
  // removed we must keep it — otherwise every state recomputation would fall
  // back to the tenant admin / inviter and the POS would wrongly show their
  // name instead of the invited sales staff who is actually logged in.
  if (state.currentUserId && state.users.some((user) => user.id === state.currentUserId)) {
    return state
  }
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

export function addOrUpdateProduct(state: DemoSystemState, draft: ProductDraft, productId?: string, skipCapacity = false): DemoSystemState {
  const isUpdate = Boolean(productId)
  if (!skipCapacity) ensurePlanCapacity(state, 'products', isUpdate)

  const category = draft.category ? findCategory(state, draft.category) ?? {
    id: deterministicUuid(state.tenant.id, 'category', normalizeName(draft.category)),
    tenant_id: state.tenant.id,
    name: normalizeName(draft.category),
    description: null,
    color: '#3B82F6',
    is_active: true,
    created_at: nowIso(),
  } : null

  const supplier = draft.supplier ? findSupplier(state, draft.supplier) ?? {
    id: deterministicUuid(state.tenant.id, 'supplier', normalizeName(draft.supplier)),
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
    id: deterministicUuid(state.tenant.id, 'location', normalizeName(draft.location)),
    tenant_id: state.tenant.id,
    code: normalizeName(draft.location).slice(0, 12).toUpperCase().replace(/[^A-Z0-9]/g, ''),
    name: normalizeName(draft.location),
    zone: null,
    is_active: true,
    is_waste_location: false,
    created_at: nowIso(),
  } : null

  const uom = draft.uom ? findUom(state, draft.uom) ?? {
    id: deterministicUuid(state.tenant.id, 'uom', normalizeName(draft.uom)),
    tenant_id: state.tenant.id,
    name: normalizeName(draft.uom),
    abbreviation: normalizeName(draft.uom),
    is_active: true,
    created_at: nowIso(),
  } : null

  const newItemCode = normalizeName(draft.item_code)
  const newName = normalizeName(draft.name)

  const existing = productId
    ? state.products.find((row) => row.id === productId)
    : state.products.find((row) => lower(row.item_code) === lower(newItemCode))

  // One tenant = one product per item_code and per product name. Editing an
  // existing product (productId set) is exempt; for new products we reject a
  // duplicate item_code or product name. A duplicate item_code that already
  // exists is treated as an update of that product (kept for bulk imports),
  // but a duplicate *name* always points at a different record and is rejected.
  if (!productId) {
    const duplicateCode = state.products.find(
      (row) => lower(row.item_code) === lower(newItemCode),
    )
    const duplicateName = state.products.find(
      (row) => lower(row.name) === lower(newName),
    )
    if (duplicateName && (!duplicateCode || duplicateCode.name !== duplicateName.name)) {
      throw new Error(`Product "${newName}" already exists.`)
    }
    if (duplicateCode && duplicateCode.name !== newName) {
      throw new Error(`Item code "${newItemCode}" already exists.`)
    }
  }
  const product: Product = {
    id: existing?.id ?? deterministicUuid(state.tenant.id, 'product', newItemCode),
    tenant_id: state.tenant.id,
    item_code: newItemCode,
    name: newName,
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
    barcode: draft.barcode?.trim() ? draft.barcode.trim() : existing?.barcode ?? null,
    image_url: existing?.image_url ?? null,
    is_active: existing?.is_active ?? true,
    is_finished_good: draft.is_finished_good ?? existing?.is_finished_good ?? false,
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

  let nextState: DemoSystemState = {
    ...state,
    categories: category && !state.categories.some((row) => row.id === category.id) ? [...state.categories, category] : state.categories,
    suppliers: supplier && !state.suppliers.some((row) => row.id === supplier.id) ? [...state.suppliers, supplier] : state.suppliers,
    locations: location && !state.locations.some((row) => row.id === location.id) ? [...state.locations, location] : state.locations,
    unitsOfMeasure: uom && !state.unitsOfMeasure.some((row) => row.id === uom.id) ? [...state.unitsOfMeasure, uom] : state.unitsOfMeasure,
    products: nextProducts,
  }

  // For a new product with on-hand stock and no existing lots, open a FIFO lot.
  // For an existing product, reconcile lots with the draft quantity if needed.
  if (!existing && product.quantity_on_hand > 0 && !nextState.inventoryLots.some((lot) => lot.product_id === product.id)) {
    const cost = Number(product.unit_cost ?? 0)
    nextState = addLot(nextState, {
      id: deterministicUuid(product.id, 'lot', 'import'),
      tenant_id: state.tenant.id,
      product_id: product.id,
      quantity: product.quantity_on_hand,
      unit_cost: cost,
      received_at: product.created_at ?? nowIso(),
      source: 'import',
      reference_id: null,
      location_id: product.location_id,
    })
  } else if (existing) {
    const currentLotQty = lotQuantity(state, product.id)
    const draftQty = Number(product.quantity_on_hand ?? 0)
    const delta = draftQty - currentLotQty
    if (Math.abs(delta) > 0.0001) {
      const beforeQty = Number(state.products.find((row) => row.id === product.id)?.quantity_on_hand ?? 0)
      const couldAddLot = draftQty > currentLotQty && currentLotQty === 0
      const couldConsume = draftQty < currentLotQty && currentLotQty > 0

      if (couldAddLot || (delta > 0 && currentLotQty > 0)) {
        nextState = addLot(nextState, {
          tenant_id: state.tenant.id,
          product_id: product.id,
          quantity: Math.abs(delta),
          unit_cost: Number(product.unit_cost ?? 0),
          received_at: nowIso(),
          source: 'adjustment',
          reference_id: null,
          location_id: product.location_id,
        })
      } else if (couldConsume) {
        const result = consumeFifo(nextState, product.id, currentLotQty - draftQty)
        nextState = result.state
      }

      const afterQty = Number(nextState.products.find((row) => row.id === product.id)?.quantity_on_hand ?? 0)
      const movement: StockMovement = {
        id: id(),
        tenant_id: state.tenant.id,
        product_id: product.id,
        movement_type: 'adjustment',
        quantity: Number(delta.toFixed(4)),
        quantity_before: beforeQty,
        quantity_after: afterQty,
        reference_id: null,
        reference_type: 'inventory_adjustment',
        location_id: product.location_id,
        performed_by: state.currentUserId || null,
        notes: 'Manual stock adjustment',
        created_at: nowIso(),
        product: nextState.products.find((row) => row.id === product.id),
      }
      nextState = { ...nextState, stockMovements: [...nextState.stockMovements, movement] }
    }
  }

  // Keep product quantity in sync with its lots.
  nextState = syncProductQuantity(nextState, product.id)

  // If this product is an ingredient in any finished good, recompute those costs.
  const affectedFinishedGoods = new Set(
    state.productRecipes.filter((r) => r.ingredient_id === product.id).map((r) => r.finished_good_id)
  )
  for (const finishedGoodId of affectedFinishedGoods) {
    nextState = rollUpFinishedGoodCost(nextState, finishedGoodId)
  }

  return syncAlerts(nextState)
}

export function deleteProduct(state: DemoSystemState, productId: string, itemCode?: string): DemoSystemState {
  const code = itemCode ? lower(normalizeName(itemCode)) : null
  const matchedIds = new Set(
    state.products
      .filter((row) => row.id === productId || (code !== null && lower(normalizeName(row.item_code)) === code))
      .map((row) => row.id)
  )
  if (matchedIds.size === 0) return state
  return stripProducts(state, matchedIds)
}

export function deleteProducts(state: DemoSystemState, productIds: string[], itemCodes: string[] = []): DemoSystemState {
  const ids = new Set(productIds)
  const codes = new Set(itemCodes.map((value) => lower(normalizeName(value))))
  const matchedIds = new Set(
    state.products
      .filter((row) => ids.has(row.id) || (row.item_code && codes.has(lower(normalizeName(row.item_code)))))
      .map((row) => row.id)
  )
  if (matchedIds.size === 0) return state
  return stripProducts(state, matchedIds)
}

// Remove the given products and every dependent row that references them.
// Several tables (sales_transaction_items, purchase_order_items, stock_movements)
// use ON DELETE RESTRICT on product_id, so leaving them behind makes the
// persisted delete fail with a 500 — which in turn made the client re-fetch and
// "bring back" the deleted items. Stripping them here lets the server delete
// succeed cleanly.
function stripProducts(state: DemoSystemState, matchedIds: Set<string>): DemoSystemState {
  return syncAlerts({
    ...state,
    products: state.products.filter((row) => !matchedIds.has(row.id)),
    alerts: state.alerts.filter((alert) => !matchedIds.has(alert.product_id)),
    stockMovements: state.stockMovements.filter((movement) => !matchedIds.has(movement.product_id)),
    inventoryLots: state.inventoryLots.filter((lot) => !matchedIds.has(lot.product_id)),
    salesTransactionItems: state.salesTransactionItems.filter((item) => !matchedIds.has(item.product_id)),
    purchaseOrderItems: state.purchaseOrderItems.filter((item) => !matchedIds.has(item.product_id)),
  })
}

export function importProducts(state: DemoSystemState, drafts: ProductDraft[]): DemoSystemState {
  // Count how many rows are genuinely NEW (don't match an existing item code).
  // Updates don't consume plan quota, so only new rows push the count.
  const existingCodes = new Set(state.products.map((product) => lower(product.item_code)))
  const newCount = drafts.filter((draft) => !existingCodes.has(lower(normalizeName(draft.item_code)))).length
  const limit = Number(state.tenant.max_products ?? 0)
  const projected = state.products.length + newCount
  if (projected > limit) {
    throw new Error(PLAN_LIMIT_MESSAGE(state.tenant.plan, 'products', limit))
  }
  return drafts.reduce((current, draft) => addOrUpdateProduct(current, draft, undefined, true), state)
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

export function updateCategory(state: DemoSystemState, categoryId: string, draft: CategoryDraft): DemoSystemState {
  const name = normalizeName(draft.name)
  if (!name) return state

  const existing = state.categories.find((category) => category.id === categoryId)
  if (!existing) return state

  const nameCollision = state.categories.find((category) => category.id !== categoryId && lower(category.name) === lower(name))
  if (nameCollision) {
    return {
      ...state,
      categories: state.categories.map((category) =>
        category.id === categoryId
          ? { ...category, color: draft.color?.trim() || category.color, description: draft.description?.trim() || category.description }
          : category
      ),
    }
  }

  return {
    ...state,
    categories: state.categories.map((category) =>
      category.id === categoryId
        ? { ...category, name, color: draft.color?.trim() || category.color, description: draft.description?.trim() || category.description, updated_at: nowIso() }
        : category
    ),
  }
}

export function deleteCategory(state: DemoSystemState, categoryId: string): DemoSystemState {
  return {
    ...state,
    categories: state.categories.filter((category) => category.id !== categoryId),
    products: state.products.map((product) =>
      product.category_id === categoryId ? { ...product, category_id: null, updated_at: nowIso() } : product
    ),
  }
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

export function updateUnitOfMeasure(state: DemoSystemState, uomId: string, draft: UnitOfMeasureDraft): DemoSystemState {
  const name = normalizeName(draft.name)
  const abbreviation = normalizeName(draft.abbreviation)
  if (!name || !abbreviation) return state

  const existing = state.unitsOfMeasure.find((uom) => uom.id === uomId)
  if (!existing) return state

  const nameCollision = state.unitsOfMeasure.find((uom) => uom.id !== uomId && (lower(uom.abbreviation) === lower(abbreviation) || lower(uom.name) === lower(name)))
  if (nameCollision) {
    return {
      ...state,
      unitsOfMeasure: state.unitsOfMeasure.map((uom) =>
        uom.id === uomId ? { ...uom, name, abbreviation, is_active: true } : uom
      ),
    }
  }

  return {
    ...state,
    unitsOfMeasure: state.unitsOfMeasure.map((uom) =>
      uom.id === uomId ? { ...uom, name, abbreviation, is_active: true, updated_at: nowIso() } : uom
    ),
  }
}

export function deleteUnitOfMeasure(state: DemoSystemState, uomId: string): DemoSystemState {
  return {
    ...state,
    unitsOfMeasure: state.unitsOfMeasure.filter((uom) => uom.id !== uomId),
    products: state.products.map((product) =>
      product.uom_id === uomId ? { ...product, uom_id: null, updated_at: nowIso() } : product
    ),
  }
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
    is_waste_location: false,
    created_at: nowIso(),
  }

  return { ...state, locations: [...state.locations, location] }
}

export function updateLocation(state: DemoSystemState, locationId: string, draft: LocationDraft): DemoSystemState {
  const code = normalizeName(draft.code).toUpperCase()
  const name = normalizeName(draft.name)
  if (!code || !name) return state

  return {
    ...state,
    locations: state.locations.map((location) =>
      location.id === locationId
        ? {
            ...location,
            code,
            name,
            zone: draft.zone?.trim() || null,
            is_active: true,
            updated_at: nowIso(),
          }
        : location
    ),
  }
}

export function deleteLocation(state: DemoSystemState, locationId: string): DemoSystemState {
  return {
    ...state,
    locations: state.locations.filter((location) => location.id !== locationId),
  }
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

export function deleteSuppliers(state: DemoSystemState, supplierIds: string[]): DemoSystemState {
  const ids = new Set(supplierIds)
  if (ids.size === 0) return state
  return {
    ...state,
    suppliers: state.suppliers.filter((supplier) => !ids.has(supplier.id)),
    products: state.products.map((product) =>
      product.supplier_id && ids.has(product.supplier_id)
        ? { ...product, supplier_id: null, supplier: undefined, updated_at: nowIso() }
        : product
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

export function toggleProductActive(state: DemoSystemState, productId: string): DemoSystemState {
  const product = state.products.find((entry) => entry.id === productId)
  if (!product) return state

  const next: DemoSystemState = {
    ...state,
    products: state.products.map((p) =>
      p.id === productId ? { ...p, is_active: !p.is_active, updated_at: nowIso() } : p
    ),
  }

  next.auditLogs = [
    ...next.auditLogs,
    {
      id: id(),
      tenant_id: state.tenant.id,
      user_id: state.currentUserId,
      action: product.is_active ? 'product.deactivated' : 'product.activated',
      target_type: 'product',
      target_id: productId,
      details: { item_code: product.item_code, name: product.name },
      performed_by: state.currentUserId,
      performed_at: nowIso(),
    },
  ]
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

export function requestDeletion(
  state: DemoSystemState,
  requestedAction: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown>,
): DemoSystemState {
  const alreadyPending = state.deletionRequests.some(
    (req) => req.action === requestedAction && req.target_type === targetType && req.target_id === targetId && req.status === 'pending'
  )
  if (alreadyPending) return state

  // Use a deterministic id derived from the tenant + action + target so that the
  // optimistic local request and the server-replayed request (which both run
  // requestDeletion with the same inputs) collapse into a single record instead
  // of creating two pending requests for the same transaction. Without this, one
  // of the duplicate pendings would survive approval and the POS would keep
  // showing "VOIDED · PENDING APPROVAL" even after the request was resolved.
  const requestId = `${state.tenant.id}:${requestedAction}:${targetType}:${targetId}`

  const request: DeletionRequest = {
    id: requestId,
    tenant_id: state.tenant.id,
    requested_by: state.currentUserId,
    action: requestedAction as DeletionRequest['action'],
    target_type: targetType as DeletionRequest['target_type'],
    target_id: targetId,
    details,
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  return {
    ...state,
    deletionRequests: [request, ...state.deletionRequests],
    auditLogs: [
      ...state.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: state.currentUserId,
        action: 'deletion.requested',
        target_type: targetType as AuditLog['target_type'],
        target_id: targetId,
        details: { ...details, requested_action: requestedAction },
        performed_by: state.currentUserId,
        performed_at: nowIso(),
      },
    ],
  }
}

export function approveDeletion(state: DemoSystemState, requestId: string): DemoSystemState {
  const request = state.deletionRequests.find((row) => row.id === requestId)
  if (!request || request.status !== 'pending') return state

  let next = {
    ...state,
    deletionRequests: state.deletionRequests.map((row) =>
      row.id === requestId ? { ...row, status: 'approved' as const, reviewed_by: state.currentUserId, reviewed_at: nowIso(), updated_at: nowIso() } : row
    ),
  }

  switch (request.action) {
    case 'removeProduct': {
      const product = next.products.find((p) => p.id === request.target_id)
      next = deleteProduct(next, request.target_id, product?.item_code)
      break
    }
    case 'removeSupplier':
      next = deleteSupplier(next, request.target_id)
      break
    case 'removeProducts': {
      const productIds = Array.isArray(request.details?.product_ids)
        ? (request.details.product_ids as string[])
        : [request.target_id]
      next = deleteProducts(next, productIds, Array.isArray(request.details?.item_codes) ? (request.details.item_codes as string[]) : [])
      break
    }
    case 'removeSuppliers': {
      const supplierIds = Array.isArray(request.details?.supplier_ids)
        ? (request.details.supplier_ids as string[])
        : [request.target_id]
      next = deleteSuppliers(next, supplierIds)
      break
    }
    case 'deleteRecipe':
      next = deleteRecipe(next, request.target_id)
      break
    case 'deleteProductionTemplate':
      next = deleteProductionTemplate(next, request.target_id)
      break
    case 'deleteLocation':
      next = deleteLocation(next, request.target_id)
      break
    case 'approvePurchaseOrder':
      next = {
        ...next,
        purchaseOrders: next.purchaseOrders.map((row) =>
          row.id === request.target_id ? { ...row, status: 'approved' as OrderStatus, approved_by: state.currentUserId, approved_at: nowIso(), updated_at: nowIso() } : row
        ),
      }
      break
    case 'voidSale':
      // Actually apply the void now that a superior has approved it, and keep
      // the deletion request marked approved so the POS no longer shows
      // "PENDING APPROVAL" for the transaction.
      next = voidTransaction(next, { transactionId: request.target_id, reason: String(request.details?.reason ?? '') })
      next = {
        ...next,
        deletionRequests: next.deletionRequests.map((row) =>
          row.id === requestId ? { ...row, status: 'approved' as const, reviewed_by: state.currentUserId, reviewed_at: nowIso(), updated_at: nowIso() } : row
        ),
      }
      break
    case 'refundSale':
      next = refundTransaction(next, { transactionId: request.target_id, reason: String(request.details?.reason ?? '') })
      next = {
        ...next,
        deletionRequests: next.deletionRequests.map((row) =>
          row.id === requestId ? { ...row, status: 'approved' as const, reviewed_by: state.currentUserId, reviewed_at: nowIso(), updated_at: nowIso() } : row
        ),
      }
      break
    default:
      break
  }

  next.auditLogs = [
    ...next.auditLogs,
    {
      id: id(),
      tenant_id: state.tenant.id,
      user_id: state.currentUserId,
      action: 'deletion.approved',
      target_type: request.target_type as AuditLog['target_type'],
      target_id: request.target_id,
      details: { request_id: requestId, original_action: request.action },
      performed_by: state.currentUserId,
      performed_at: nowIso(),
    },
  ]
  return next
}

export function rejectDeletion(state: DemoSystemState, requestId: string): DemoSystemState {
  const request = state.deletionRequests.find((row) => row.id === requestId)
  if (!request || request.status !== 'pending') return state

  let next: DemoSystemState = {
    ...state,
    deletionRequests: state.deletionRequests.map((row) =>
      row.id === requestId ? { ...row, status: 'rejected' as const, reviewed_by: state.currentUserId, reviewed_at: nowIso(), updated_at: nowIso() } : row
    ),
    auditLogs: [
      ...state.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: state.currentUserId,
        action: 'deletion.rejected',
        target_type: request.target_type as AuditLog['target_type'],
        target_id: request.target_id,
        details: { request_id: requestId, original_action: request.action },
        performed_by: state.currentUserId,
        performed_at: nowIso(),
      },
    ],
  }

  // Rejecting a provisional void/refund reverses it: the transaction is
  // restored and the stock returned to the customer is put back on the shelf.
  if (request.action === 'voidSale' || request.action === 'refundSale') {
    next = reverseSaleCancellation(next, request.target_id, request.action)
  }

  if (request.action === 'approvePurchaseOrder') {
    next = {
      ...next,
      purchaseOrders: next.purchaseOrders.map((row) =>
        row.id === request.target_id ? { ...row, status: 'cancelled' as OrderStatus, updated_at: nowIso() } : row
      ),
    }
  }

  return next
}

// Records that a pending invitee was sent a fresh invitation. Matched by email
// so it stays correct regardless of any auth-id changes on the server. Does not
// alter the user's id, so optimistic state merges cleanly.
export function markInviteResent(state: DemoSystemState, email: string): DemoSystemState {
  const normalized = email.trim().toLowerCase()
  const target = state.users.find((entry) => entry.email.toLowerCase() === normalized)
  if (!target) return state
  return {
    ...state,
    users: state.users.map((entry) =>
      entry.id === target.id ? { ...entry, last_login: null, updated_at: nowIso() } : entry
    ),
    auditLogs: [
      ...state.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: target.id,
        action: 'user.invite_resent',
        target_type: 'user',
        target_id: target.id,
        details: { email: normalized },
        performed_by: state.currentUserId,
        performed_at: nowIso(),
      },
    ],
  }
}

export function rollUpFinishedGoodCost(state: DemoSystemState, finishedGoodId: string): DemoSystemState {
  const recipes = state.productRecipes.filter((r) => r.finished_good_id === finishedGoodId)
  const cost = recipes.reduce((sum, recipe) => {
    const ingredient = state.products.find((p) => p.id === recipe.ingredient_id)
    return sum + Number(recipe.quantity_per_unit) * Number(ingredient?.unit_cost ?? 0)
  }, 0)
  return {
    ...state,
    products: state.products.map((p) =>
      p.id === finishedGoodId ? { ...p, unit_cost: Number(cost.toFixed(4)) } : p
    ),
  }
}

export function createRecipe(state: DemoSystemState, finishedGoodId: string, ingredientId: string, quantityPerUnit: number, uomId?: string | null): DemoSystemState {
  // Use a deterministic id derived from the (finished good, ingredient) pair so
  // the client's optimistic record and the server's persisted record share the
  // same id. Without this, the client generated a random id and the server a
  // different random id, and the two merged as duplicates every time an
  // ingredient was added. See deterministicUuid() for rationale.
  const deterministicId = deterministicUuid(state.tenant.id, finishedGoodId, ingredientId)

  // Drop any pre-existing recipe for the same finished good + ingredient first
  // (regardless of id) so a duplicate line can never survive — this also heals
  // rows that were duplicated by the old random-id behaviour.
  const cleaned = state.productRecipes.filter(
    (r) => !(r.finished_good_id === finishedGoodId && r.ingredient_id === ingredientId)
  )
  const baseState: DemoSystemState =
    cleaned.length !== state.productRecipes.length ? { ...state, productRecipes: cleaned } : state

  const recipe: ProductRecipe = {
    id: deterministicId,
    tenant_id: state.tenant.id,
    finished_good_id: finishedGoodId,
    ingredient_id: ingredientId,
    quantity_per_unit: quantityPerUnit,
    uom_id: uomId ?? null,
    created_at: nowIso(),
  }

  let nextState: DemoSystemState = {
    ...baseState,
    productRecipes: [...cleaned, recipe],
    products: baseState.products.map((p) =>
      p.id === finishedGoodId ? { ...p, is_finished_good: true } : p
    ),
  }
  nextState = rollUpFinishedGoodCost(nextState, finishedGoodId)
  return nextState
}

export function updateRecipe(state: DemoSystemState, recipeId: string, quantityPerUnit: number, uomId?: string | null): DemoSystemState {
  const nextState: DemoSystemState = {
    ...state,
    productRecipes: state.productRecipes.map((r) =>
      r.id === recipeId ? { ...r, quantity_per_unit: quantityPerUnit, uom_id: uomId ?? r.uom_id } : r
    ),
  }
  const recipe = state.productRecipes.find((r) => r.id === recipeId)
  return recipe ? rollUpFinishedGoodCost(nextState, recipe.finished_good_id) : nextState
}

export function deleteRecipe(state: DemoSystemState, recipeId: string): DemoSystemState {
  const recipe = state.productRecipes.find((r) => r.id === recipeId)
  const nextState: DemoSystemState = {
    ...state,
    productRecipes: state.productRecipes.filter((r) => r.id !== recipeId),
  }
  return recipe ? rollUpFinishedGoodCost(nextState, recipe.finished_good_id) : nextState
}

export type ProductionTemplateDraft = {
  name: string
  finishedGoodId: string
  quantity: number
  locationId?: string | null
  notes?: string | null
}

export function createProductionTemplate(state: DemoSystemState, draft: ProductionTemplateDraft): DemoSystemState {
  const name = normalizeName(draft.name)
  if (!name || !draft.finishedGoodId || !(Number(draft.quantity ?? 0) > 0)) return state

  const template: ProductionTemplate = {
    id: deterministicUuid(state.tenant.id, 'production-template', name, draft.finishedGoodId, String(draft.quantity ?? 0)),
    tenant_id: state.tenant.id,
    name,
    finished_good_id: draft.finishedGoodId,
    quantity: Number(draft.quantity ?? 0),
    location_id: draft.locationId ?? null,
    notes: draft.notes?.trim() || null,
    created_at: nowIso(),
  }

  return {
    ...state,
    productionTemplates: [...state.productionTemplates, template],
  }
}

export function deleteProductionTemplate(state: DemoSystemState, templateId: string): DemoSystemState {
  return {
    ...state,
    productionTemplates: state.productionTemplates.filter((template) => template.id !== templateId),
  }
}

export function produceFinishedGood(state: DemoSystemState, finishedGoodId: string, quantity: number, locationId?: string | null): DemoSystemState {
  const recipeLines = state.productRecipes.filter((r) => r.finished_good_id === finishedGoodId)
  // Defensively dedupe by ingredient: a leftover duplicate recipe line would
  // otherwise consume the same ingredient twice and distort the batch.
  const seenIngredients = new Set<string>()
  const uniqueRecipeLines = recipeLines.filter((r) => {
    if (seenIngredients.has(r.ingredient_id)) return false
    seenIngredients.add(r.ingredient_id)
    return true
  })
  if (!uniqueRecipeLines.length) return state

  const finishedGood = state.products.find((p) => p.id === finishedGoodId)
  if (!finishedGood) return state

  // A per-run seed derived from how many production batches this finished good
  // already has. It is computed from the same `state` on the client and the
  // server, so the two agree for a given run, but it differs between runs —
  // so re-producing the same template (or producing from identical stock) never
  // regenerates an identical movement/lot id (which caused React key collisions).
  const runSeed = String(
    state.stockMovements.filter(
      (m) => m.product_id === finishedGoodId && m.movement_type === 'production' && m.quantity > 0
    ).length
  )

  const now = nowIso()
  let nextState: DemoSystemState = { ...state }
  const newMovements: StockMovement[] = []

  for (const [lineIndex, line] of uniqueRecipeLines.entries()) {
    const ingredient = nextState.products.find((p) => p.id === line.ingredient_id)
    if (!ingredient) continue

    const deductQty = Number((line.quantity_per_unit * quantity).toFixed(4))
    const before = Number(ingredient.quantity_on_hand ?? 0)
    const result = consumeFifo(nextState, line.ingredient_id, deductQty)
    nextState = result.state
    const consumed = result.consumedQuantity
    const after = Number(nextState.products.find((p) => p.id === line.ingredient_id)?.quantity_on_hand ?? 0)

    newMovements.push({
      id: deterministicUuid(state.tenant.id, line.ingredient_id, 'production-out', String(before), String(-consumed), runSeed, String(lineIndex)),
      tenant_id: state.tenant.id,
      product_id: line.ingredient_id,
      movement_type: 'production',
      quantity: -consumed,
      quantity_before: before,
      quantity_after: after,
      reference_id: null,
      reference_type: 'production_batch',
      location_id: locationId ?? finishedGood.location_id,
      performed_by: state.currentUserId || null,
      notes: `Produced ${quantity} x ${finishedGood.name}`,
      created_at: now,
      product: nextState.products.find((p) => p.id === line.ingredient_id),
    })
  }

  const fg = nextState.products.find((p) => p.id === finishedGoodId)
  if (fg && quantity > 0) {
    const beforeQty = Number(fg.quantity_on_hand ?? 0)
    nextState = addLot(nextState, {
      id: deterministicUuid(finishedGoodId, 'production-lot', String(quantity), String(beforeQty), runSeed),
      tenant_id: state.tenant.id,
      product_id: finishedGoodId,
      quantity,
      unit_cost: Number(fg.unit_cost ?? 0),
      received_at: now,
      source: 'production',
      reference_id: null,
      location_id: locationId ?? finishedGood.location_id,
    })
    nextState = syncProductQuantity(nextState, finishedGoodId)
    const afterQty = Number(nextState.products.find((p) => p.id === finishedGoodId)?.quantity_on_hand ?? 0)

    newMovements.push({
      id: deterministicUuid(state.tenant.id, finishedGoodId, 'production-in', String(beforeQty), String(quantity), runSeed),
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
      created_at: now,
      product: nextState.products.find((p) => p.id === finishedGoodId),
    })
  }

  return syncAlerts({
    ...nextState,
    stockMovements: [...nextState.stockMovements, ...newMovements],
  })
}

export function createPurchaseOrder(state: DemoSystemState, draft: PurchaseOrderDraft, orderId?: string, _status?: OrderStatus): DemoSystemState {
  const supplier = state.suppliers.find((row) => row.id === draft.supplier_id) ?? null
  const orderIdToUse = orderId ?? id()
  const createdAt = nowIso()
  const currentUser = state.users.find((u) => u.id === state.currentUserId)
  const userRole = currentUser?.role
  const needsApproval = userRole === 'purchasing_staff'
  const po: PurchaseOrder = {
    id: orderIdToUse,
    tenant_id: state.tenant.id,
    po_number: nextCode('PO', state.purchaseOrders.length),
    supplier_id: draft.supplier_id,
    status: needsApproval ? 'pending_approval' : 'approved',
    created_by: state.currentUserId || null,
    approved_by: needsApproval ? null : (state.currentUserId || null),
    approved_at: needsApproval ? null : createdAt,
    expected_date: draft.expected_date || null,
    delivery_date: null,
    received_date: null,
    notes: draft.notes.trim() || null,
    created_at: createdAt,
    updated_at: createdAt,
    supplier: supplier ?? undefined,
    items: [],
  }

  const items: PurchaseOrderItem[] = draft.items.map((item, index) => {
    const product = state.products.find((row) => row.id === item.product_id)
    return {
      id: deterministicUuid(orderIdToUse, 'item', String(index)),
      po_id: orderIdToUse,
      product_id: item.product_id,
      quantity_ordered: Number(item.quantity_ordered ?? 0),
      quantity_received: 0,
      unit_cost: Number(item.unit_cost ?? product?.unit_cost ?? 0),
      notes: null,
      created_at: createdAt,
      product: product ?? undefined,
    }
  })

  let next = {
    ...state,
    purchaseOrders: [...state.purchaseOrders, po],
    purchaseOrderItems: [...state.purchaseOrderItems, ...items],
  }

  if (needsApproval) {
    next = requestDeletion(next, 'approvePurchaseOrder', 'purchase_order', po.id, {
      po_number: po.po_number,
      supplier_id: draft.supplier_id,
      supplier_name: supplier?.name ?? null,
      total: items.reduce((sum, item) => sum + Number(item.unit_cost ?? 0) * item.quantity_ordered, 0),
      expected_date: draft.expected_date || null,
      item_count: items.length,
    })
  }

  return syncAlerts(next)
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
    delivery_date: order.delivery_date,
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
  if (order.status === 'received' || order.status === 'cancelled' || order.status === 'pending_approval') return state

  const orderItems = state.purchaseOrderItems.filter((row) => row.po_id === purchaseOrderId)
  const now = nowIso()
  const movements: StockMovement[] = []
  let nextState: DemoSystemState = { ...state }

  orderItems.forEach((item, index) => {
    const product = nextState.products.find((row) => row.id === item.product_id)
    if (!product) return
    const received = Number(item.quantity_ordered ?? 0)
    if (received <= 0) return
    const before = Number(product.quantity_on_hand ?? 0)
    const cost = Number(item.unit_cost ?? product.unit_cost ?? 0)

    // The on-hand quantity the user sees is authoritative. If the product's FIFO
    // lots don't add up to it (stock entered without a lot, or lot persistence
    // drifted), top up a baseline lot first. Otherwise syncProductQuantity below
    // would reset the quantity to the (smaller) lot sum + received, making the
    // quantity appear to "come back" to a wrong value after receiving the PO.
    const existingLotQty = lotQuantity(nextState, product.id)
    if (existingLotQty < before) {
      nextState = addLot(nextState, {
        id: deterministicUuid(order.id, product.id, String(index), 'base'),
        tenant_id: state.tenant.id,
        product_id: product.id,
        quantity: before - existingLotQty,
        unit_cost: Number(product.unit_cost ?? cost),
        received_at: product.created_at ?? now,
        source: 'adjustment',
        reference_id: null,
        location_id: product.location_id,
      })
    }

    // Deterministic ids so the optimistic client record and the server-persisted
    // record share the same id. This keeps reconciliation (merge) from dropping
    // or duplicating the inbound movement / lot.
    const lotId = deterministicUuid(order.id, product.id, String(index), 'lot')
    const movementId = deterministicUuid(order.id, product.id, String(index), 'mv')

    nextState = addLot(nextState, {
      id: lotId,
      tenant_id: state.tenant.id,
      product_id: product.id,
      quantity: received,
      unit_cost: cost,
      received_at: now,
      source: 'purchase_order',
      reference_id: order.id,
      location_id: product.location_id,
    })
    nextState = syncProductQuantity(nextState, product.id)

    const after = Number(nextState.products.find((row) => row.id === product.id)?.quantity_on_hand ?? 0)
    movements.push({
      id: movementId,
      tenant_id: state.tenant.id,
      product_id: product.id,
      movement_type: 'inbound',
      quantity: received,
      quantity_before: before,
      quantity_after: after,
      reference_id: order.id,
      reference_type: 'purchase_order',
      location_id: product.location_id,
      performed_by: state.currentUserId || null,
      notes: order.notes,
      created_at: now,
      product: nextState.products.find((row) => row.id === product.id),
    })
  })

  const receivedState = {
    ...nextState,
    purchaseOrders: nextState.purchaseOrders.map((row) =>
      row.id === purchaseOrderId
        ? {
            ...row,
            status: 'received' as OrderStatus,
            delivery_date: now.slice(0, 10),
            received_date: now,
            updated_at: now,
          }
        : row
    ),
    purchaseOrderItems: nextState.purchaseOrderItems.map((row) =>
      row.po_id === purchaseOrderId ? { ...row, quantity_received: Number(row.quantity_ordered ?? 0) } : row
    ),
    stockMovements: [...nextState.stockMovements, ...movements],
  }

  // Receiving the PO fulfils any low / out-of-stock alerts that were raised
  // against it. Mark them resolved so the notification clears automatically.
  const withResolvedAlerts = {
    ...receivedState,
    alerts: receivedState.alerts.map((alert) =>
      alert.purchase_order_id === purchaseOrderId && alert.status === 'open'
        ? { ...alert, status: 'resolved' as AlertStatus, resolved_at: nowIso() }
        : alert
    ),
  }

  return syncAlerts(withResolvedAlerts)
}

export function buildSaleTransactionId(state: DemoSystemState) {
  return nextCode('RCP', state.salesTransactions.length)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POS store locations / stations are free-text values (e.g. "Main Store", "Bay 1")
// defined in Settings and are intentionally separate from inventory warehouse
// locations. location_id is a UUID foreign key to locations(id), so a free-text
// value must never be written there — doing so throws "invalid input syntax for
// type uuid" and aborts the whole sale/shift upsert. Resolve to a real inventory
// location UUID when the value matches one; otherwise keep location_id NULL and
// stash the free text in pos_store_location.
function resolvePosLocation(
  state: DemoSystemState,
  rawLocationId: string | null | undefined
): { location_id: string | null; pos_store_location: string | null } {
  if (!rawLocationId) return { location_id: null, pos_store_location: null }
  const isUuid = UUID_RE.test(rawLocationId)
  if (isUuid && state.locations.some((location) => location.id === rawLocationId)) {
    return { location_id: rawLocationId, pos_store_location: null }
  }
  return { location_id: null, pos_store_location: rawLocationId }
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
    receiptNumber?: string
    transactionId?: string
    itemIds?: string[]
    movementIds?: string[]
    auditLogId?: string
    split_payments?: SplitPayment[]
  }
): { state: DemoSystemState; receiptNumber: string; transactionId: string; itemIds: string[]; movementIds: string[]; auditLogId: string } {
  const now = nowIso()
  const receiptNumber = payload.receiptNumber ?? buildSaleTransactionId(state)
  const transactionId = payload.transactionId ?? id()
  const posLocation = resolvePosLocation(state, payload.location_id)
  const itemIdIter = payload.itemIds ? payload.itemIds.values() : null
  const movementIdIter = payload.movementIds ? payload.movementIds.values() : null
  const splitPayments = payload.split_payments ?? []

  let nextState: DemoSystemState = { ...state }
  const items: SalesTransactionItem[] = []
  const movements: StockMovement[] = []

  for (const item of payload.items) {
    const product = nextState.products.find((row) => row.id === item.product_id)
    if (!product) continue
    const before = Number(product.quantity_on_hand ?? 0)
    const requested = Math.max(0, Number(item.quantity ?? 0))

    // Never sell stock quarantined in a Waste / Defect / Reject location.
    const result = consumeFifo(nextState, product.id, requested, null, wasteLocationIds(nextState))
    nextState = result.state
    const sold = result.consumedQuantity
    if (sold <= 0) continue
    const after = Number(nextState.products.find((row) => row.id === product.id)?.quantity_on_hand ?? 0)
    const unitCost = sold > 0 ? result.consumedCost / sold : 0

    items.push({
      id: itemIdIter?.next().value ?? id(),
      transaction_id: transactionId,
      product_id: product.id,
      quantity: sold,
      unit_price: Number(item.unit_price ?? 0),
      unit_cost: unitCost,
      discount: Number(item.discount ?? 0),
      subtotal: (Number(item.unit_price ?? 0) * sold) - Number(item.discount ?? 0),
      created_at: now,
      product: nextState.products.find((row) => row.id === product.id),
    })

    movements.push({
      id: movementIdIter?.next().value ?? id(),
      tenant_id: state.tenant.id,
      product_id: product.id,
      movement_type: 'outbound',
      quantity: sold,
      quantity_before: before,
      quantity_after: after,
      reference_id: transactionId,
      reference_type: 'sales_transaction',
      location_id: posLocation.location_id,
      pos_store_location: posLocation.pos_store_location,
      performed_by: state.currentUserId || null,
      notes: payload.notes?.trim() || null,
      created_at: now,
      product: nextState.products.find((row) => row.id === product.id),
    })
  }

  const subtotal = items.reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0)
  const totalAmount = subtotal
  const usingSplits = splitPayments.length > 0
  const cashSplitTotal = splitPayments.filter((split) => split.payment_method === 'cash').reduce((sum, split) => sum + split.amount, 0)
  const splitTotal = splitPayments.reduce((sum, split) => sum + split.amount, 0)
  const nonCashSplitTotal = splitTotal - cashSplitTotal
  const amountTendered = usingSplits ? splitTotal : Number(payload.amount_tendered ?? 0)
  const changeAmount = usingSplits
    ? Math.max(0, cashSplitTotal - Math.max(0, totalAmount - nonCashSplitTotal))
    : Math.max(0, Number(payload.amount_tendered ?? 0) - totalAmount)
  const openShiftId = state.cashShifts.find((row) => row.status === 'open')?.id ?? null
  const parentTransaction: SalesTransaction = {
    id: transactionId,
    tenant_id: state.tenant.id,
    receipt_number: receiptNumber,
    cashier_id: state.currentUserId || null,
    shift_id: openShiftId,
    location_id: posLocation.location_id,
    pos_store_location: posLocation.pos_store_location,
    status: 'completed',
    payment_method: splitPayments.length > 0 ? splitPayments[0].payment_method : payload.payment_method,
    payment_provider: payload.payment_provider ?? null,
    payment_reference: payload.payment_reference ?? splitPayments[0]?.reference ?? null,
    subtotal,
    discount_amount: items.reduce((sum, row) => sum + Number(row.discount ?? 0), 0),
    tax_amount: 0,
    total_amount: totalAmount,
    amount_tendered: amountTendered,
    change_amount: changeAmount,
    split_payments: usingSplits ? splitPayments : undefined,
    cash_sales_total: usingSplits ? cashSplitTotal : (payload.payment_method === 'cash' ? totalAmount : 0),
    qr_sales_total: usingSplits ? nonCashSplitTotal : (payload.payment_method === 'cash' ? 0 : totalAmount),
    notes: payload.notes?.trim() || null,
    voided_by: null,
    voided_at: null,
    void_reason: null,
    refunded_by: null,
    refunded_at: null,
    refund_reason: null,
    parent_transaction_id: null,
    created_at: now,
    cashier: state.users.find((user) => user.id === state.currentUserId) ?? undefined,
    items,
  }

  const allTransactions = [parentTransaction]
  const auditLogEntries = allTransactions.map((tx, index) => ({
    id: index === 0 ? (payload.auditLogId ?? id()) : id(),
    tenant_id: state.tenant.id,
    user_id: state.currentUserId || null,
    action: index === 0 ? 'sale.completed' : 'sale.split.completed',
    target_type: 'sale' as const,
    target_id: tx.id,
    details: {
      receipt_number: tx.receipt_number,
      total_amount: tx.total_amount,
      payment_method: tx.payment_method,
      items: index === 0 ? items.length : 0,
      shift_id: openShiftId,
      parent_transaction_id: index === 0 ? null : transactionId,
    },
    performed_by: state.currentUserId || null,
    performed_at: now,
  }))

  // Roll the sale up into the open shift's cash/QR/total sales totals so that
  // expected cash (opening float + cash sales) reconciles against the drawer.
  let shiftState = nextState
  if (openShiftId) {
    const cashPortion = usingSplits ? cashSplitTotal : (payload.payment_method === 'cash' ? totalAmount : 0)
    const qrPortion = usingSplits ? nonCashSplitTotal : (payload.payment_method === 'cash' ? 0 : totalAmount)
    shiftState = {
      ...nextState,
      cashShifts: nextState.cashShifts.map((row) =>
        row.id === openShiftId
          ? {
              ...row,
              total_sales: Number(row.total_sales ?? 0) + totalAmount,
              cash_sales_total: Number(row.cash_sales_total ?? 0) + cashPortion,
              qr_sales_total: Number(row.qr_sales_total ?? 0) + qrPortion,
              updated_at: now,
            }
          : row
      ),
    }
  }

  const finalState = syncAlerts({
    ...shiftState,
    salesTransactions: [...shiftState.salesTransactions, ...allTransactions],
    salesTransactionItems: [...shiftState.salesTransactionItems, ...items],
    stockMovements: [...shiftState.stockMovements, ...movements],
    auditLogs: [
      ...shiftState.auditLogs,
      ...auditLogEntries,
    ],
  })

  return { state: finalState, receiptNumber, transactionId, itemIds: items.map((i) => i.id), movementIds: movements.map((m) => m.id), auditLogId: payload.auditLogId ?? auditLogEntries[0]?.id ?? id() }
}

export type WasteType = 'waste' | 'defect' | 'reject'

export function recordWaste(
  state: DemoSystemState,
  payload: { productId: string; wasteType: WasteType; quantity: number; reason?: string }
): DemoSystemState {
  const product = state.products.find((row) => row.id === payload.productId)
  if (!product) return state

  let working = ensureWasteLocation(state)
  const wasteLocId = wasteLocationId(working, payload.wasteType)
  if (!wasteLocId) return state

  const before = Number(product.quantity_on_hand ?? 0)
  const requested = Math.max(0, Number(payload.quantity ?? 0))
  if (requested <= 0) return state
  const wasteIds = wasteLocationIds(working)
  const consume = consumeFifo(working, payload.productId, requested, null, wasteIds)
  // Cap to whatever is actually available instead of throwing. Waste / defect /
  // reject are quarantined from real sellable stock, so we can never create more
  // than what is physically on hand. Returning early (no-op) keeps the mutation
  // from failing with a server/network error when a user requests too much.
  const moved = consume.consumedQuantity
  if (moved <= 0) return state
  const cost = moved > 0 ? consume.consumedCost / moved : 0
  const now = nowIso()

  // Chain the movement id from the previous waste movement of this product +
  // type so repeated, identical write-offs (e.g. log 10, clear, log 10 again)
  // get distinct ids. A purely content-based id (tenant/product/type/before/
  // moved) collides on repeat, which made a reversed write-off share an id with
  // the new one — double-rendering it in the ledger and corrupting reversal
  // tracking so "clear to 0" failed to restore stock. Chaining keeps the id
  // deterministic (optimistic client + server still match and merge) yet unique
  // per logical event.
  const prevWaste = state.stockMovements
    .filter((movement) => movement.product_id === product.id && movement.movement_type === payload.wasteType)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const chainSeed = prevWaste ? prevWaste.id : `${state.tenant.id}::${product.id}::${payload.wasteType}`
  const wasteMovementId = deterministicUuid(chainSeed, String(before), String(moved))

  let nextState: DemoSystemState = addLot(consume.state, {
    id: deterministicUuid(wasteMovementId, 'lot'),
    tenant_id: working.tenant.id,
    product_id: product.id,
    quantity: moved,
    unit_cost: cost,
    received_at: now,
    source: 'transfer',
    reference_id: null,
    location_id: wasteLocId,
  })
  nextState = syncProductQuantity(nextState, product.id)
  const after = Number(nextState.products.find((row) => row.id === payload.productId)?.quantity_on_hand ?? 0)

  const movement: StockMovement = {
    id: wasteMovementId,
    tenant_id: state.tenant.id,
    product_id: product.id,
    movement_type: payload.wasteType,
    quantity: moved,
    quantity_before: before,
    quantity_after: after,
    reference_id: wasteLocId,
    reference_type: 'waste',
    location_id: product.location_id,
    performed_by: state.currentUserId || null,
    notes: payload.reason?.trim() || `${payload.wasteType} write-off`,
    created_at: now,
    product: nextState.products.find((row) => row.id === product.id),
  }

  return {
    ...nextState,
    stockMovements: [...nextState.stockMovements, movement],
  }
}

// A reversal is identified by a movement whose reference_type is 'waste_reversal'
// and whose reference_id points back at the original write-off. This avoids
// needing a new DB column while still letting the UI detect / prevent double
// reversals and excluding reversals from the waste summaries.
export function isWasteReversed(state: DemoSystemState, movementId: string): boolean {
  return state.stockMovements.some(
    (m) => m.reference_id === movementId && m.reference_type === 'waste_reversal'
  )
}

export function reverseWaste(state: DemoSystemState, movementId: string): DemoSystemState {
  const movement = state.stockMovements.find((m) => m.id === movementId)
  if (!movement) return state
  if (!['waste', 'defect', 'reject'].includes(movement.movement_type)) return state
  if (isWasteReversed(state, movementId)) return state

  const product = state.products.find((p) => p.id === movement.product_id)
  if (!product) return state

  const qty = Number(movement.quantity ?? 0)
  if (qty <= 0) return state

  const before = Number(product.quantity_on_hand ?? 0)
  const now = nowIso()
  const wasteLocId = movement.reference_id ?? wasteLocationId(state, movement.movement_type as 'waste' | 'defect' | 'reject')
  const originalLocId = movement.location_id ?? product.location_id

  // Withdraw the quarantined quantity from the waste location (if it was
  // relocated there) and return it to its original, sellable location so the
  // ledger stays accurate.
  let nextState: DemoSystemState = state
  let restoredQty = qty
  if (wasteLocId) {
    const consumed = consumeFifo(state, movement.product_id, qty, wasteLocId)
    nextState = consumed.state
    if (consumed.consumedQuantity > 0) restoredQty = consumed.consumedQuantity
  }

  nextState = addLot(nextState, {
    id: deterministicUuid(state.tenant.id, movement.id, 'waste-reversal-lot'),
    tenant_id: state.tenant.id,
    product_id: movement.product_id,
    quantity: restoredQty,
    unit_cost: Number(product.unit_cost ?? 0),
    received_at: now,
    source: 'adjustment',
    reference_id: movement.id,
    location_id: originalLocId,
  })
  nextState = syncProductQuantity(nextState, movement.product_id)
  const after = Number(nextState.products.find((p) => p.id === movement.product_id)?.quantity_on_hand ?? 0)

  const reversal: StockMovement = {
    id: deterministicUuid(state.tenant.id, movement.id, 'waste-reversal'),
    tenant_id: state.tenant.id,
    product_id: movement.product_id,
    movement_type: 'adjustment',
    quantity: qty,
    quantity_before: before,
    quantity_after: after,
    reference_id: movement.id,
    reference_type: 'waste_reversal',
    location_id: movement.location_id ?? product.location_id,
    performed_by: state.currentUserId || null,
    notes: `Reversed ${movement.movement_type}${movement.notes ? `: ${movement.notes}` : ''}`,
    created_at: now,
    product: nextState.products.find((p) => p.id === movement.product_id),
  }

  return {
    ...nextState,
    stockMovements: [...nextState.stockMovements, reversal],
  }
}

export function editWaste(
  state: DemoSystemState,
  movementId: string,
  draft: { wasteType: 'waste' | 'defect' | 'reject'; quantity: number; reason?: string }
): DemoSystemState {
  const movement = state.stockMovements.find((m) => m.id === movementId)
  if (!movement) return state
  if (!['waste', 'defect', 'reject'].includes(movement.movement_type)) return state

  // Reverse the original write-off (restoring stock) then re-record the
  // corrected waste so the product's on-hand and the ledger both end correct.
  const reversed = reverseWaste(state, movementId)
  return recordWaste(reversed, {
    productId: movement.product_id,
    wasteType: draft.wasteType,
    quantity: draft.quantity,
    reason: draft.reason,
  })
}

// Reconcile a product's waste / defect / reject to an explicit target per type.
//
// Strategy (robust, never throws, never inflates on-hand):
//   1. Release every currently-quarantined unit of these types back to sellable
//      stock. After this the full physical pool is available to redistribute.
//   2. Treat the released sellable on-hand as the hard cap. Walk the three types
//      in order, assigning each the smaller of (requested, remaining pool) so the
//      grand total can never exceed what is physically on hand.
//   3. Re-record only the positive targets.
//
// Because step 2 caps the running remainder, waste + defect + reject <= on-hand
// always holds, which is exactly the constraint that "editing waste to a larger
// number inflates stock on hand" violated previously. recordWaste now caps to
// available stock internally as well, so a partial pool can never throw.
export function setWasteTypes(
  state: DemoSystemState,
  productId: string,
  draft: { waste: number; defect: number; reject: number },
  reason?: string
): DemoSystemState {
  // Step 1: release everything back to sellable stock.
  let next = state
  const existing = state.stockMovements.filter(
    (movement) =>
      movement.product_id === productId &&
      (['waste', 'defect', 'reject'] as const).includes(movement.movement_type as WasteType) &&
      movement.reference_type !== 'waste_reversal' &&
      !isWasteReversed(state, movement.id)
  )
  for (const entry of existing) {
    next = reverseWaste(next, entry.id)
  }

  // Step 2: the released sellable on-hand is the absolute pool we can quarantine.
  const product = next.products.find((row) => row.id === productId)
  let remaining = Math.max(0, Number(product?.quantity_on_hand ?? 0))

  const targets: Array<[WasteType, number]> = [
    ['waste', Math.max(0, Number(draft.waste) || 0)],
    ['defect', Math.max(0, Number(draft.defect) || 0)],
    ['reject', Math.max(0, Number(draft.reject) || 0)],
  ]
  for (const [wasteType, requested] of targets) {
    const target = Math.min(requested, remaining)
    remaining -= target
    if (target > 0) {
      next = recordWaste(next, { productId, wasteType, quantity: target, reason })
    }
  }
  return next
}

export function openShift(
  state: DemoSystemState,
  payload: { openingFloat: number; locationId?: string | null; notes?: string; station?: string | null }
): DemoSystemState {
  const now = nowIso()
  const posLocation = resolvePosLocation(state, payload.locationId)
  const shift: CashShift = {
    id: id(),
    tenant_id: state.tenant.id,
    shift_code: '',
    opened_by: state.currentUserId || '',
    closed_by: null,
    location_id: posLocation.location_id,
    pos_store_location: posLocation.pos_store_location,
    status: 'open',
    opening_float: Number(payload.openingFloat ?? 0),
    closing_float: null,
    expected_cash: null,
    counted_cash: null,
    cash_sales_total: 0,
    qr_sales_total: 0,
    total_sales: 0,
    variance_amount: null,
    notes: payload.notes?.trim() || null,
    close_notes: null,
    station: payload.station?.trim() || null,
    opened_at: now,
    closed_at: null,
    created_at: now,
    updated_at: now,
  }

  return {
    ...state,
    cashShifts: [...state.cashShifts, shift],
    auditLogs: [
      ...state.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: state.currentUserId || null,
        action: 'shift.opened',
        target_type: 'shift',
        target_id: shift.id,
        details: { opening_float: shift.opening_float, location_id: shift.location_id },
        performed_by: state.currentUserId || null,
        performed_at: now,
      },
    ],
  }
}

export function closeShift(
  state: DemoSystemState,
  payload: { shiftId: string; countedCash: number; notes?: string }
): DemoSystemState | null {
  const shift = state.cashShifts.find((row) => row.id === payload.shiftId)
  if (!shift || shift.status !== 'open') return null

  const now = nowIso()
  // Expected cash in the drawer = opening float + cash sales + cash_in − cash_out.
  // QR / non-cash sales never enter the drawer, so including them in total_sales
  // would overstate expected cash (the original bug). Cash movements are tracked
  // separately via the cashMovements table.
  const movementDelta = (state.cashMovements ?? [])
    .filter((m) => m.shift_id === shift.id)
    .reduce((sum, m) => sum + (m.kind === 'cash_out' ? -Number(m.amount ?? 0) : Number(m.amount ?? 0)), 0)
  const expected =
    Number(shift.opening_float ?? 0) + Number(shift.cash_sales_total ?? 0) + movementDelta
  const variance = Number(payload.countedCash) - expected

  const updatedShift: CashShift = {
    ...shift,
    status: 'closed',
    closed_by: state.currentUserId || null,
    closing_float: Number(payload.countedCash) || 0,
    expected_cash: expected,
    counted_cash: Number(payload.countedCash) || 0,
    variance_amount: variance,
    close_notes: payload.notes?.trim() || null,
    closed_at: now,
    updated_at: now,
  }

  return {
    ...state,
    cashShifts: state.cashShifts.map((row) => (row.id === payload.shiftId ? updatedShift : row)),
    auditLogs: [
      ...state.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: state.currentUserId || null,
        action: 'shift.closed',
        target_type: 'shift',
        target_id: shift.id,
        details: {
          shift_code: shift.shift_code,
          expected_cash: expected,
          counted_cash: Number(payload.countedCash) || 0,
          variance_amount: variance,
        },
        performed_by: state.currentUserId || null,
        performed_at: now,
      },
    ],
  }
}

export function recordCashMovement(
  state: DemoSystemState,
  payload: {
    shiftId: string
    kind: CashMovementKind
    amount: number
    note?: string | null
    denominations?: Record<string, number> | null
  }
): DemoSystemState {
  const shift = state.cashShifts.find((row) => row.id === payload.shiftId)
  if (!shift || shift.status !== 'open') return state

  const now = nowIso()
  const movement: CashMovement = {
    id: id(),
    tenant_id: state.tenant.id,
    shift_id: payload.shiftId,
    kind: payload.kind,
    amount: Number(payload.amount ?? 0),
    note: payload.note?.trim() || null,
    denominations: payload.denominations ?? null,
    performed_by: state.currentUserId || null,
    created_at: now,
  }

  const updatedShift: CashShift = {
    ...shift,
    updated_at: now,
  }

  return {
    ...state,
    cashShifts: state.cashShifts.map((row) => (row.id === payload.shiftId ? updatedShift : row)),
    cashMovements: [...state.cashMovements, movement],
  }
}

export function voidTransaction(
  state: DemoSystemState,
  payload: { transactionId: string; reason?: string }
): DemoSystemState {
  const transaction = state.salesTransactions.find((row) => row.id === payload.transactionId)
  if (!transaction || transaction.status === 'voided' || transaction.status === 'refunded') return state

  const items = state.salesTransactionItems.filter((item) => item.transaction_id === payload.transactionId)
  const userId = state.currentUserId || null
  const now = nowIso()

  let nextState = {
    ...state,
    salesTransactions: state.salesTransactions.map((row) =>
      row.id === payload.transactionId
        ? {
            ...row,
            status: 'voided' as TransactionStatus,
            voided_by: userId,
            voided_at: now,
            void_reason: payload.reason?.trim() || null,
          }
        : row
    ),
  }

  for (const item of items) {
    const product = nextState.products.find((row) => row.id === item.product_id)
    if (!product) continue
    const before = Number(product.quantity_on_hand ?? 0)
    const after = before + Number(item.quantity ?? 0)

    nextState = {
      ...nextState,
      products: nextState.products.map((row) =>
        row.id === item.product_id ? { ...row, quantity_on_hand: after } : row
      ),
      stockMovements: [
        ...nextState.stockMovements,
        {
          id: id(),
          tenant_id: state.tenant.id,
          product_id: item.product_id,
          movement_type: 'return' as MovementType,
          quantity: Number(item.quantity ?? 0),
          quantity_before: before,
          quantity_after: after,
          reference_id: payload.transactionId,
          reference_type: 'voided_sale',
          location_id: transaction.location_id,
          performed_by: userId,
          notes: `Voided ${transaction.receipt_number}`,
          created_at: now,
          product,
        },
      ],
    }
  }

  nextState = {
    ...nextState,
    auditLogs: [
      ...nextState.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: userId,
        action: 'sale.voided',
        target_type: 'sale',
        target_id: transaction.id,
        details: {
          receipt_number: transaction.receipt_number,
          total_amount: Number(transaction.total_amount ?? 0),
          reason: payload.reason?.trim() || null,
        },
        performed_by: userId,
        performed_at: now,
      },
    ],
  }

  return syncAlerts(nextState)
}

export function refundTransaction(
  state: DemoSystemState,
  payload: { transactionId: string; reason?: string }
): DemoSystemState {
  const transaction = state.salesTransactions.find((row) => row.id === payload.transactionId)
  if (!transaction || transaction.status === 'refunded' || transaction.status === 'voided') return state

  const items = state.salesTransactionItems.filter((item) => item.transaction_id === payload.transactionId)
  const userId = state.currentUserId || null
  const now = nowIso()
  const refundAmount = Number(transaction.total_amount ?? 0)

  let nextState = {
    ...state,
    salesTransactions: state.salesTransactions.map((row) =>
      row.id === payload.transactionId
        ? {
            ...row,
            status: 'refunded' as TransactionStatus,
            refunded_by: userId,
            refunded_at: now,
            refund_reason: payload.reason?.trim() || null,
            parent_transaction_id: transaction.id,
          }
        : row
    ),
  }

  for (const item of items) {
    const product = nextState.products.find((row) => row.id === item.product_id)
    if (!product) continue
    const before = Number(product.quantity_on_hand ?? 0)
    const after = before + Number(item.quantity ?? 0)

    nextState = {
      ...nextState,
      products: nextState.products.map((row) =>
        row.id === item.product_id ? { ...row, quantity_on_hand: after } : row
      ),
      stockMovements: [
        ...nextState.stockMovements,
        {
          id: id(),
          tenant_id: state.tenant.id,
          product_id: item.product_id,
          movement_type: 'return' as MovementType,
          quantity: Number(item.quantity ?? 0),
          quantity_before: before,
          quantity_after: after,
          reference_id: payload.transactionId,
          reference_type: 'refunded_sale',
          location_id: transaction.location_id,
          performed_by: userId,
          notes: `Refunded ${transaction.receipt_number}`,
          created_at: now,
          product,
        },
      ],
    }
  }

  if (transaction.shift_id) {
    const shift = nextState.cashShifts.find((s) => s.id === transaction.shift_id)
    if (shift) {
      // Refund reverses the cash/QR split that was recorded at sale time so the
      // shift totals stay consistent with this transaction.
      const cashPart = Number(transaction.cash_sales_total ?? 0) || 0
      const qrPart = Number(transaction.qr_sales_total ?? 0) || 0
      const updatedShift: CashShift = {
        ...shift,
        total_sales: Number(shift.total_sales ?? 0) - refundAmount,
        cash_sales_total: Number(shift.cash_sales_total ?? 0) - cashPart,
        qr_sales_total: Number(shift.qr_sales_total ?? 0) - qrPart,
        updated_at: now,
      }
      nextState = {
        ...nextState,
        cashShifts: nextState.cashShifts.map((s) => (s.id === transaction.shift_id ? updatedShift : s)),
      }
    }
  }

  nextState = {
    ...nextState,
    auditLogs: [
      ...nextState.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: userId,
        action: 'sale.refunded',
        target_type: 'sale',
        target_id: transaction.id,
        details: {
          receipt_number: transaction.receipt_number,
          refund_amount: refundAmount,
          reason: payload.reason?.trim() || null,
        },
        performed_by: userId,
        performed_at: now,
      },
    ],
  }

  return syncAlerts(nextState)
}

// Reverses a provisional void/refund after a supervisor rejects it: the
// transaction is restored to 'completed' and the stock that was returned to
// on-hand is sold again (decremented). Mirrors the stock restore performed by
// voidTransaction / refundTransaction, just in the opposite direction.
export function reverseSaleCancellation(
  state: DemoSystemState,
  transactionId: string,
  action: 'voidSale' | 'refundSale',
): DemoSystemState {
  const transaction = state.salesTransactions.find((row) => row.id === transactionId)
  if (!transaction || (transaction.status !== 'voided' && transaction.status !== 'refunded')) return state

  const items = state.salesTransactionItems.filter((item) => item.transaction_id === transactionId)
  const userId = state.currentUserId || null
  const now = nowIso()

  let next: DemoSystemState = {
    ...state,
    salesTransactions: state.salesTransactions.map((row) =>
      row.id === transactionId
        ? {
            ...row,
            status: 'completed' as TransactionStatus,
            voided_by: null,
            voided_at: null,
            void_reason: null,
            refunded_by: null,
            refunded_at: null,
            refund_reason: null,
          }
        : row
    ),
  }

  for (const item of items) {
    const product = next.products.find((row) => row.id === item.product_id)
    if (!product) continue
    const before = Number(product.quantity_on_hand ?? 0)
    const after = Math.max(0, before - Number(item.quantity ?? 0))
    next = {
      ...next,
      products: next.products.map((row) => (row.id === item.product_id ? { ...row, quantity_on_hand: after } : row)),
      stockMovements: [
        ...next.stockMovements,
        {
          id: id(),
          tenant_id: state.tenant.id,
          product_id: item.product_id,
          movement_type: 'outbound' as MovementType,
          quantity: Number(item.quantity ?? 0),
          quantity_before: before,
          quantity_after: after,
          reference_id: transactionId,
          reference_type: action === 'voidSale' ? 'void_reversed' : 'refund_reversed',
          location_id: transaction.location_id,
          performed_by: userId,
          notes: `Reversed ${action === 'voidSale' ? 'void' : 'refund'} of ${transaction.receipt_number}`,
          created_at: now,
          product,
        },
      ],
    }
  }

  if (action === 'refundSale' && transaction.shift_id) {
    const shift = next.cashShifts.find((row) => row.id === transaction.shift_id)
    if (shift) {
      const refundAmount = Number(transaction.total_amount ?? 0)
      const cashPart = Number(transaction.cash_sales_total ?? 0)
      const qrPart = Number(transaction.qr_sales_total ?? 0)
      next = {
        ...next,
        cashShifts: next.cashShifts.map((row) =>
          row.id === transaction.shift_id
            ? {
                ...row,
                total_sales: Number(row.total_sales ?? 0) + refundAmount,
                cash_sales_total: Number(row.cash_sales_total ?? 0) + cashPart,
                qr_sales_total: Number(row.qr_sales_total ?? 0) + qrPart,
                updated_at: now,
              }
            : row
        ),
      }
    }
  }

  next = {
    ...next,
    auditLogs: [
      ...next.auditLogs,
      {
        id: id(),
        tenant_id: state.tenant.id,
        user_id: userId,
        action: 'sale.cancellation.reversed',
        target_type: 'sale',
        target_id: transaction.id,
        details: { receipt_number: transaction.receipt_number, original_action: action },
        performed_by: userId,
        performed_at: now,
      },
    ],
  }

  return syncAlerts(next)
}

export function createTransfer(
  state: DemoSystemState,
  payload: { productId: string; fromLocationId: string | null; toLocationId: string | null; quantity: number; notes?: string }
): DemoSystemState {
  const product = state.products.find((row) => row.id === payload.productId)
  if (!product) return state

  // An explicit `fromLocationId` of null means "consume from the product's
  // total on-hand lots" (stock with no location-specific FIFO lots, or lots
  // left at a null location). Only fall back to the product's own location when
  // the caller didn't specify a source at all, so a deliberate "no location"
  // transfer is never silently re-pointed at an empty product.location_id.
  const fromLocationId =
    payload.fromLocationId === undefined ? (product.location_id ?? null) : payload.fromLocationId || null
  const toLocationId = payload.toLocationId ?? null
  const requested = Math.max(0, Number(payload.quantity ?? 0))
  // Stock in a Waste / Defect / Reject location cannot be issued out, and that
  // location is managed automatically by waste logging (never a manual target).
  const wasteIds = wasteLocationIds(state)
  if (fromLocationId && wasteIds.includes(fromLocationId)) return state
  if (toLocationId && wasteIds.includes(toLocationId)) return state
  if (requested <= 0 || !toLocationId || toLocationId === fromLocationId) return state

  const consume = consumeFifo(state, product.id, requested, fromLocationId)
  // Cap to whatever is actually at the source instead of throwing. A transfer can
  // never move more than what is physically present, and returning early (no-op)
  // keeps the mutation from failing with a server/network error when the caller
  // requests more than is available. consumeFifo already limits qty to the source.
  const qty = consume.consumedQuantity
  if (qty <= 0) return state

  const avgCost = qty > 0 ? consume.consumedCost / qty : 0
  const now = nowIso()

  const toLoc = state.locations.find((loc) => loc.id === toLocationId)
  // A move-all transfer sends a null source so it can pull from every location,
  // so resolve the source name(s) from the product's actual lots instead of the
  // (missing) fromLocationId — otherwise the movement note reads "← Unknown".
  const sourceLocationIds = fromLocationId
    ? [fromLocationId]
    : [...new Set(
        state.inventoryLots
          .filter((lot) => lot.product_id === product.id && Number(lot.quantity ?? 0) > 0 && lot.location_id)
          .map((lot) => lot.location_id as string)
      )]
  const fromName =
    sourceLocationIds.length === 1
      ? state.locations.find((loc) => loc.id === sourceLocationIds[0])?.name ?? 'Unknown'
      : sourceLocationIds.length > 1
        ? 'All locations'
        : product.location?.name ?? 'Unassigned'
  const toName = toLoc?.name ?? 'Unknown'

  const sourceAfter = lotQuantity(consume.state, product.id, fromLocationId)
  const sourceBefore = sourceAfter + qty
  const destBefore = lotQuantity(state, product.id, toLocationId)

  // Derive the transfer's ids from the lots actually consumed at the source. This
  // is unique per transfer (each lot is consumed once) and identical between the
  // client's optimistic run and the server's run, so reconciliation still merges
  // them into one record. Basing ids on sourceBefore/destBefore instead reset to
  // the same values whenever stock returns to an empty shelf, regenerating an
  // existing id and causing "ON CONFLICT ... cannot affect row a second time".
  const transferKey = deterministicUuid(
    product.id,
    fromLocationId ?? 'none',
    toLocationId ?? 'none',
    String(qty),
    ...consume.consumedLotIds.sort()
  )

  const destLot: InventoryLot = {
    id: deterministicUuid('transfer-dest', transferKey),
    tenant_id: state.tenant.id,
    product_id: product.id,
    quantity: qty,
    unit_cost: avgCost,
    received_at: now,
    source: 'transfer',
    reference_id: null,
    location_id: toLocationId,
    created_at: now,
  }

  let nextState: DemoSystemState = { ...consume.state, inventoryLots: [...consume.state.inventoryLots, destLot] }
  nextState = syncProductQuantity(nextState, product.id)

  // Keep the product's stored location in sync with where its stock now lives.
  // When a transfer empties the source and all remaining on-hand stock is
  // consolidated at a single location (e.g. an exact-on-hand move), point the
  // product at that location so the inventory list stops showing the old shelf.
  const primaryLoc = primaryProductLocation(nextState, product.id)
  if (primaryLoc) {
    nextState = {
      ...nextState,
      products: nextState.products.map((p) => {
        if (p.id !== product.id || p.location_id === primaryLoc) return p
        const loc = nextState.locations.find((l) => l.id === primaryLoc)
        return { ...p, location_id: primaryLoc, location: loc }
      }),
    }
  }

  const productRef = nextState.products.find((row) => row.id === product.id)
  const destAfter = lotQuantity(nextState, product.id, toLocationId)

  const outMovement: StockMovement = {
    id: deterministicUuid('transfer-out', transferKey),
    tenant_id: state.tenant.id,
    product_id: product.id,
    movement_type: 'outbound',
    quantity: qty,
    quantity_before: sourceBefore,
    quantity_after: sourceAfter,
    reference_id: null,
    reference_type: 'transfer',
    location_id: fromLocationId,
    performed_by: state.currentUserId || null,
    notes: `Transfer out → ${toName}`,
    created_at: now,
    product: productRef,
  }

  const inMovement: StockMovement = {
    id: deterministicUuid('transfer-in', transferKey),
    tenant_id: state.tenant.id,
    product_id: product.id,
    movement_type: 'inbound',
    quantity: qty,
    quantity_before: destBefore,
    quantity_after: destAfter,
    reference_id: null,
    reference_type: 'transfer',
    location_id: toLocationId,
    performed_by: state.currentUserId || null,
    notes: `Transfer in ← ${fromName}`,
    created_at: now,
    product: productRef,
  }

  return {
    ...nextState,
    stockMovements: [...nextState.stockMovements, outMovement, inMovement],
  }
}

// How many units to reorder for a given product: its reorder_quantity when set,
// otherwise enough to clear the reorder point with some headroom.
function reorderQuantityFor(product: Product): number {
  const reorder = Number(product.reorder_quantity ?? 0)
  if (reorder > 0) return reorder
  const point = Number(product.reorder_point ?? 0)
  return Math.max(Math.round(point * 2), 1)
}

// Resolve a low / out-of-stock alert by restocking the product: a finished
// good is produced via its recipe, everything else becomes a purchase order.
// The alert is linked to the resulting PO (or kept as in-production) and stays
// OPEN until the stock actually arrives — at which point syncAlerts / PO
// receipt resolves it. This replaces the old "acknowledge / resolve" actions
// that simply hid the notification without fixing the shortage.
export function reorderFromAlert(state: DemoSystemState, alertId: string): DemoSystemState {
  const alert = state.alerts.find((row) => row.id === alertId)
  if (!alert || alert.status !== 'open') return state
  const product = state.products.find((row) => row.id === alert.product_id)
  if (!product) return state

  // Finished goods are replenished by producing a batch, not by buying.
  if (product.is_finished_good) {
    const qty = reorderQuantityFor(product)
    const produced = produceFinishedGood(state, product.id, qty)
    return {
      ...produced,
      alerts: produced.alerts.map((row) =>
        row.id === alertId ? { ...row, message: `${product.name} production started (${qty} units).` } : row
      ),
    }
  }

  const supplier = state.suppliers.find((row) => row.id === product.supplier_id) ?? state.suppliers[0]
  if (!supplier) return syncAlerts(state)

  const qty = reorderQuantityFor(product)
  const po = createPurchaseOrder(
    state,
    {
      supplier_id: supplier.id,
      expected_date: '',
      notes: `Auto-ordered to restock ${product.name} (alert).`,
      items: [{ product_id: product.id, quantity_ordered: qty, unit_cost: Number(product.unit_cost ?? 0) }],
    }
  )

  return {
    ...po,
    alerts: po.alerts.map((row) =>
      row.id === alertId
        ? { ...row, purchase_order_id: po.purchaseOrders[po.purchaseOrders.length - 1]?.id ?? null, message: `${product.name} ordered (${qty} units) — PO pending receipt.` }
        : row
    ),
  }
}

// Resolve every open low / out-of-stock alert at once. Buyable items are
// combined into a single purchase order (per supplier); finished goods are
// produced individually.
export function reorderAllAlerts(state: DemoSystemState): DemoSystemState {
  const open = state.alerts.filter((alert) => alert.status === 'open' && (alert.alert_type === 'low_stock' || alert.alert_type === 'out_of_stock'))
  if (!open.length) return state

  let next = state
  const poBySupplier = new Map<string, Array<{ product_id: string; quantity_ordered: number; unit_cost: number }>>()
  const finishedGoods: string[] = []
  const alertToPo = new Map<string, string>()

  for (const alert of open) {
    const product = next.products.find((row) => row.id === alert.product_id)
    if (!product) continue
    if (product.is_finished_good) {
      finishedGoods.push(product.id)
      continue
    }
    const supplier = next.suppliers.find((row) => row.id === product.supplier_id) ?? next.suppliers[0]
    if (!supplier) continue
    const qty = reorderQuantityFor(product)
    const list = poBySupplier.get(supplier.id) ?? []
    list.push({ product_id: product.id, quantity_ordered: qty, unit_cost: Number(product.unit_cost ?? 0) })
    poBySupplier.set(supplier.id, list)
  }

  for (const [supplierId, items] of poBySupplier) {
    const before = next.purchaseOrders.length
    next = createPurchaseOrder(next, {
      supplier_id: supplierId,
      expected_date: '',
      notes: 'Auto-ordered to restock low / out-of-stock items.',
      items,
    })
    const createdPo = next.purchaseOrders[next.purchaseOrders.length - 1]
    if (createdPo) {
      for (const item of items) {
        const alert = open.find((a) => {
          const p = next.products.find((row) => row.id === a.product_id)
          return p?.id === item.product_id
        })
        if (alert) alertToPo.set(alert.id, createdPo.id)
      }
    }
    void before
  }

  for (const productId of finishedGoods) {
    const product = next.products.find((row) => row.id === productId)
    if (!product) continue
    next = produceFinishedGood(next, productId, reorderQuantityFor(product))
  }

  return {
    ...next,
    alerts: next.alerts.map((row) => {
      if (alertToPo.has(row.id)) {
        return { ...row, purchase_order_id: alertToPo.get(row.id) ?? null, message: `${row.message} Ordered — PO pending receipt.` }
      }
      return row
    }),
  }
}

// Manual resolve kept for completeness (e.g. user wants to clear a stale
// alert even though the item is still low). The primary flow is reorder.
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

export function resolveAllAlerts(state: DemoSystemState): DemoSystemState {
  return {
    ...state,
    alerts: state.alerts.map((alert) => (alert.status === 'open' ? { ...alert, status: 'resolved', resolved_at: nowIso() } : alert)),
  }
}

export function computeDashboardStats(state: DemoSystemState): DashboardStats {
  const today = new Date().toDateString()
  const lowStock = state.alerts.filter((alert) => alert.status === 'open' && alert.alert_type === 'low_stock')
  const outOfStock = state.alerts.filter((alert) => alert.status === 'open' && alert.alert_type === 'out_of_stock')

  // Separate raw materials / packaging (valued at unit cost) from finished
  // goods (valued at selling price, the POS-based value) so production
  // businesses can see inventory value excluding finished output.
  const activeProducts = state.products.filter((product) => product.is_active !== false)
  const materialsValue = activeProducts
    .filter((product) => !product.is_finished_good)
    .reduce((sum, product) => sum + Number(product.quantity_on_hand ?? 0) * Number(product.unit_cost ?? 0), 0)
  const finishedGoodsValue = activeProducts
    .filter((product) => product.is_finished_good)
    .reduce((sum, product) => sum + Number(product.quantity_on_hand ?? 0) * Number(product.selling_price ?? 0), 0)

  return {
    total_products: activeProducts.length,
    total_value: state.products.reduce((sum, product) => sum + Number(product.quantity_on_hand ?? 0) * Number(product.unit_cost ?? 0), 0),
    materials_value: materialsValue,
    finished_goods_value: finishedGoodsValue,
    low_stock_count: lowStock.length,
    out_of_stock_count: outOfStock.length,
    open_alerts: state.alerts.filter((alert) => alert.status === 'open').length,
    pending_orders: state.purchaseOrders.filter((order) => order.status !== 'received' && order.status !== 'cancelled').length,
    sales_today: state.salesTransactions.filter((tx) => new Date(tx.created_at).toDateString() === today).reduce((sum, tx) => sum + Number(tx.total_amount ?? 0), 0),
    transactions_today: state.salesTransactions.filter((tx) => new Date(tx.created_at).toDateString() === today).length,
  }
}
