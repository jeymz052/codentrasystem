// types/database.ts

export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'active' | 'inactive' | 'suspended' | 'trial'
export type BusinessType = 'coffee_shop' | 'manufacturing' | 'convenience_store' | 'restaurant' | 'retail' | 'pharmacy' | 'general'
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'supervisor' | 'inventory_staff' | 'sales_staff' | 'production_staff' | 'purchasing_staff'
export type MutationAction =
  | 'resetDemo'
  | 'updateTenant'
  | 'addCategory'
  | 'editCategory'
  | 'deleteCategory'
  | 'addUnitOfMeasure'
  | 'editUnitOfMeasure'
  | 'deleteUnitOfMeasure'
  | 'addLocation'
  | 'updateLocation'
  | 'deleteLocation'
  | 'saveProduct'
  | 'removeProduct'
  | 'importProductRows'
  | 'addSupplier'
  | 'editSupplier'
  | 'removeSupplier'
  | 'addUser'
  | 'editUser'
  | 'toggleUser'
  | 'resendInvite'
  | 'createRecipe'
  | 'updateRecipe'
  | 'deleteRecipe'
  | 'createProductionTemplate'
  | 'deleteProductionTemplate'
  | 'produceFinishedGood'
  | 'createPO'
  | 'approvePurchaseOrder'
  | 'receivePO'
  | 'updatePurchaseOrder'
  | 'cancelPurchaseOrder'
  | 'completeSale'
  | 'voidSale'
  | 'refundSale'
  | 'adjustPrice'
  | 'openShift'
  | 'closeShift'
  | 'recordCashMovement'
  | 'acknowledge'
  | 'resolve'
  | 'reorderAlert'
  | 'reorderAllAlerts'
  | 'recordWaste'
  | 'setWasteTypes'
  | 'transferStock'
  | 'requestDeletion'
  | 'approveDeletion'
  | 'rejectDeletion'
export type OrderStatus = 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled'
export type MovementType = 'inbound' | 'outbound' | 'adjustment' | 'return' | 'production' | 'waste' | 'defect' | 'reject'
export type CashMovementKind = 'cash_in' | 'cash_out' | 'cash_sale' | 'refund_payout' | 'denomination_adjustment'
export type AlertType = 'low_stock' | 'out_of_stock' | 'overstock' | 'expiry_warning'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'
export type ShiftStatus = 'open' | 'closed' | 'voided'
export type PaymentMethod = 'cash' | 'qr_ph' | 'gcash' | 'maya' | 'bdo' | 'maribank' | 'card' | 'bank_transfer' | 'other'
export type TransactionStatus = 'completed' | 'voided' | 'refunded'

export type PaymentAccountKind = 'ewallet' | 'bank'

export interface PaymentAccount {
  id: string
  label: string
  kind: PaymentAccountKind
  account: string
  qr_url: string | null
}

export interface Tenant {
  id: string
  name: string
  business_type: BusinessType
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
  billing_email: string | null
  currency: string
  timezone: string
  plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  subscription_ends_at: string | null
  max_users: number
  max_products: number
  max_locations: number
  enable_production: boolean
  is_active: boolean
  gcash_account: string | null
  gcash_qr_url: string | null
  maya_account: string | null
  maya_qr_url: string | null
  bdo_account: string | null
  bdo_qr_url: string | null
  maribank_account: string | null
  maribank_qr_url: string | null
  payment_accounts: PaymentAccount[]
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  pos_location_id: string | null
  pos_store_locations: string[]
  pos_stations: string[]
  created_at: string
  updated_at: string
}

export interface TenantMembership {
  id: string
  tenant_id: string
  auth_user_id: string
  role: UserRole
  is_default: boolean
  created_at: string
}

export interface AccessibleTenant {
  id: string
  name: string
  business_type: BusinessType
  plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  role: UserRole
  is_default: boolean
}

export interface User {
  id: string
  tenant_id: string
  role: UserRole
  full_name: string
  email: string
  avatar_url: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
  tenant?: Tenant
}

export interface UnitOfMeasure {
  id: string
  tenant_id: string
  name: string
  abbreviation: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Category {
  id: string
  tenant_id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Supplier {
  id: string
  tenant_id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  lead_days: number
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  tenant_id: string
  code: string
  name: string
  zone: string | null
  is_active: boolean
  is_waste_location: boolean
  created_at: string
  updated_at?: string
}

export interface Product {
  id: string
  tenant_id: string
  item_code: string
  name: string
  description: string | null
  category_id: string | null
  supplier_id: string | null
  location_id: string | null
  uom_id: string | null
  quantity_on_hand: number
  quantity_reserved: number
  reorder_point: number
  reorder_quantity: number
  max_stock: number | null
  unit_cost: number | null
  selling_price: number | null
  barcode: string | null
  image_url: string | null
  is_active: boolean
  is_finished_good: boolean
  expiry_date: string | null
  created_at: string
  updated_at: string
  // joined
  category?: Category
  supplier?: Supplier
  location?: Location
  uom?: UnitOfMeasure
  // FIFO lots
  lots?: InventoryLot[]
}

export interface InventoryLot {
  id: string
  tenant_id: string
  product_id: string
  quantity: number
  unit_cost: number
  received_at: string
  source: 'seed' | 'purchase_order' | 'production' | 'adjustment' | 'import' | 'transfer'
  reference_id: string | null
  location_id: string | null
  created_at: string
}

export interface ProductRecipe {
  id: string
  tenant_id: string
  finished_good_id: string
  ingredient_id: string
  quantity_per_unit: number
  uom_id: string | null
  created_at: string
}

export interface ProductionTemplate {
  id: string
  tenant_id: string
  name: string
  finished_good_id: string
  quantity: number
  location_id: string | null
  notes: string | null
  created_at: string
}

export interface StockMovement {
  id: string
  tenant_id: string
  product_id: string
  movement_type: MovementType
  quantity: number
  quantity_before: number
  quantity_after: number
  reference_id: string | null
  reference_type: string | null
  location_id: string | null
  pos_store_location?: string | null
  performed_by: string | null
  notes: string | null
  created_at: string
  product?: Product
}

export interface PurchaseOrder {
  id: string
  tenant_id: string
  po_number: string
  supplier_id: string
  status: OrderStatus
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  expected_date: string | null
  delivery_date: string | null
  received_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  supplier?: Supplier
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  po_id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number | null
  notes: string | null
  created_at: string
  product?: Product
}

export interface SalesTransaction {
  id: string
  tenant_id: string
  receipt_number: string
  cashier_id: string | null
  shift_id: string | null
  location_id: string | null
  pos_store_location?: string | null
  status: TransactionStatus
  payment_method: PaymentMethod
  payment_provider?: string | null
  payment_reference?: string | null
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  amount_tendered: number | null
  change_amount: number | null
  notes: string | null
  voided_by: string | null
  voided_at: string | null
  void_reason: string | null
  refunded_by: string | null
  refunded_at: string | null
  refund_reason: string | null
  parent_transaction_id: string | null
  split_payments?: Array<{ payment_method: PaymentMethod; amount: number; reference?: string | null }>
  cash_sales_total: number
  qr_sales_total: number
  created_at: string
  cashier?: User
  items?: SalesTransactionItem[]
}

export interface CashShift {
  id: string
  tenant_id: string
  shift_code: string
  opened_by: string
  closed_by: string | null
  location_id: string | null
  pos_store_location?: string | null
  status: ShiftStatus
  opening_float: number
  closing_float: number | null
  expected_cash: number | null
  counted_cash: number | null
  cash_sales_total: number
  qr_sales_total: number
  total_sales: number
  variance_amount: number | null
  notes: string | null
  close_notes: string | null
  station: string | null
  opened_at: string
  closed_at: string | null
  created_at: string
  updated_at: string
  opened_by_user?: User
  closed_by_user?: User | null
  location?: Location | null
}

export interface CashMovement {
  id: string
  tenant_id: string
  shift_id: string
  kind: CashMovementKind
  amount: number
  note: string | null
  denominations: Record<string, number> | null
  performed_by: string | null
  created_at: string
}

export interface SalesTransactionItem {
  id: string
  transaction_id: string
  product_id: string
  quantity: number
  unit_price: number
  unit_cost: number | null
  discount: number
  subtotal: number
  created_at: string
  product?: Product
}

export interface Alert {
  id: string
  tenant_id: string
  product_id: string
  alert_type: AlertType
  status: AlertStatus
  message: string
  threshold: number | null
  current_qty: number | null
  purchase_order_id: string | null
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
  product?: Product
}

export interface DashboardStats {
  total_products: number
  total_value: number
  low_stock_count: number
  out_of_stock_count: number
  open_alerts: number
  pending_orders: number
  sales_today: number
  transactions_today: number
}

export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected'

export interface DeletionRequest {
  id: string
  tenant_id: string
  requested_by: string
  action: MutationAction
  target_type: 'product' | 'supplier' | 'recipe' | 'production_template' | 'location' | 'sale' | 'purchase_order'
  target_id: string
  details: Record<string, unknown>
  status: DeletionRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  requested_by_user?: User
  reviewed_by_user?: User | null
}

export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string | null
  action: string
  target_type: 'user' | 'product' | 'supplier' | 'order' | 'sale' | 'shift' | 'system' | 'recipe' | 'production_template' | 'location'
  target_id: string | null
  details: Record<string, unknown>
  performed_by: string | null
  performed_at: string
}

// POS Cart
export interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}
