import type { PaymentMethod, UserRole } from '@/types/database'

export type DashboardPath =
  | '/dashboard'
  | '/dashboard/inventory'
  | '/dashboard/pos'
  | '/dashboard/production'
  | '/dashboard/movements'
  | '/dashboard/orders'
  | '/dashboard/suppliers'
  | '/dashboard/reports'
  | '/dashboard/users'
  | '/dashboard/settings'

export type MutationAction =
  | 'resetDemo'
  | 'updateTenant'
  | 'addCategory'
  | 'addUnitOfMeasure'
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
  | 'recordWaste'
  | 'transferStock'

const SUPER_ADMIN_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/pos',
  '/dashboard/production',
  '/dashboard/movements',
  '/dashboard/orders',
  '/dashboard/suppliers',
  '/dashboard/reports',
  '/dashboard/users',
  '/dashboard/settings',
])

const ADMIN_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/pos',
  '/dashboard/production',
  '/dashboard/movements',
  '/dashboard/orders',
  '/dashboard/suppliers',
  '/dashboard/reports',
  '/dashboard/users',
  '/dashboard/settings',
])

const MANAGER_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/pos',
  '/dashboard/production',
  '/dashboard/movements',
  '/dashboard/orders',
  '/dashboard/suppliers',
  '/dashboard/reports',
])

// A cashier is a front-of-house till operator: their entire workspace is the
// Point of Sale. They cannot reach the dashboard, inventory, reports, etc.
const CASHIER_PATHS = new Set<DashboardPath>([
  '/dashboard/pos',
])

// Where each role should land after sign-in / when redirected away from a page
// they may not access. Cashiers go straight to the till.
export function defaultPathForRole(role: UserRole | undefined): DashboardPath {
  if (role === 'cashier') return '/dashboard/pos'
  return '/dashboard'
}

export function canAccessDashboardPath(role: UserRole, pathname: string) {
  if (role === 'super_admin') return SUPER_ADMIN_PATHS.has(pathname as DashboardPath)
  if (role === 'admin') return ADMIN_PATHS.has(pathname as DashboardPath)
  if (role === 'manager') return MANAGER_PATHS.has(pathname as DashboardPath)
  if (role === 'cashier') return CASHIER_PATHS.has(pathname as DashboardPath)
  return false
}

export function canAccessPath(role: UserRole | undefined, pathname: string) {
  if (!role) return false
  return canAccessDashboardPath(role, pathname)
}

export function canPerformMutation(role: UserRole, action: MutationAction) {
  if (role === 'super_admin' || role === 'admin') return true

  if (role === 'manager') {
    return [
      'saveProduct',
      'removeProduct',
      'removeProducts',
      'importProductRows',
      'addSupplier',
      'editSupplier',
      'removeSupplier',
      'createPO',
      'receivePO',
      'updatePurchaseOrder',
      'cancelPurchaseOrder',
      'completeSale',
      'voidSale',
      'refundSale',
      'adjustPrice',
      'openShift',
      'closeShift',
      'recordCashMovement',
      'acknowledge',
      'resolve',
      'recordWaste',
      'createRecipe',
      'updateRecipe',
      'deleteRecipe',
      'createProductionTemplate',
      'deleteProductionTemplate',
      'produceFinishedGood',
    ].includes(action)
  }

  if (role === 'cashier') {
    // A cashier can ring up sales and run the cash drawer, but cannot refund,
    // override prices, or apply arbitrary discounts. Those need a manager.
    return [
      'completeSale',
      'openShift',
      'closeShift',
      'recordCashMovement',
      'voidSale',
    ].includes(action)
  }

  return false
}

export function canUsePaymentMethod(role: UserRole, paymentMethod: PaymentMethod) {
  if (role === 'super_admin' || role === 'admin' || role === 'manager') return true
  return paymentMethod === 'cash' || paymentMethod === 'qr_ph'
}

export function formatRoleLabel(role: UserRole) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin'
    case 'admin':
      return 'Tenant Admin'
    case 'manager':
      return 'Manager'
    case 'cashier':
      return 'Cashier'
    default:
      return role
  }
}

export function getRolePermissions(role: UserRole) {
  return {
    canAccessPOS: true,
    canAccessInventory: role === 'super_admin' || role === 'admin' || role === 'manager',
    canAccessDashboard: role === 'super_admin' || role === 'admin' || role === 'manager',
    canAccessProduction: role === 'super_admin' || role === 'admin' || role === 'manager',
    canAccessMovements: role === 'super_admin' || role === 'admin' || role === 'manager',
    canAccessOrders: role === 'super_admin' || role === 'admin' || role === 'manager',
    canAccessSuppliers: role === 'super_admin' || role === 'admin' || role === 'manager',
    canAccessReports: role === 'super_admin' || role === 'admin' || role === 'manager',
    canAccessUsers: role === 'super_admin' || role === 'admin',
    canAccessSettings: role === 'super_admin' || role === 'admin',
    canManageProducts: role === 'super_admin' || role === 'admin' || role === 'manager',
    canManageSuppliers: role === 'super_admin' || role === 'admin' || role === 'manager',
    canManageOrders: role === 'super_admin' || role === 'admin' || role === 'manager',
    // A cashier can void their own current-shift sale (immediate correction),
    // but a refund (money back after the fact) requires a manager.
    canVoidSales: role === 'super_admin' || role === 'admin' || role === 'manager' || role === 'cashier',
    canRefundSales: role === 'super_admin' || role === 'admin' || role === 'manager',
    canOpenCloseShift: role === 'super_admin' || role === 'admin' || role === 'manager' || role === 'cashier',
    canAdjustCash: role === 'super_admin' || role === 'admin' || role === 'manager' || role === 'cashier',
    canUseAllPaymentMethods: role === 'super_admin' || role === 'admin' || role === 'manager',
    // Price overrides and manual/arbitrary discounts are a manager-level action.
    canChangePrices: role === 'super_admin' || role === 'admin' || role === 'manager',
    canDeleteRecords: role === 'super_admin' || role === 'admin' || role === 'manager',
  }
}
