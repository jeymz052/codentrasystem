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
  Location,
  MovementType,
  OrderStatus,
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
      is_finished_good: false,
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
      is_finished_good: false,
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
      is_finished_good: false,
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
      is_finished_good: false,
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
      is_finished_good: false,
      expiry_date: null,
      created_at: addMinutes(baseTime, 36),
      updated_at: addMinutes(baseTime, 42),
      category: flavorCat,
      supplier: chocoMix,
      location: bulkStorage,
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
      user_id: cashierUser.id,
      action: 'user.created',
      target_type: 'user',
      target_id: cashierUser.id,
      details: { role: cashierUser.role, email: cashierUser.email },
      performed_by: adminUser.id,
      performed_at: addMinutes(cashierUser.created_at, 1),
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

// ----- FIFO inventory lot helpers -----

function lotQuantity(state: DemoSystemState, productId: string, locationId?: string | null) {
  return lotsForProduct(state, productId, locationId)
    .reduce((sum, lot) => sum + lot.quantity, 0)
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
  const quantity = lotQuantity(state, productId)
  return {
    ...state,
    products: state.products.map((product) =>
      product.id === productId ? { ...product, quantity_on_hand: quantity } : product
    ),
  }
}

// Consume `quantity` from the oldest lots first (FIFO). Returns the next state
// plus the total cost of the consumed units.
function consumeFifo(
  state: DemoSystemState,
  productId: string,
  quantity: number,
  locationId?: string | null
): { state: DemoSystemState; consumedQuantity: number; consumedCost: number } {
  let lots = lotsForProduct(state, productId, locationId)

  // A product can have on-hand stock without any FIFO lot row (stock created
  // directly, or lots never seeded). Treat the on-hand quantity as a single
  // implicit lot so the sale can proceed and the ledger stays accurate.
  if (lots.length === 0) {
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
    }
  }

  // When consuming from a specific location, only remove lots of that product
  // at that location; lots elsewhere are preserved.
  const nextLots = [
    ...state.inventoryLots.filter(
      (lot) => !(lot.product_id === productId && (locationId == null || lot.location_id === locationId))
    ),
    ...kept,
  ]
  let nextState: DemoSystemState = { ...state, inventoryLots: nextLots }
  nextState = syncProductQuantity(nextState, productId)
  return { state: nextState, consumedQuantity: take, consumedCost: cost }
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

  const existing = productId
    ? state.products.find((row) => row.id === productId)
    : state.products.find((row) => lower(row.item_code) === lower(normalizeName(draft.item_code)))
  const product: Product = {
    id: existing?.id ?? deterministicUuid(state.tenant.id, 'product', normalizeName(draft.item_code)),
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

  return {
    ...nextState,
    stockMovements: [...nextState.stockMovements, ...newMovements],
  }
}

export function createPurchaseOrder(state: DemoSystemState, draft: PurchaseOrderDraft, orderId?: string): DemoSystemState {
  const supplier = state.suppliers.find((row) => row.id === draft.supplier_id) ?? null
  const orderIdToUse = orderId ?? id()
  const createdAt = nowIso()
  const po: PurchaseOrder = {
    id: orderIdToUse,
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
  let nextState: DemoSystemState = { ...state }

  orderItems.forEach((item, index) => {
    const product = nextState.products.find((row) => row.id === item.product_id)
    if (!product) return
    const received = Number(item.quantity_ordered ?? 0)
    if (received <= 0) return
    const before = Number(product.quantity_on_hand ?? 0)
    const cost = Number(item.unit_cost ?? product.unit_cost ?? 0)

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

  return syncAlerts({
    ...nextState,
    purchaseOrders: nextState.purchaseOrders.map((row) =>
      row.id === purchaseOrderId
        ? {
            ...row,
            status: 'received' as OrderStatus,
            received_date: now,
            updated_at: now,
          }
        : row
    ),
    purchaseOrderItems: nextState.purchaseOrderItems.map((row) =>
      row.po_id === purchaseOrderId ? { ...row, quantity_received: Number(row.quantity_ordered ?? 0) } : row
    ),
    stockMovements: [...nextState.stockMovements, ...movements],
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
    receiptNumber?: string
    transactionId?: string
    itemIds?: string[]
    movementIds?: string[]
    auditLogId?: string
  }
): { state: DemoSystemState; receiptNumber: string; transactionId: string; itemIds: string[]; movementIds: string[]; auditLogId: string } {
  const now = nowIso()
  const receiptNumber = payload.receiptNumber ?? buildSaleTransactionId(state)
  const transactionId = payload.transactionId ?? id()
  const itemIdIter = payload.itemIds ? payload.itemIds.values() : null
  const movementIdIter = payload.movementIds ? payload.movementIds.values() : null

  let nextState: DemoSystemState = { ...state }
  const items: SalesTransactionItem[] = []
  const movements: StockMovement[] = []

  for (const item of payload.items) {
    const product = nextState.products.find((row) => row.id === item.product_id)
    if (!product) continue
    const before = Number(product.quantity_on_hand ?? 0)
    const requested = Math.max(0, Number(item.quantity ?? 0))

    const result = consumeFifo(nextState, product.id, requested)
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
      location_id: payload.location_id,
      performed_by: state.currentUserId || null,
      notes: payload.notes?.trim() || null,
      created_at: now,
      product: nextState.products.find((row) => row.id === product.id),
    })
  }

  const subtotal = items.reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0)
  const totalAmount = subtotal
  const changeAmount = Math.max(0, Number(payload.amount_tendered ?? 0) - totalAmount)
  const openShiftId = state.cashShifts.find((row) => row.status === 'open')?.id ?? null
  const transaction: SalesTransaction = {
    id: transactionId,
    tenant_id: state.tenant.id,
    receipt_number: receiptNumber,
    cashier_id: state.currentUserId || null,
    shift_id: openShiftId,
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
    refunded_by: null,
    refunded_at: null,
    refund_reason: null,
    parent_transaction_id: null,
    created_at: now,
    cashier: state.users.find((user) => user.id === state.currentUserId) ?? undefined,
    items,
  }

  const finalState = syncAlerts({
    ...nextState,
    salesTransactions: [...nextState.salesTransactions, transaction],
    salesTransactionItems: [...nextState.salesTransactionItems, ...items],
    stockMovements: [...nextState.stockMovements, ...movements],
    auditLogs: [
      ...nextState.auditLogs,
      {
        id: payload.auditLogId ?? id(),
        tenant_id: state.tenant.id,
        user_id: state.currentUserId || null,
        action: 'sale.completed',
        target_type: 'sale',
        target_id: transactionId,
        details: {
          receipt_number: receiptNumber,
          total_amount: totalAmount,
          payment_method: payload.payment_method,
          items: items.length,
          shift_id: openShiftId,
        },
        performed_by: state.currentUserId || null,
        performed_at: now,
      },
    ],
  })

  return { state: finalState, receiptNumber, transactionId, itemIds: items.map((i) => i.id), movementIds: movements.map((m) => m.id), auditLogId: payload.auditLogId ?? finalState.auditLogs[finalState.auditLogs.length - 1]?.id ?? id() }
}

export type WasteType = 'waste' | 'defect' | 'reject'

export function recordWaste(
  state: DemoSystemState,
  payload: { productId: string; wasteType: WasteType; quantity: number; reason?: string }
): DemoSystemState {
  const product = state.products.find((row) => row.id === payload.productId)
  if (!product) return state

  const before = Number(product.quantity_on_hand ?? 0)
  const requested = Math.max(0, Number(payload.quantity ?? 0))
  const result = consumeFifo(state, payload.productId, requested)
  if (result.consumedQuantity <= 0) return state

  const after = Number(result.state.products.find((row) => row.id === payload.productId)?.quantity_on_hand ?? 0)
  const now = nowIso()

  const movement: StockMovement = {
    id: deterministicUuid(state.tenant.id, product.id, payload.wasteType, String(before), String(result.consumedQuantity)),
    tenant_id: state.tenant.id,
    product_id: product.id,
    movement_type: payload.wasteType,
    quantity: result.consumedQuantity,
    quantity_before: before,
    quantity_after: after,
    reference_id: null,
    reference_type: 'waste',
    location_id: product.location_id,
    performed_by: state.currentUserId || null,
    notes: payload.reason?.trim() || `${payload.wasteType} write-off`,
    created_at: now,
    product: result.state.products.find((row) => row.id === product.id),
  }

  return {
    ...result.state,
    stockMovements: [...result.state.stockMovements, movement],
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

  // Put the written-off stock back as a fresh FIFO lot, then record a
  // compensating movement so the ledger stays accurate.
  let nextState: DemoSystemState = addLot(state, {
    id: deterministicUuid(state.tenant.id, movement.id, 'waste-reversal-lot'),
    tenant_id: state.tenant.id,
    product_id: movement.product_id,
    quantity: qty,
    unit_cost: Number(product.unit_cost ?? 0),
    received_at: now,
    source: 'adjustment',
    reference_id: movement.id,
    location_id: movement.location_id ?? product.location_id,
  })
  nextState = syncProductQuantity(nextState, movement.product_id)
  const after = Number(nextState.products.find((p) => p.id === movement.product_id)?.quantity_on_hand ?? 0)

  const reversal: StockMovement = {
    id: deterministicUuid(state.tenant.id, movement.id, 'waste-reversal'),
    tenant_id: state.tenant.id,
    product_id: movement.product_id,
    movement_type: movement.movement_type,
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

export function openShift(
  state: DemoSystemState,
  payload: { openingFloat: number; locationId?: string | null; notes?: string; station?: string | null }
): DemoSystemState {
  const now = nowIso()
  const shift: CashShift = {
    id: id(),
    tenant_id: state.tenant.id,
    shift_code: '',
    opened_by: state.currentUserId || '',
    closed_by: null,
    location_id: payload.locationId ?? null,
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
  const expected = shift.opening_float + shift.total_sales
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

  let nextTotal = Number(shift.total_sales ?? 0)

  if (payload.kind === 'cash_in') {
    nextTotal += Number(payload.amount ?? 0)
  } else if (payload.kind === 'cash_out') {
    nextTotal -= Number(payload.amount ?? 0)
  }

  const updatedShift: CashShift = {
    ...shift,
    total_sales: nextTotal,
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
      const updatedShift: CashShift = {
        ...shift,
        total_sales: Number(shift.total_sales ?? 0) - refundAmount,
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

export function createTransfer(
  state: DemoSystemState,
  payload: { productId: string; fromLocationId: string | null; toLocationId: string | null; quantity: number; notes?: string }
): DemoSystemState {
  const product = state.products.find((row) => row.id === payload.productId)
  if (!product) return state

  const fromLocationId = payload.fromLocationId ?? product.location_id ?? null
  const toLocationId = payload.toLocationId ?? null
  const requested = Math.max(0, Number(payload.quantity ?? 0))
  if (requested <= 0 || !toLocationId || toLocationId === fromLocationId) return state

  const consume = consumeFifo(state, product.id, requested, fromLocationId)
  const qty = consume.consumedQuantity
  if (qty <= 0) return state

  const avgCost = qty > 0 ? consume.consumedCost / qty : 0
  const now = nowIso()

  const fromLoc = state.locations.find((loc) => loc.id === fromLocationId)
  const toLoc = state.locations.find((loc) => loc.id === toLocationId)
  const fromName = fromLoc?.name ?? 'Unknown'
  const toName = toLoc?.name ?? 'Unknown'

  const sourceAfter = lotQuantity(consume.state, product.id, fromLocationId)
  const sourceBefore = sourceAfter + qty
  const destBefore = lotQuantity(state, product.id, toLocationId)

  const destLot: InventoryLot = {
    id: deterministicUuid(product.id, toLocationId ?? 'none', 'transfer-dest', String(qty), String(destBefore)),
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

  const productRef = nextState.products.find((row) => row.id === product.id)
  const destAfter = lotQuantity(nextState, product.id, toLocationId)

  const outMovement: StockMovement = {
    id: deterministicUuid(product.id, fromLocationId ?? 'none', 'transfer-out', String(qty), String(sourceBefore)),
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
    id: deterministicUuid(product.id, toLocationId ?? 'none', 'transfer-in', String(qty), String(destBefore)),
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
