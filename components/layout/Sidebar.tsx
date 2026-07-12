'use client'
// components/layout/Sidebar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingCart, Truck,
  BarChart3, Settings, ArrowLeftRight,
  CreditCard, Users, Building2, LogOut, Factory,
} from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { canAccessDashboardPath, formatRoleLabel } from '@/lib/access-control'

const NAV = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard',        roles: ['admin','manager','cashier'] },
  { href: '/dashboard/inventory',  icon: Package,          label: 'Inventory',        roles: ['admin','manager','cashier'] },
  { href: '/dashboard/pos',        icon: CreditCard,       label: 'Point of Sale',    roles: ['admin','manager','cashier'] },
  { href: '/dashboard/production', icon: Factory,           label: 'Production',       roles: ['admin','manager'] },
  { href: '/dashboard/movements',  icon: ArrowLeftRight,   label: 'Stock Movements',  roles: ['admin','manager'] },
  { href: '/dashboard/orders',     icon: ShoppingCart,     label: 'Purchase Orders',  roles: ['admin','manager'] },
  { href: '/dashboard/suppliers',  icon: Truck,            label: 'Suppliers',        roles: ['admin','manager'] },
  { href: '/dashboard/reports',    icon: BarChart3,        label: 'Reports',          roles: ['admin','manager'] },
  { href: '/dashboard/users',      icon: Users,            label: 'Users',            roles: ['admin'] },
  { href: '/dashboard/settings',   icon: Settings,         label: 'Settings',         roles: ['admin'] },
]

type SidebarProps = {
  mobileOpen?: boolean
  onNavigate?: () => void
}

export function Sidebar({ mobileOpen = false, onNavigate }: SidebarProps) {
  const path = usePathname()
  const { state, availableTenants, activeTenantId, authUserEmail, isSuperAdminIdentity, signOut } = useDemoSystem()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? 'cashier'
  const fallbackEmail = state.users.find((user) => user.id === state.currentUserId)?.email ?? state.users[0]?.email ?? null
  const displayEmail = authUserEmail ?? fallbackEmail
  const renewalLabel = state.tenant.subscription_ends_at
    ? `Renews ${new Date(state.tenant.subscription_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'No renewal date'

  return (
    <aside className={`dashboard-sidebar${mobileOpen ? ' dashboard-sidebar--open' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid #D8E4F2' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Image
            src="/images/codentralogo-removebg-preview.png"
            alt="Codentra"
            width={170}
            height={60}
            priority
            style={{ width: '170px', height: 'auto', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 10px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#94A3B8', padding: '4px 8px 8px', textTransform: 'uppercase' }}>
          Navigation
        </div>
        {NAV.filter(({ href }) => canAccessDashboardPath(role, href)).map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 10px', borderRadius: 8, marginBottom: 1,
              textDecoration: 'none',
              background: active ? '#DBEAFE' : 'transparent',
              color: active ? '#3B82F6' : '#475569',
              fontWeight: active ? 600 : 400, fontSize: 13,
              transition: 'all 0.15s', position: 'relative',
            }}
          >
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 18, background: '#3B82F6', borderRadius: '0 3px 3px 0',
                }} />
              )}
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              <span style={{ flex: 1 }}>{label}</span>
            </Link>
          )
        })}
        {isSuperAdminIdentity && (
          <Link
            href="/admin/tenants"
            onClick={onNavigate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '9px 10px',
              borderRadius: 8,
              marginBottom: 1,
              textDecoration: 'none',
              background: path.startsWith('/admin') ? '#DBEAFE' : 'transparent',
              color: path.startsWith('/admin') ? '#3B82F6' : '#475569',
              fontWeight: path.startsWith('/admin') ? 600 : 400,
              fontSize: 13,
              transition: 'all 0.15s',
              position: 'relative',
            }}
          >
            {path.startsWith('/admin') && (
              <span style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: 18,
                background: '#3B82F6',
                borderRadius: '0 3px 3px 0',
              }} />
            )}
            <Building2 size={16} strokeWidth={path.startsWith('/admin') ? 2.5 : 2} />
            <span style={{ flex: 1 }}>Tenant Monitor</span>
          </Link>
        )}
      </nav>

      {/* Subscription badge */}
      <div style={{ padding: '10px', borderTop: '1px solid #D8E4F2' }}>
        <div style={{
          background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
          border: '1px solid #BFDBFE',
          borderRadius: 10, padding: '10px 12px', marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700, letterSpacing: '0.05em' }}>
            {state.tenant.plan.toUpperCase()} PLAN
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
            {state.tenant.subscription_status === 'trial' ? 'Trial account' : renewalLabel}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #D8E4F2',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            A
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {state.tenant.name}
            </div>
            <div style={{ fontSize: 10, color: '#64748B' }}>{formatRoleLabel(role)}</div>
            {displayEmail ? (
              <div style={{ fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayEmail}
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          style={{
            width: '100%',
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '9px 10px',
            borderRadius: 8,
            background: '#FFFFFF',
            border: '1px solid #D8E4F2',
            color: '#475569',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
