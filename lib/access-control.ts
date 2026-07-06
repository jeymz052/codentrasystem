import type { PaymentMethod, UserRole } from '@/types/database'

export type DashboardPath =
  | '/dashboard'
  | '/dashboard/inventory'
  | '/dashboard/pos'
  | '/dashboard/movements'
  | '/dashboard/orders'
  | '/dashboard/suppliers'
  | '/dashboard/reports'
  | '/dashboard/users'
  | '/dashboard/settings'

export type MutationAction =
  | 'resetDemo'
  | 'updateTenant'
  | 'saveProduct'
  | 'removeProduct'
  | 'importProductRows'
  | 'addSupplier'
  | 'editSupplier'
  | 'removeSupplier'
  | 'addUser'
  | 'toggleUser'
  | 'createPO'
  | 'receivePO'
  | 'completeSale'
  | 'acknowledge'
  | 'resolve'

const MANAGER_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/pos',
  '/dashboard/movements',
  '/dashboard/orders',
  '/dashboard/suppliers',
  '/dashboard/reports',
])

const CASHIER_PATHS = new Set<DashboardPath>([
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/pos',
])

export function canAccessDashboardPath(role: UserRole, pathname: string) {
  if (role === 'super_admin' || role === 'admin') return true
  if (role === 'manager') return MANAGER_PATHS.has(pathname as DashboardPath)
  if (role === 'cashier') return CASHIER_PATHS.has(pathname as DashboardPath)
  return false
}

export function canPerformMutation(role: UserRole, action: MutationAction) {
  if (role === 'super_admin' || role === 'admin') return true

  if (role === 'manager') {
    return [
      'saveProduct',
      'removeProduct',
      'importProductRows',
      'addSupplier',
      'editSupplier',
      'removeSupplier',
      'createPO',
      'receivePO',
      'completeSale',
      'acknowledge',
      'resolve',
    ].includes(action)
  }

  if (role === 'cashier') {
    return ['completeSale'].includes(action)
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
