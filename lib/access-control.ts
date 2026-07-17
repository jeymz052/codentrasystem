import type { PaymentMethod, UserRole } from '@/types/database'

export type DashboardPath =
  | '/dashboard'
  | '/dashboard/inventory'
  | '/dashboard/pos'
  | '/dashboard/production'
  | '/dashboard/movements'
  | '/dashboard/orders'
  | '/dashboard/suppliers'
  | '/dashboard/approvals'
  | '/dashboard/reports'
  | '/dashboard/users'
  | '/dashboard/settings'

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

const DELETION_ACTIONS: MutationAction[] = [
  'removeProduct',
  'removeSupplier',
  'deleteRecipe',
  'deleteProductionTemplate',
  'deleteLocation',
  'deleteCategory',
  'deleteUnitOfMeasure',
]

const APPROVAL_ACTIONS: MutationAction[] = [
  'approveDeletion',
  'rejectDeletion',
]

const MANAGER_ACTIONS: MutationAction[] = [
  'saveProduct',
  'removeProduct',
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
  'setWasteTypes',
  'createRecipe',
  'updateRecipe',
  'deleteRecipe',
  'createProductionTemplate',
  'deleteProductionTemplate',
  'produceFinishedGood',
  'approveDeletion',
  'rejectDeletion',
  'requestDeletion',
]

const SUPER_ADMIN_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/pos',
  '/dashboard/production',
  '/dashboard/movements',
  '/dashboard/orders',
  '/dashboard/suppliers',
  '/dashboard/approvals',
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
  '/dashboard/approvals',
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
  '/dashboard/approvals',
  '/dashboard/reports',
])

const SUPERVISOR_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/pos',
  '/dashboard/production',
  '/dashboard/movements',
  '/dashboard/orders',
  '/dashboard/suppliers',
  '/dashboard/approvals',
  '/dashboard/reports',
])

const INVENTORY_STAFF_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/movements',
])

const SALES_STAFF_PATHS = new Set<DashboardPath>([
  '/dashboard/pos',
])

const PRODUCTION_STAFF_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/production',
  '/dashboard/movements',
])

const PURCHASING_STAFF_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/orders',
  '/dashboard/suppliers',
])

export function defaultPathForRole(role: UserRole | undefined): DashboardPath {
  if (role === 'sales_staff') return '/dashboard/pos'
  return '/dashboard'
}

export function canAccessDashboardPath(role: UserRole, pathname: string) {
  if (role === 'super_admin') return SUPER_ADMIN_PATHS.has(pathname as DashboardPath)
  if (role === 'admin') return ADMIN_PATHS.has(pathname as DashboardPath)
  if (role === 'manager') return MANAGER_PATHS.has(pathname as DashboardPath)
  if (role === 'supervisor') return SUPERVISOR_PATHS.has(pathname as DashboardPath)
  if (role === 'inventory_staff') return INVENTORY_STAFF_PATHS.has(pathname as DashboardPath)
  if (role === 'sales_staff') return SALES_STAFF_PATHS.has(pathname as DashboardPath)
  if (role === 'production_staff') return PRODUCTION_STAFF_PATHS.has(pathname as DashboardPath)
  if (role === 'purchasing_staff') return PURCHASING_STAFF_PATHS.has(pathname as DashboardPath)
  return false
}

export function canAccessPath(role: UserRole | undefined, pathname: string) {
  if (!role) return false
  return canAccessDashboardPath(role, pathname)
}

export function canPerformMutation(role: UserRole, action: MutationAction) {
  if (role === 'super_admin' || role === 'admin') return true

  if (role === 'manager') {
    return MANAGER_ACTIONS.includes(action)
  }

  if (role === 'supervisor') {
    return MANAGER_ACTIONS.includes(action) && !DELETION_ACTIONS.includes(action)
  }

  if (role === 'inventory_staff') {
    return [
      'saveProduct',
      'removeProduct',
      'importProductRows',
      'addCategory',
      'editCategory',
      'deleteCategory',
      'addUnitOfMeasure',
      'editUnitOfMeasure',
      'deleteUnitOfMeasure',
      'addLocation',
      'updateLocation',
      'deleteLocation',
      'acknowledge',
      'resolve',
      'reorderAlert',
      'reorderAllAlerts',
      'transferStock',
      'recordWaste',
      'setWasteTypes',
      'requestDeletion',
    ].includes(action)
  }

  if (role === 'sales_staff') {
    return [
      'completeSale',
      'openShift',
      'closeShift',
      'recordCashMovement',
      'voidSale',
      'refundSale',
      'requestDeletion',
    ].includes(action)
  }

  if (role === 'production_staff') {
    return [
      'createRecipe',
      'updateRecipe',
      'deleteRecipe',
      'createProductionTemplate',
      'deleteProductionTemplate',
      'produceFinishedGood',
      'saveProduct',
      'acknowledge',
      'resolve',
      'transferStock',
      'requestDeletion',
    ].includes(action)
  }

  if (role === 'purchasing_staff') {
    return [
      'createPO',
      'receivePO',
      'updatePurchaseOrder',
      'cancelPurchaseOrder',
      'addSupplier',
      'editSupplier',
      'removeSupplier',
      'requestDeletion',
    ].includes(action)
  }

  return false
}

export function canUsePaymentMethod(role: UserRole, paymentMethod: PaymentMethod) {
  if (role === 'super_admin' || role === 'admin' || role === 'manager' || role === 'supervisor') return true
  if (role === 'sales_staff') return paymentMethod === 'cash' || paymentMethod === 'qr_ph'
  return false
}

export function formatRoleLabel(role: UserRole) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin'
    case 'admin':
      return 'Tenant Admin'
    case 'manager':
      return 'Manager'
    case 'supervisor':
      return 'Supervisor'
    case 'inventory_staff':
      return 'Inventory Staff'
    case 'sales_staff':
      return 'Sales Staff'
    case 'production_staff':
      return 'Production Staff'
    case 'purchasing_staff':
      return 'Purchasing Staff'
    default:
      return role
  }
}

// Determines whether the given role can act (approve/reject) on a specific
// approval request. All superior roles (supervisor, manager, admin, super_admin)
// can approve void, refund, purchase-order and deletion requests. A supervisor,
// however, cannot approve their *own* deletion request — a supervisor's own
// deletion must be approved by a manager, tenant admin, or super admin.
export function canActOnApprovalRequest(
  role: UserRole | undefined,
  request: { action: string; requested_by?: string | null },
  currentUserId: string | undefined,
): boolean {
  const isSuperior = role === 'super_admin' || role === 'admin' || role === 'manager' || role === 'supervisor'
  if (!isSuperior) return false
  if (role === 'supervisor' && request.action !== 'voidSale' && request.action !== 'refundSale' && request.action !== 'approvePurchaseOrder') {
    // Only deletion-type requests are restricted for supervisors; they cannot
    // approve their own deletion (it requires a higher role).
    if (request.requested_by && request.requested_by === currentUserId) return false
  }
  return true
}

export function getRolePermissions(role: UserRole) {
  const isPlatform = role === 'super_admin' || role === 'admin'
  const isManagerial = isPlatform || role === 'manager' || role === 'supervisor'
  const canPOS = isManagerial || role === 'sales_staff'

  return {
    canAccessPOS: canPOS,
    canAccessInventory: isManagerial || role === 'inventory_staff' || role === 'production_staff' || role === 'purchasing_staff',
    canAccessDashboard: isManagerial || role === 'inventory_staff' || role === 'production_staff' || role === 'purchasing_staff',
    canAccessProduction: isManagerial || role === 'production_staff',
    canAccessMovements: isManagerial || role === 'inventory_staff' || role === 'production_staff',
    canAccessOrders: isManagerial || role === 'purchasing_staff',
    canAccessSuppliers: isManagerial || role === 'purchasing_staff',
    canAccessReports: isManagerial,
    canAccessUsers: isPlatform,
    canAccessSettings: isPlatform,
    canManageProducts: isManagerial || role === 'inventory_staff' || role === 'production_staff',
    canManageSuppliers: isManagerial || role === 'purchasing_staff',
    canManageOrders: isManagerial || role === 'purchasing_staff',
    canVoidSales: canPOS,
    canRefundSales: canPOS,
    canOpenCloseShift: canPOS,
    canAdjustCash: canPOS,
    canApproveRequests: role === 'super_admin' || role === 'admin' || role === 'manager' || role === 'supervisor',
    canUseAllPaymentMethods: isManagerial,
    canChangePrices: isManagerial,
    canDeleteRecords: isManagerial && role !== 'supervisor',
  }
}
