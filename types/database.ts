// types/database.ts

export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'active' | 'inactive' | 'suspended' | 'trial'
export type BusinessType = 'coffee_shop' | 'manufacturing' | 'convenience_store' | 'restaurant' | 'retail' | 'pharmacy' | 'general'
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'cashier'
export type OrderStatus = 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled'
export type MovementType = 'inbound' | 'outbound' | 'adjustment' | 'return' | 'production'
export type AlertType = 'low_stock' | 'out_of_stock' | 'overstock' | 'expiry_warning'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'
export type PaymentMethod = 'cash' | 'qr_ph' | 'gcash' | 'card' | 'bank_transfer' | 'other'
export type TransactionStatus = 'completed' | 'voided' | 'refunded'

export interface Tenant {
  id: string
  name: string
  business_type: BusinessType
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
  currency: string
  timezone: string
  plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  subscription_ends_at: string | null
  max_users: number
  max_products: number
  max_locations: number
  is_active: boolean
  created_at: string
  updated_at: string
  billing_email?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_price_id?: string | null
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
}

export interface Category {
  id: string
  tenant_id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
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
  created_at: string
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
  expiry_date: string | null
  created_at: string
  updated_at: string
  // joined
  category?: Category
  supplier?: Supplier
  location?: Location
  uom?: UnitOfMeasure
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
  location_id: string | null
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
  created_at: string
  cashier?: User
  items?: SalesTransactionItem[]
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

// POS Cart
export interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}
