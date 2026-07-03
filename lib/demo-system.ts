import type {
  Alert,
  BusinessType,
  Category,
  DashboardStats,
  Location,
  MovementType,
  OrderStatus,
  PaymentMethod,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  SalesTransaction,
  SalesTransactionItem,
  StockMovement,
  Supplier,
  Tenant,
  TransactionStatus,
  UnitOfMeasure,
  User,
  UserRole,
} from '@/types/database'

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
  purchaseOrders: PurchaseOrder[]
  purchaseOrderItems: PurchaseOrderItem[]
  salesTransactions: SalesTransaction[]
  salesTransactionItems: SalesTransactionItem[]
  stockMovements: StockMovement[]
  alerts: Alert[]
}

type BusinessTemplate = {
  tenantName: string
  categories: Array<{ name: string; color: string }>
  products: Array<{
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
    expiryDays?: number | null
  }>
  suppliers: Array<{
    name: string
    contact_name: string
    email: string
    phone: string
    address: string
    lead_days: number
    notes: string
  }>
}

const COMMON_UOMS = [
  ['Piece', 'pcs'],
  ['Box', 'box'],
  ['Pack', 'pack'],
  ['Kilogram', 'kg'],
  ['Gram', 'g'],
  ['Liter', 'L'],
  ['Milliliter', 'ml'],
  ['Bottle', 'btl'],
  ['Bar', 'bar'],
  ['Can', 'can'],
  ['Sachet', 'sct'],
  ['Roll', 'roll'],
  ['Sheet', 'sheet'],
  ['Sack', 'sack'],
  ['Bundle', 'bundle'],
  ['Card', 'card'],
  ['Dozen', 'doz'],
] as const

const BUSINESS_TEMPLATES: Record<BusinessType, BusinessTemplate> = {
  coffee_shop: {
    tenantName: 'Brew House Cafe',
    categories: [
      { name: 'Coffee Beans', color: '#6B3A2A' },
      { name: 'Tea', color: '#4A7C59' },
      { name: 'Dairy', color: '#F5F5DC' },
      { name: 'Flavoring', color: '#C8A2C8' },
      { name: 'Bakery', color: '#D4A574' },
      { name: 'Ingredients', color: '#F59E0B' },
      { name: 'Packaging', color: '#6366F1' },
      { name: 'Beverage', color: '#00D4AA' },
      { name: 'Food', color: '#EF4444' },
    ],
    suppliers: [
      {
        name: 'BeanCo Roasters',
        contact_name: 'Mika Santos',
        email: 'orders@beanco.example',
        phone: '0917-555-0001',
        address: 'Quezon City',
        lead_days: 3,
        notes: 'Premium beans and blends',
      },
      {
        name: 'FreshDairy Supply',
        contact_name: 'Arvin Dela Cruz',
        email: 'sales@freshdairy.example',
        phone: '0917-555-0002',
        address: 'Pasig City',
        lead_days: 2,
        notes: 'Milk, cream, and dairy items',
      },
      {
        name: 'PackPro',
        contact_name: 'Jessa Lim',
        email: 'hello@packpro.example',
        phone: '0917-555-0003',
        address: 'Makati City',
        lead_days: 5,
        notes: 'Cups, lids, and packaging',
      },
    ],
    products: [
      { item_code: 'COF001', name: 'Espresso Beans', category: 'Coffee Beans', uom: 'kg', unit_cost: 500, selling_price: 800, quantity_on_hand: 20, reorder_point: 5, supplier: 'BeanCo Roasters', location: 'Main Storage' },
      { item_code: 'COF002', name: 'Arabica Beans', category: 'Coffee Beans', uom: 'kg', unit_cost: 600, selling_price: 950, quantity_on_hand: 15, reorder_point: 5, supplier: 'BeanCo Roasters', location: 'Main Storage' },
      { item_code: 'COF003', name: 'Milk', category: 'Dairy', uom: 'L', unit_cost: 60, selling_price: 90, quantity_on_hand: 50, reorder_point: 10, supplier: 'FreshDairy Supply', location: 'Cold Storage' },
      { item_code: 'COF004', name: 'Sugar', category: 'Ingredients', uom: 'kg', unit_cost: 40, selling_price: 70, quantity_on_hand: 4, reorder_point: 5, supplier: 'BeanCo Roasters', location: 'Bulk Storage' },
      { item_code: 'COF005', name: 'Chocolate Syrup', category: 'Flavoring', uom: 'btl', unit_cost: 120, selling_price: 180, quantity_on_hand: 0, reorder_point: 5, supplier: 'FreshDairy Supply', location: 'Shelf A' },
      { item_code: 'COF006', name: 'Tea Leaves', category: 'Tea', uom: 'box', unit_cost: 200, selling_price: 350, quantity_on_hand: 10, reorder_point: 3, supplier: 'BeanCo Roasters', location: 'Main Storage' },
      { item_code: 'COF007', name: 'Pastry Croissant', category: 'Bakery', uom: 'pcs', unit_cost: 30, selling_price: 60, quantity_on_hand: 40, reorder_point: 10, supplier: 'PackPro', location: 'Shelf B' },
      { item_code: 'COF008', name: 'Paper Cups', category: 'Packaging', uom: 'pcs', unit_cost: 2, selling_price: 5, quantity_on_hand: 500, reorder_point: 100, supplier: 'PackPro', location: 'Shelf A' },
      { item_code: 'COF009', name: 'Cup Lids', category: 'Packaging', uom: 'pcs', unit_cost: 1, selling_price: 3, quantity_on_hand: 500, reorder_point: 100, supplier: 'PackPro', location: 'Shelf A' },
      { item_code: 'COF010', name: 'Stirrer Sticks', category: 'Packaging', uom: 'pcs', unit_cost: 0.5, selling_price: 2, quantity_on_hand: 1000, reorder_point: 200, supplier: 'PackPro', location: 'Shelf A' },
    ],
  },
  convenience_store: {
    tenantName: "JM Ilagan's Store",
    categories: [
      { name: 'Beverage', color: '#00D4AA' },
      { name: 'Food', color: '#F59E0B' },
      { name: 'Personal Care', color: '#EC4899' },
      { name: 'Household', color: '#6366F1' },
      { name: 'Condiment', color: '#8B5CF6' },
      { name: 'Staple', color: '#D97706' },
      { name: 'Bakery', color: '#D4A574' },
      { name: 'Miscellaneous', color: '#6B7280' },
      { name: 'Telecom', color: '#0EA5E9' },
    ],
    suppliers: [
      { name: 'Metro Wholesale', contact_name: 'Paolo Reyes', email: 'sales@metrowholesale.example', phone: '0917-555-0101', address: 'Caloocan City', lead_days: 2, notes: 'Fast moving grocery items' },
      { name: 'Daily Needs Depot', contact_name: 'Lorena Cruz', email: 'support@dailyneeds.example', phone: '0917-555-0102', address: 'Pasay City', lead_days: 3, notes: 'Household and personal care' },
      { name: 'SnackLine Distributors', contact_name: 'Nico Ong', email: 'orders@snackline.example', phone: '0917-555-0103', address: 'Taguig City', lead_days: 4, notes: 'Snacks and beverages' },
    ],
    products: [
      { item_code: 'CON001', name: 'Bottled Water', category: 'Beverage', uom: 'btl', unit_cost: 7, selling_price: 15, quantity_on_hand: 180, reorder_point: 60, supplier: 'SnackLine Distributors', location: 'Front Shelf' },
      { item_code: 'CON002', name: 'Instant Noodles', category: 'Food', uom: 'pack', unit_cost: 10, selling_price: 15, quantity_on_hand: 220, reorder_point: 80, supplier: 'Metro Wholesale', location: 'Aisle 2' },
      { item_code: 'CON003', name: 'Laundry Soap', category: 'Household', uom: 'bar', unit_cost: 18, selling_price: 25, quantity_on_hand: 90, reorder_point: 30, supplier: 'Daily Needs Depot', location: 'Aisle 4' },
      { item_code: 'CON004', name: 'Chips', category: 'Food', uom: 'pack', unit_cost: 12, selling_price: 20, quantity_on_hand: 150, reorder_point: 50, supplier: 'SnackLine Distributors', location: 'Front Shelf' },
      { item_code: 'CON005', name: 'Coffee Mix', category: 'Beverage', uom: 'sct', unit_cost: 4, selling_price: 8, quantity_on_hand: 75, reorder_point: 25, supplier: 'Metro Wholesale', location: 'Aisle 1' },
      { item_code: 'CON006', name: 'Canned Sardines', category: 'Staple', uom: 'can', unit_cost: 22, selling_price: 30, quantity_on_hand: 120, reorder_point: 40, supplier: 'Metro Wholesale', location: 'Aisle 3' },
      { item_code: 'CON007', name: 'Shampoo Sachet', category: 'Personal Care', uom: 'sct', unit_cost: 5, selling_price: 10, quantity_on_hand: 240, reorder_point: 80, supplier: 'Daily Needs Depot', location: 'Aisle 4' },
      { item_code: 'CON008', name: 'Rice 5kg', category: 'Staple', uom: 'sack', unit_cost: 220, selling_price: 255, quantity_on_hand: 25, reorder_point: 10, supplier: 'Metro Wholesale', location: 'Back Stock' },
    ],
  },
  manufacturing: {
    tenantName: 'Vertex Manufacturing',
    categories: [
      { name: 'Raw Material', color: '#8B5CF6' },
      { name: 'Component', color: '#6366F1' },
      { name: 'Material', color: '#F59E0B' },
      { name: 'Product', color: '#00D4AA' },
      { name: 'Packaging', color: '#10B981' },
      { name: 'Consumable', color: '#EF4444' },
    ],
    suppliers: [
      { name: 'Prime Metals', contact_name: 'Ben Torres', email: 'orders@primemetals.example', phone: '0917-555-0201', address: 'Valenzuela City', lead_days: 7, notes: 'Metal stock and parts' },
      { name: 'PolyPack Supplies', contact_name: 'Irene Yu', email: 'sales@polypack.example', phone: '0917-555-0202', address: 'Makati City', lead_days: 4, notes: 'Packaging and labels' },
      { name: 'Factory Tools Co', contact_name: 'Rico Ong', email: 'hello@factorytools.example', phone: '0917-555-0203', address: 'Pasig City', lead_days: 5, notes: 'Shop floor consumables' },
    ],
    products: [
      { item_code: 'MFG001', name: 'Steel Sheet', category: 'Raw Material', uom: 'sheet', unit_cost: 450, selling_price: 650, quantity_on_hand: 70, reorder_point: 20, supplier: 'Prime Metals', location: 'Raw Stock' },
      { item_code: 'MFG002', name: 'Bolt Pack', category: 'Component', uom: 'box', unit_cost: 120, selling_price: 180, quantity_on_hand: 40, reorder_point: 15, supplier: 'Prime Metals', location: 'Parts Bin' },
      { item_code: 'MFG003', name: 'Industrial Glue', category: 'Material', uom: 'btl', unit_cost: 90, selling_price: 140, quantity_on_hand: 18, reorder_point: 8, supplier: 'Factory Tools Co', location: 'Consumables' },
      { item_code: 'MFG004', name: 'Finished Panel', category: 'Product', uom: 'pcs', unit_cost: 980, selling_price: 1400, quantity_on_hand: 16, reorder_point: 6, supplier: 'Prime Metals', location: 'Finished Goods' },
      { item_code: 'MFG005', name: 'Carton Box', category: 'Packaging', uom: 'box', unit_cost: 20, selling_price: 35, quantity_on_hand: 200, reorder_point: 50, supplier: 'PolyPack Supplies', location: 'Packing' },
      { item_code: 'MFG006', name: 'Cutting Blade', category: 'Consumable', uom: 'pcs', unit_cost: 60, selling_price: 90, quantity_on_hand: 12, reorder_point: 6, supplier: 'Factory Tools Co', location: 'Shop Floor' },
      { item_code: 'MFG007', name: 'Paint Coat', category: 'Material', uom: 'can', unit_cost: 250, selling_price: 400, quantity_on_hand: 22, reorder_point: 8, supplier: 'Factory Tools Co', location: 'Paint Booth' },
    ],
  },
  restaurant: {
    tenantName: 'Casa Mesa Kitchen',
    categories: [
      { name: 'Protein', color: '#EF4444' },
      { name: 'Vegetable', color: '#10B981' },
      { name: 'Condiment', color: '#F59E0B' },
      { name: 'Grain', color: '#D97706' },
      { name: 'Dairy', color: '#F5F5DC' },
      { name: 'Beverage', color: '#00D4AA' },
      { name: 'Packaging', color: '#6366F1' },
    ],
    suppliers: [
      { name: 'FreshFarm Supply', contact_name: 'Ella Perez', email: 'orders@freshfarm.example', phone: '0917-555-0301', address: 'Laguna', lead_days: 2, notes: 'Vegetables and poultry' },
      { name: 'Kitchen Pro', contact_name: 'Gio Lim', email: 'sales@kitchenpro.example', phone: '0917-555-0302', address: 'Mandaluyong', lead_days: 3, notes: 'Sauces and dry goods' },
      { name: 'ColdChain Dairy', contact_name: 'Mara Santos', email: 'hello@coldchain.example', phone: '0917-555-0303', address: 'Cavite', lead_days: 2, notes: 'Milk, butter, cream' },
    ],
    products: [
      { item_code: 'RST001', name: 'Chicken Thigh', category: 'Protein', uom: 'kg', unit_cost: 180, selling_price: 280, quantity_on_hand: 35, reorder_point: 10, supplier: 'FreshFarm Supply', location: 'Chiller' },
      { item_code: 'RST002', name: 'Basmati Rice', category: 'Grain', uom: 'sack', unit_cost: 1200, selling_price: 1500, quantity_on_hand: 10, reorder_point: 3, supplier: 'Kitchen Pro', location: 'Dry Storage' },
      { item_code: 'RST003', name: 'Tomato Sauce', category: 'Condiment', uom: 'can', unit_cost: 40, selling_price: 70, quantity_on_hand: 48, reorder_point: 12, supplier: 'Kitchen Pro', location: 'Dry Storage' },
      { item_code: 'RST004', name: 'Leafy Greens', category: 'Vegetable', uom: 'kg', unit_cost: 60, selling_price: 110, quantity_on_hand: 22, reorder_point: 8, supplier: 'FreshFarm Supply', location: 'Chiller' },
      { item_code: 'RST005', name: 'Cooking Oil', category: 'Condiment', uom: 'btl', unit_cost: 130, selling_price: 180, quantity_on_hand: 28, reorder_point: 10, supplier: 'Kitchen Pro', location: 'Dry Storage' },
      { item_code: 'RST006', name: 'Milk', category: 'Dairy', uom: 'L', unit_cost: 60, selling_price: 95, quantity_on_hand: 20, reorder_point: 8, supplier: 'ColdChain Dairy', location: 'Chiller' },
      { item_code: 'RST007', name: 'Takeout Box', category: 'Packaging', uom: 'pcs', unit_cost: 4, selling_price: 8, quantity_on_hand: 300, reorder_point: 100, supplier: 'Kitchen Pro', location: 'Front Desk' },
    ],
  },
  retail: {
    tenantName: 'Corner Retail Hub',
    categories: [
      { name: 'General', color: '#6B7280' },
      { name: 'Product', color: '#00D4AA' },
      { name: 'Supply', color: '#6366F1' },
      { name: 'Packaging', color: '#F59E0B' },
    ],
    suppliers: [
      { name: 'RetailLink', contact_name: 'Santi Lopez', email: 'orders@retaillink.example', phone: '0917-555-0401', address: 'Manila', lead_days: 3, notes: 'General retail items' },
      { name: 'Supply Point', contact_name: 'Anna Cruz', email: 'sales@supplypoint.example', phone: '0917-555-0402', address: 'Cebu', lead_days: 4, notes: 'Office and household supplies' },
      { name: 'StockMart', contact_name: 'Kevin Tan', email: 'hello@stockmart.example', phone: '0917-555-0403', address: 'Davao', lead_days: 5, notes: 'Fast moving retail goods' },
    ],
    products: [
      { item_code: 'RTL001', name: 'Notebook', category: 'Product', uom: 'pcs', unit_cost: 18, selling_price: 30, quantity_on_hand: 180, reorder_point: 50, supplier: 'RetailLink', location: 'Main Shelf' },
      { item_code: 'RTL002', name: 'Ballpen', category: 'Supply', uom: 'pcs', unit_cost: 6, selling_price: 10, quantity_on_hand: 320, reorder_point: 80, supplier: 'Supply Point', location: 'Main Shelf' },
      { item_code: 'RTL003', name: 'Detergent', category: 'General', uom: 'pcs', unit_cost: 55, selling_price: 75, quantity_on_hand: 60, reorder_point: 20, supplier: 'StockMart', location: 'Household' },
      { item_code: 'RTL004', name: 'Battery AA', category: 'General', uom: 'pack', unit_cost: 90, selling_price: 130, quantity_on_hand: 48, reorder_point: 15, supplier: 'StockMart', location: 'Accessories' },
      { item_code: 'RTL005', name: 'Folder', category: 'Supply', uom: 'pcs', unit_cost: 12, selling_price: 20, quantity_on_hand: 140, reorder_point: 40, supplier: 'Supply Point', location: 'Main Shelf' },
    ],
  },
  pharmacy: {
    tenantName: 'MediCare Pharmacy',
    categories: [
      { name: 'Medicine', color: '#8B5CF6' },
      { name: 'Vitamins', color: '#10B981' },
      { name: 'First Aid', color: '#F59E0B' },
      { name: 'Personal Care', color: '#EC4899' },
      { name: 'Medical Supply', color: '#6366F1' },
    ],
    suppliers: [
      { name: 'MedSource', contact_name: 'Dr. Ivy Lim', email: 'orders@medsource.example', phone: '0917-555-0501', address: 'Makati City', lead_days: 2, notes: 'Primary medicines and OTC' },
      { name: 'HealthPlus Distributors', contact_name: 'Rico David', email: 'sales@healthplus.example', phone: '0917-555-0502', address: 'Pasig City', lead_days: 3, notes: 'Vitamins and supply items' },
      { name: 'SterileCare', contact_name: 'Mina Yu', email: 'hello@sterilecare.example', phone: '0917-555-0503', address: 'Taguig City', lead_days: 4, notes: 'Medical and hygiene goods' },
    ],
    products: [
      { item_code: 'PHR001', name: 'Paracetamol', category: 'Medicine', uom: 'box', unit_cost: 45, selling_price: 70, quantity_on_hand: 85, reorder_point: 30, supplier: 'MedSource', location: 'Medicine Shelf' },
      { item_code: 'PHR002', name: 'Vitamin C', category: 'Vitamins', uom: 'box', unit_cost: 90, selling_price: 130, quantity_on_hand: 55, reorder_point: 20, supplier: 'HealthPlus Distributors', location: 'Medicine Shelf' },
      { item_code: 'PHR003', name: 'Alcohol 70%', category: 'First Aid', uom: 'btl', unit_cost: 35, selling_price: 55, quantity_on_hand: 60, reorder_point: 20, supplier: 'SterileCare', location: 'OTC Shelf' },
      { item_code: 'PHR004', name: 'Face Mask', category: 'Medical Supply', uom: 'box', unit_cost: 120, selling_price: 180, quantity_on_hand: 42, reorder_point: 15, supplier: 'SterileCare', location: 'Medical Shelf' },
      { item_code: 'PHR005', name: 'Soap', category: 'Personal Care', uom: 'pcs', unit_cost: 20, selling_price: 35, quantity_on_hand: 70, reorder_point: 20, supplier: 'HealthPlus Distributors', location: 'Personal Care' },
    ],
  },
  general: {
    tenantName: 'General Trading',
    categories: [
      { name: 'General', color: '#6B7280' },
      { name: 'Product', color: '#00D4AA' },
      { name: 'Supply', color: '#6366F1' },
      { name: 'Packaging', color: '#F59E0B' },
    ],
    suppliers: [
      { name: 'North Star Trading', contact_name: 'Alyssa Cruz', email: 'orders@northstar.example', phone: '0917-555-0601', address: 'Quezon City', lead_days: 4, notes: 'Broadline wholesale supplier' },
      { name: 'Metro Supply', contact_name: 'Dennis Yu', email: 'sales@metrosupply.example', phone: '0917-555-0602', address: 'Pasig City', lead_days: 5, notes: 'Mixed business supplies' },
    ],
    products: [
      { item_code: 'GEN001', name: 'General Item A', category: 'General', uom: 'pcs', unit_cost: 15, selling_price: 25, quantity_on_hand: 140, reorder_point: 40, supplier: 'North Star Trading', location: 'Main Rack' },
      { item_code: 'GEN002', name: 'General Item B', category: 'Product', uom: 'pack', unit_cost: 25, selling_price: 40, quantity_on_hand: 95, reorder_point: 25, supplier: 'Metro Supply', location: 'Main Rack' },
      { item_code: 'GEN003', name: 'General Supply', category: 'Supply', uom: 'box', unit_cost: 80, selling_price: 120, quantity_on_hand: 30, reorder_point: 10, supplier: 'North Star Trading', location: 'Backroom' },
    ],
  },
}

function id() {
  return crypto.randomUUID()
}

function nowIso() {
  return new Date().toISOString()
}

function daysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function pastIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function createTenant(businessType: BusinessType): Tenant {
  const template = BUSINESS_TEMPLATES[businessType]
  const now = nowIso()
  return {
    id: id(),
    name: template.tenantName,
    business_type: businessType,
    logo_url: null,
    address: 'Metro Manila, Philippines',
    phone: '0917-555-1234',
    email: `hello@${template.tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example`,
    tax_id: 'TIN-000-000-000',
    currency: 'PHP',
    timezone: 'Asia/Manila',
    plan: 'professional',
    subscription_status: 'active',
    trial_ends_at: null,
    subscription_ends_at: daysFromNow(180) + 'T00:00:00.000Z',
    max_users: 10,
    max_products: 1000,
    max_locations: 5,
    is_active: true,
    created_at: now,
    updated_at: now,
  }
}

function createUsers(tenantId: string): User[] {
  const now = nowIso()
  return [
    {
      id: id(),
      tenant_id: tenantId,
      role: 'admin',
      full_name: 'Admin User',
      email: 'admin@codentra.example',
      avatar_url: null,
      is_active: true,
      last_login: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: id(),
      tenant_id: tenantId,
      role: 'manager',
      full_name: 'Store Manager',
      email: 'manager@codentra.example',
      avatar_url: null,
      is_active: true,
      last_login: pastIso(1),
      created_at: now,
      updated_at: now,
    },
    {
      id: id(),
      tenant_id: tenantId,
      role: 'cashier',
      full_name: 'Cashier One',
      email: 'cashier@codentra.example',
      avatar_url: null,
      is_active: true,
      last_login: pastIso(0),
      created_at: now,
      updated_at: now,
    },
  ]
}

function createUnitsOfMeasure(tenantId: string): UnitOfMeasure[] {
  const now = nowIso()
  return COMMON_UOMS.map(([name, abbreviation]) => ({
    id: id(),
    tenant_id: tenantId,
    name,
    abbreviation,
    is_active: true,
    created_at: now,
  }))
}

function createCategories(tenantId: string, businessType: BusinessType): Category[] {
  const now = nowIso()
  return BUSINESS_TEMPLATES[businessType].categories.map(({ name, color }) => ({
    id: id(),
    tenant_id: tenantId,
    name,
    description: null,
    color,
    is_active: true,
    created_at: now,
  }))
}

function createLocations(tenantId: string) {
  const now = nowIso()
  return [
    { id: id(), tenant_id: tenantId, code: 'MAIN', name: 'Main Storage', zone: 'General', is_active: true, created_at: now },
    { id: id(), tenant_id: tenantId, code: 'POS', name: 'POS Counter', zone: 'Front Office', is_active: true, created_at: now },
  ] as Location[]
}

function createSuppliers(tenantId: string, template: BusinessTemplate): Supplier[] {
  const now = nowIso()
  return template.suppliers.map((supplier) => ({
    id: id(),
    tenant_id: tenantId,
    name: supplier.name,
    contact_name: supplier.contact_name,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address,
    lead_days: supplier.lead_days,
    is_active: true,
    notes: supplier.notes,
    created_at: now,
    updated_at: now,
  }))
}

function mapById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]))
}

function createProducts(
  tenantId: string,
  template: BusinessTemplate,
  categories: Category[],
  suppliers: Supplier[],
  locations: Location[],
  unitsOfMeasure: UnitOfMeasure[]
): Product[] {
  const now = nowIso()
  const categoryByName = new Map(categories.map((category) => [category.name, category]))
  const supplierByName = new Map(suppliers.map((supplier) => [supplier.name, supplier]))
  const locationByName = new Map(locations.map((location) => [location.name, location]))
  const uomByAbbrev = new Map(unitsOfMeasure.map((uom) => [uom.abbreviation, uom]))

  return template.products.map((seed) => {
    const category = categoryByName.get(seed.category)
    const supplier = supplierByName.get(seed.supplier)
    const location = locationByName.get(seed.location)
    const uom = uomByAbbrev.get(seed.uom)
    return {
      id: id(),
      tenant_id: tenantId,
      item_code: seed.item_code,
      name: seed.name,
      description: null,
      category_id: category?.id ?? null,
      supplier_id: supplier?.id ?? null,
      location_id: location?.id ?? null,
      uom_id: uom?.id ?? null,
      quantity_on_hand: seed.quantity_on_hand,
      quantity_reserved: 0,
      reorder_point: seed.reorder_point,
      reorder_quantity: Math.max(seed.reorder_point * 2, 1),
      max_stock: null,
      unit_cost: seed.unit_cost,
      selling_price: seed.selling_price,
      barcode: seed.item_code,
      image_url: null,
      is_active: true,
      expiry_date: seed.expiryDays ? daysFromNow(seed.expiryDays) : null,
      created_at: now,
      updated_at: now,
      category,
      supplier,
      location,
      uom,
    } as Product
  })
}

function createAlerts(tenantId: string, products: Product[]): Alert[] {
  const now = nowIso()
  const alerts: Alert[] = []
  for (const product of products) {
    if (product.quantity_on_hand === 0) {
      alerts.push({
        id: id(),
        tenant_id: tenantId,
        product_id: product.id,
        alert_type: 'out_of_stock',
        status: 'open',
        message: `${product.name} is out of stock`,
        threshold: product.reorder_point,
        current_qty: product.quantity_on_hand,
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_at: null,
        created_at: now,
      })
    } else if (product.quantity_on_hand <= product.reorder_point) {
      alerts.push({
        id: id(),
        tenant_id: tenantId,
        product_id: product.id,
        alert_type: 'low_stock',
        status: 'open',
        message: `${product.name} is below reorder point`,
        threshold: product.reorder_point,
        current_qty: product.quantity_on_hand,
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_at: null,
        created_at: now,
      })
    }
  }
  return alerts
}

function createStockMovements(tenantId: string, products: Product[], users: User[], locations: Location[]): StockMovement[] {
  const now = nowIso()
  const adminId = users[0]?.id ?? null
  const locationId = locations[0]?.id ?? null
  const movementSeeds = [
    { index: 0, type: 'inbound', quantity: 40, notes: 'Opening stock' },
    { index: 1, type: 'outbound', quantity: 5, notes: 'POS sale' },
    { index: 2, type: 'inbound', quantity: 20, notes: 'Supplier delivery' },
    { index: 3, type: 'adjustment', quantity: -1, notes: 'Cycle count correction' },
    { index: 4, type: 'production', quantity: 12, notes: 'Finished goods from production' },
  ] as const

  return movementSeeds
    .map((seed, offset) => {
      const product = products[seed.index % products.length]
      if (!product) return null
      const before = product.quantity_on_hand
      const after = Math.max(before + (seed.type === 'outbound' ? -seed.quantity : seed.quantity), 0)
      return {
        id: id(),
        tenant_id: tenantId,
        product_id: product.id,
        movement_type: seed.type as MovementType,
        quantity: seed.quantity,
        quantity_before: before,
        quantity_after: after,
        reference_id: null,
        reference_type: 'seed',
        location_id: locationId,
        performed_by: adminId,
        notes: seed.notes,
        created_at: new Date(Date.now() - offset * 3600_000).toISOString(),
      } as StockMovement
    })
    .filter(Boolean) as StockMovement[]
}

function createSales(
  tenantId: string,
  users: User[],
  locations: Location[],
  products: Product[]
): { transactions: SalesTransaction[]; items: SalesTransactionItem[] } {
  const cashierId = users.find((user) => user.role === 'cashier')?.id ?? users[0]?.id ?? null
  const locationId = locations[1]?.id ?? locations[0]?.id ?? null
  const now = nowIso()
  const recentSaleId = id()
  const previousSaleId = id()
  const recentProductA = products[0]
  const recentProductB = products[2] ?? products[1]
  const previousProduct = products[6] ?? products[1]

  const recentItems: SalesTransactionItem[] = [
    {
      id: id(),
      transaction_id: recentSaleId,
      product_id: recentProductA.id,
      quantity: 2,
      unit_price: recentProductA.selling_price ?? 0,
      unit_cost: recentProductA.unit_cost,
      discount: 0,
      subtotal: (recentProductA.selling_price ?? 0) * 2,
      created_at: now,
    },
    {
      id: id(),
      transaction_id: recentSaleId,
      product_id: recentProductB.id,
      quantity: 1,
      unit_price: recentProductB.selling_price ?? 0,
      unit_cost: recentProductB.unit_cost,
      discount: 0,
      subtotal: recentProductB.selling_price ?? 0,
      created_at: now,
    },
  ]

  const previousItems: SalesTransactionItem[] = [
    {
      id: id(),
      transaction_id: previousSaleId,
      product_id: previousProduct.id,
      quantity: 3,
      unit_price: previousProduct.selling_price ?? 0,
      unit_cost: previousProduct.unit_cost,
      discount: 0,
      subtotal: (previousProduct.selling_price ?? 0) * 3,
      created_at: pastIso(1),
    },
  ]

  const transactions: SalesTransaction[] = [
    {
      id: recentSaleId,
      tenant_id: tenantId,
      receipt_number: `REC-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-1001`,
      cashier_id: cashierId,
      location_id: locationId,
      status: 'completed',
      payment_method: 'cash',
      subtotal: recentItems.reduce((sum, item) => sum + item.subtotal, 0),
      discount_amount: 0,
      tax_amount: 0,
      total_amount: recentItems.reduce((sum, item) => sum + item.subtotal, 0),
      amount_tendered: recentItems.reduce((sum, item) => sum + item.subtotal, 0) + 100,
      change_amount: 100,
      notes: 'Morning counter sale',
      voided_by: null,
      voided_at: null,
      void_reason: null,
      created_at: now,
    },
    {
      id: previousSaleId,
      tenant_id: tenantId,
      receipt_number: `REC-${new Date(Date.now() - 86400000).toISOString().slice(0, 10).replaceAll('-', '')}-1000`,
      cashier_id: cashierId,
      location_id: locationId,
      status: 'completed',
      payment_method: 'gcash',
      subtotal: previousItems.reduce((sum, item) => sum + item.subtotal, 0),
      discount_amount: 0,
      tax_amount: 0,
      total_amount: previousItems.reduce((sum, item) => sum + item.subtotal, 0),
      amount_tendered: previousItems.reduce((sum, item) => sum + item.subtotal, 0),
      change_amount: 0,
      notes: 'Yesterday sale',
      voided_by: null,
      voided_at: null,
      void_reason: null,
      created_at: pastIso(1),
    },
  ]

  return { transactions, items: [...recentItems, ...previousItems] }
}

function createPurchaseOrders(
  tenantId: string,
  users: User[],
  suppliers: Supplier[],
  products: Product[]
): { orders: PurchaseOrder[]; items: PurchaseOrderItem[] } {
  const now = nowIso()
  const managerId = users.find((user) => user.role === 'manager')?.id ?? users[0]?.id ?? null
  const supplier = suppliers[0]
  const secondSupplier = suppliers[1] ?? supplier
  const orders: PurchaseOrder[] = []
  const items: PurchaseOrderItem[] = []

  const buildOrder = (suffix: string, supplierId: string, status: OrderStatus, productIndexes: number[]) => {
    const orderId = id()
    const orderItems = productIndexes
      .map((index, position) => {
        const product = products[index % products.length]
        if (!product) return null
        const quantity = 10 + position * 5
        const record: PurchaseOrderItem = {
          id: id(),
          po_id: orderId,
          product_id: product.id,
          quantity_ordered: quantity,
          quantity_received: status === 'received' ? quantity : status === 'partially_received' && position === 0 ? Math.floor(quantity / 2) : 0,
          unit_cost: product.unit_cost,
          notes: null,
          created_at: now,
        }
        return record
      })
      .filter(Boolean) as PurchaseOrderItem[]

    items.push(...orderItems)
    orders.push({
      id: orderId,
      tenant_id: tenantId,
      po_number: `PO-${new Date().toISOString().slice(0, 10).replaceAll('-', '').slice(0, 6)}-${suffix}`,
      supplier_id: supplierId,
      status,
      created_by: managerId,
      approved_by: managerId,
      approved_at: status === 'draft' ? null : now,
      expected_date: daysFromNow(7),
      received_date: status === 'received' ? daysFromNow(0) : null,
      notes: status === 'draft' ? 'Draft replenishment order' : 'Auto seeded order',
      created_at: now,
      updated_at: now,
    })
  }

  buildOrder('1001', supplier.id, 'ordered', [3, 4, 7])
  buildOrder('1002', secondSupplier.id, 'received', [0, 1])
  buildOrder('1003', secondSupplier.id, 'draft', [2])

  return { orders, items }
}

function buildState(businessType: BusinessType): DemoSystemState {
  const tenant = createTenant(businessType)
  const categories = createCategories(tenant.id, businessType)
  const unitsOfMeasure = createUnitsOfMeasure(tenant.id)
  const locations = createLocations(tenant.id)
  const suppliers = createSuppliers(tenant.id, BUSINESS_TEMPLATES[businessType])
  const users = createUsers(tenant.id)
  const products = createProducts(tenant.id, BUSINESS_TEMPLATES[businessType], categories, suppliers, locations, unitsOfMeasure)
  const alerts = createAlerts(tenant.id, products)
  const stockMovements = createStockMovements(tenant.id, products, users, locations)
  const { transactions, items } = createSales(tenant.id, users, locations, products)
  const { orders, items: poItems } = createPurchaseOrders(tenant.id, users, suppliers, products)

  return {
    tenant,
    currentUserId: users[0]?.id ?? '',
    categories,
    unitsOfMeasure,
    locations,
    suppliers,
    products,
    users,
    purchaseOrders: orders,
    purchaseOrderItems: poItems,
    salesTransactions: transactions,
    salesTransactionItems: items,
    stockMovements,
    alerts,
  }
}

export function seedDemoSystem(businessType: BusinessType = 'coffee_shop'): DemoSystemState {
  return buildState(businessType)
}

export function remapStateTenantId(state: DemoSystemState, tenantId: string): DemoSystemState {
  const remapTenantRow = <T extends { tenant_id: string }>(rows: T[]) => rows.map((row) => ({ ...row, tenant_id: tenantId }))

  return {
    ...state,
    tenant: {
      ...state.tenant,
      id: tenantId,
    },
    categories: remapTenantRow(state.categories),
    unitsOfMeasure: remapTenantRow(state.unitsOfMeasure),
    locations: remapTenantRow(state.locations),
    suppliers: remapTenantRow(state.suppliers),
    products: remapTenantRow(state.products),
    users: remapTenantRow(state.users),
    purchaseOrders: remapTenantRow(state.purchaseOrders),
    stockMovements: remapTenantRow(state.stockMovements),
    alerts: remapTenantRow(state.alerts),
    salesTransactions: remapTenantRow(state.salesTransactions),
  }
}

export function normalizeBusinessType(value: string | null | undefined): BusinessType {
  if (value === 'coffee_shop' || value === 'manufacturing' || value === 'convenience_store' || value === 'restaurant' || value === 'retail' || value === 'pharmacy' || value === 'general') {
    return value
  }
  return 'coffee_shop'
}

export function computeDashboardStats(state: DemoSystemState): DashboardStats {
  const activeProducts = state.products.filter((product) => product.is_active)
  const lowStockCount = activeProducts.filter((product) => product.quantity_on_hand > 0 && product.quantity_on_hand <= product.reorder_point).length
  const outOfStockCount = activeProducts.filter((product) => product.quantity_on_hand === 0).length

  return {
    total_products: activeProducts.length,
    total_value: activeProducts.reduce((sum, product) => sum + (Number(product.quantity_on_hand) * Number(product.unit_cost ?? 0)), 0),
    low_stock_count: lowStockCount,
    out_of_stock_count: outOfStockCount,
    open_alerts: state.alerts.filter((alert) => alert.status === 'open').length,
    pending_orders: state.purchaseOrders.filter((order) => ['pending_approval', 'approved', 'ordered'].includes(order.status)).length,
    sales_today: state.salesTransactions.filter((tx) => tx.status === 'completed' && tx.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((sum, tx) => sum + Number(tx.total_amount), 0),
    transactions_today: state.salesTransactions.filter((tx) => tx.status === 'completed' && tx.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
  }
}

function syncAlerts(state: DemoSystemState): Alert[] {
  const nextAlerts = [...state.alerts]
  const now = nowIso()

  for (const product of state.products) {
    const shouldAlert = product.quantity_on_hand === 0 || product.quantity_on_hand <= product.reorder_point
    const alertType = product.quantity_on_hand === 0 ? 'out_of_stock' : 'low_stock'
    const existingOpen = nextAlerts.find((alert) => alert.product_id === product.id && alert.alert_type === alertType && alert.status !== 'resolved')

    if (shouldAlert) {
      if (existingOpen) {
        existingOpen.message = product.quantity_on_hand === 0 ? `${product.name} is out of stock` : `${product.name} is below reorder point`
        existingOpen.threshold = product.reorder_point
        existingOpen.current_qty = product.quantity_on_hand
      } else {
        nextAlerts.push({
          id: id(),
          tenant_id: state.tenant.id,
          product_id: product.id,
          alert_type: alertType,
          status: 'open',
          message: product.quantity_on_hand === 0 ? `${product.name} is out of stock` : `${product.name} is below reorder point`,
          threshold: product.reorder_point,
          current_qty: product.quantity_on_hand,
          acknowledged_by: null,
          acknowledged_at: null,
          resolved_at: null,
          created_at: now,
        })
      }
      continue
    }

    for (const alert of nextAlerts) {
      if (alert.product_id === product.id && alert.status !== 'resolved') {
        alert.status = 'resolved'
        alert.resolved_at = now
      }
    }
  }

  return nextAlerts
}

export function updateTenantSettings(
  state: DemoSystemState,
  patch: Partial<Tenant> & { business_type?: BusinessType }
): DemoSystemState {
  const planLimits = {
    starter: { max_users: 3, max_products: 100, max_locations: 1 },
    professional: { max_users: 10, max_products: 1000, max_locations: 5 },
    enterprise: { max_users: 999, max_products: 9999, max_locations: 99 },
  }[patch.plan ?? state.tenant.plan ?? 'professional']

  const clampPositive = (value: unknown, fallback: number, max: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return Math.min(fallback, max)
    return Math.min(Math.floor(parsed), max)
  }

  const nextTenant = {
    ...state.tenant,
    ...patch,
    max_users: clampPositive(patch.max_users ?? state.tenant.max_users, state.tenant.max_users, planLimits.max_users),
    max_products: clampPositive(patch.max_products ?? state.tenant.max_products, state.tenant.max_products, planLimits.max_products),
    max_locations: clampPositive(patch.max_locations ?? state.tenant.max_locations, state.tenant.max_locations, planLimits.max_locations),
    updated_at: nowIso(),
  }
  return {
    ...state,
    tenant: nextTenant,
  }
}

export function addOrUpdateProduct(
  state: DemoSystemState,
  draft: ProductDraft,
  productId?: string
): DemoSystemState {
  const now = nowIso()
  const category = state.categories.find((item) => item.name === draft.category)
  const supplier = state.suppliers.find((item) => item.name === draft.supplier)
  const location = state.locations.find((item) => item.name === draft.location)
  const uom = state.unitsOfMeasure.find((item) => item.abbreviation === draft.uom || item.name === draft.uom)
  const product: Product = {
    id: productId ?? id(),
    tenant_id: state.tenant.id,
    item_code: draft.item_code,
    name: draft.name,
    description: draft.description ?? null,
    category_id: category?.id ?? null,
    supplier_id: supplier?.id ?? null,
    location_id: location?.id ?? null,
    uom_id: uom?.id ?? null,
    quantity_on_hand: draft.quantity_on_hand,
    quantity_reserved: 0,
    reorder_point: draft.reorder_point,
    reorder_quantity: Math.max(draft.reorder_point * 2, 1),
    max_stock: null,
    unit_cost: draft.unit_cost,
    selling_price: draft.selling_price,
    barcode: draft.item_code,
    image_url: null,
    is_active: true,
    expiry_date: null,
    created_at: now,
    updated_at: now,
    category,
    supplier,
    location,
    uom,
  }

  const exists = state.products.some((item) => item.id === product.id)
  if (!exists && state.products.length >= state.tenant.max_products) {
    throw new Error(`Your ${state.tenant.plan} plan allows up to ${state.tenant.max_products} products.`)
  }
  const nextProducts = exists ? state.products.map((item) => (item.id === product.id ? { ...product, created_at: item.created_at } : item)) : [...state.products, product]
  const nextAlerts = syncAlerts({ ...state, products: nextProducts })
  return {
    ...state,
    products: nextProducts,
    alerts: nextAlerts,
    stockMovements: [
      ...state.stockMovements,
      {
        id: id(),
        tenant_id: state.tenant.id,
        product_id: product.id,
        movement_type: exists ? 'adjustment' : 'inbound',
        quantity: draft.quantity_on_hand,
        quantity_before: exists ? state.products.find((item) => item.id === product.id)?.quantity_on_hand ?? 0 : 0,
        quantity_after: draft.quantity_on_hand,
        reference_id: null,
        reference_type: exists ? 'product_update' : 'product_create',
        location_id: location?.id ?? null,
        performed_by: state.currentUserId,
        notes: exists ? 'Updated product details' : 'Added product',
        created_at: now,
      },
    ],
  }
}

export function deleteProduct(state: DemoSystemState, productId: string): DemoSystemState {
  const nextProducts = state.products.filter((product) => product.id !== productId)
  const nextAlerts = state.alerts.filter((alert) => alert.product_id !== productId)
  return {
    ...state,
    products: nextProducts,
    alerts: nextAlerts,
  }
}

export function importProducts(state: DemoSystemState, drafts: ProductDraft[]): DemoSystemState {
  return drafts.reduce((current, draft) => addOrUpdateProduct(current, draft), state)
}

export function createSupplier(state: DemoSystemState, draft: SupplierDraft): DemoSystemState {
  const now = nowIso()
  const supplier: Supplier = {
    id: id(),
    tenant_id: state.tenant.id,
    name: draft.name,
    contact_name: draft.contact_name,
    email: draft.email,
    phone: draft.phone,
    address: draft.address,
    lead_days: draft.lead_days,
    is_active: true,
    notes: draft.notes,
    created_at: now,
    updated_at: now,
  }
  return {
    ...state,
    suppliers: [...state.suppliers, supplier],
  }
}

export function updateSupplier(state: DemoSystemState, supplierId: string, draft: SupplierDraft): DemoSystemState {
  const nextSuppliers = state.suppliers.map((supplier) =>
    supplier.id === supplierId
      ? {
          ...supplier,
          name: draft.name,
          contact_name: draft.contact_name,
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          lead_days: draft.lead_days,
          notes: draft.notes,
          updated_at: nowIso(),
        }
      : supplier
  )

  return {
    ...state,
    suppliers: nextSuppliers,
    products: state.products.map((product) =>
      product.supplier_id === supplierId
        ? {
            ...product,
            supplier: nextSuppliers.find((supplier) => supplier.id === supplierId),
          }
        : product
    ),
  }
}

export function deleteSupplier(state: DemoSystemState, supplierId: string): DemoSystemState {
  return {
    ...state,
    suppliers: state.suppliers.filter((supplier) => supplier.id !== supplierId),
    products: state.products.map((product) => (product.supplier_id === supplierId ? { ...product, supplier_id: null, supplier: undefined } : product)),
  }
}

export function createUser(state: DemoSystemState, draft: UserDraft): DemoSystemState {
  const now = nowIso()
  if (state.users.length >= state.tenant.max_users) {
    throw new Error(`Your ${state.tenant.plan} plan allows up to ${state.tenant.max_users} users.`)
  }
  const user: User = {
    id: id(),
    tenant_id: state.tenant.id,
    role: draft.role,
    full_name: draft.full_name,
    email: draft.email,
    avatar_url: null,
    is_active: true,
    last_login: null,
    created_at: now,
    updated_at: now,
  }
  return {
    ...state,
    users: [...state.users, user],
  }
}

export function toggleUserActive(state: DemoSystemState, userId: string): DemoSystemState {
  return {
    ...state,
    users: state.users.map((user) =>
      user.id === userId ? { ...user, is_active: !user.is_active, updated_at: nowIso() } : user
    ),
  }
}

export function createPurchaseOrder(state: DemoSystemState, draft: PurchaseOrderDraft): DemoSystemState {
  const now = nowIso()
  const poId = id()
  const po: PurchaseOrder = {
    id: poId,
    tenant_id: state.tenant.id,
    po_number: `PO-${new Date().toISOString().slice(0, 10).replaceAll('-', '').slice(0, 6)}-${1000 + state.purchaseOrders.length}`,
    supplier_id: draft.supplier_id,
    status: 'draft',
    created_by: state.currentUserId,
    approved_by: null,
    approved_at: null,
    expected_date: draft.expected_date || null,
    received_date: null,
    notes: draft.notes || null,
    created_at: now,
    updated_at: now,
  }
  const items: PurchaseOrderItem[] = draft.items.map((item) => ({
    id: id(),
    po_id: poId,
    product_id: item.product_id,
    quantity_ordered: item.quantity_ordered,
    quantity_received: 0,
    unit_cost: item.unit_cost,
    notes: null,
    created_at: now,
  }))
  return {
    ...state,
    purchaseOrders: [...state.purchaseOrders, po],
    purchaseOrderItems: [...state.purchaseOrderItems, ...items],
  }
}

export function receivePurchaseOrder(state: DemoSystemState, purchaseOrderId: string): DemoSystemState {
  const now = nowIso()
  const orderItems = state.purchaseOrderItems.filter((item) => item.po_id === purchaseOrderId)
  const updatedProducts = state.products.map((product) => {
    const item = orderItems.find((entry) => entry.product_id === product.id)
    if (!item) return product
    return {
      ...product,
      quantity_on_hand: product.quantity_on_hand + item.quantity_ordered,
      updated_at: now,
    }
  })

  const updatedOrders = state.purchaseOrders.map((order) =>
    order.id === purchaseOrderId
      ? { ...order, status: 'received' as OrderStatus, received_date: now.slice(0, 10), updated_at: now }
      : order
  )

  const movements: StockMovement[] = orderItems.map((item) => {
    const product = state.products.find((entry) => entry.id === item.product_id)
    return {
      id: id(),
      tenant_id: state.tenant.id,
      product_id: item.product_id,
      movement_type: 'inbound',
      quantity: item.quantity_ordered,
      quantity_before: product?.quantity_on_hand ?? 0,
      quantity_after: (product?.quantity_on_hand ?? 0) + item.quantity_ordered,
      reference_id: purchaseOrderId,
      reference_type: 'purchase_order_receipt',
      location_id: product?.location_id ?? null,
      performed_by: state.currentUserId,
      notes: 'PO received',
      created_at: now,
    }
  })

  const nextState = {
    ...state,
    products: updatedProducts,
    purchaseOrders: updatedOrders,
    stockMovements: [...state.stockMovements, ...movements],
  }

  return {
    ...nextState,
    alerts: syncAlerts(nextState),
  }
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
    receiptNumber?: string
    items: SaleDraftItem[]
  }
): { state: DemoSystemState; receiptNumber: string } {
  const now = nowIso()
  const txId = id()
  const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unit_price - item.discount, 0)
  const receiptNumber = payload.receiptNumber ?? `REC-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${1000 + state.salesTransactions.length}`

  const transaction: SalesTransaction = {
    id: txId,
    tenant_id: state.tenant.id,
    receipt_number: receiptNumber,
    cashier_id: state.currentUserId,
    location_id: payload.location_id,
    status: 'completed',
    payment_method: payload.payment_method,
    payment_provider: payload.payment_provider ?? 'manual',
    payment_reference: payload.payment_reference ?? null,
    subtotal,
    discount_amount: payload.items.reduce((sum, item) => sum + item.discount, 0),
    tax_amount: 0,
    total_amount: subtotal,
    amount_tendered: payload.payment_method === 'cash' ? payload.amount_tendered : subtotal,
    change_amount: payload.payment_method === 'cash' ? Math.max(payload.amount_tendered - subtotal, 0) : 0,
    notes: payload.notes ?? null,
    voided_by: null,
    voided_at: null,
    void_reason: null,
    created_at: now,
  }

  let nextProducts = state.products
  const items: SalesTransactionItem[] = []
  const movements: StockMovement[] = []

  for (const item of payload.items) {
    const product = nextProducts.find((entry) => entry.id === item.product_id)
    if (!product) continue
    const quantityBefore = product.quantity_on_hand
    const quantityAfter = Math.max(quantityBefore - item.quantity, 0)
    nextProducts = nextProducts.map((entry) => (entry.id === product.id ? { ...entry, quantity_on_hand: quantityAfter, updated_at: now } : entry))

    items.push({
      id: id(),
      transaction_id: txId,
      product_id: product.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_cost: item.unit_cost,
      discount: item.discount,
      subtotal: item.quantity * item.unit_price - item.discount,
      created_at: now,
    })

    movements.push({
      id: id(),
      tenant_id: state.tenant.id,
      product_id: product.id,
      movement_type: 'outbound',
      quantity: item.quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reference_id: txId,
      reference_type: 'sale',
      location_id: payload.location_id,
      performed_by: state.currentUserId,
      notes: 'Sale processed',
      created_at: now,
    })
  }

  const nextState = {
    ...state,
    products: nextProducts,
    salesTransactions: [...state.salesTransactions, transaction],
    salesTransactionItems: [...state.salesTransactionItems, ...items],
    stockMovements: [...state.stockMovements, ...movements],
  }

  return {
    state: {
      ...nextState,
      alerts: syncAlerts(nextState),
    },
    receiptNumber,
  }
}

export function acknowledgeAlert(state: DemoSystemState, alertId: string): DemoSystemState {
  return {
    ...state,
    alerts: state.alerts.map((alert) =>
      alert.id === alertId
        ? { ...alert, status: 'acknowledged', acknowledged_by: state.currentUserId, acknowledged_at: nowIso() }
        : alert
    ),
  }
}

export function resolveAlert(state: DemoSystemState, alertId: string): DemoSystemState {
  return {
    ...state,
    alerts: state.alerts.map((alert) =>
      alert.id === alertId ? { ...alert, status: 'resolved', resolved_at: nowIso() } : alert
    ),
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount)
}
