'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Building2, AlertTriangle, Menu, ShoppingCart } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useDemoSystem } from '@/components/demo-system-provider'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/inventory': 'Inventory',
  '/dashboard/pos': 'Point of Sale',
  '/dashboard/movements': 'Stock Movements',
  '/dashboard/orders': 'Purchase Orders',
  '/dashboard/suppliers': 'Suppliers',
  '/dashboard/reports': 'Reports',
  '/dashboard/users': 'User Management',
  '/dashboard/settings': 'Settings',
  '/admin/tenants': 'Tenant Monitoring',
}

type TopBarProps = {
  onToggleSidebar?: () => void
}

function formatNotificationDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const path = usePathname()
  const router = useRouter()
  const { state, stats, availableTenants, activeTenantId, isSuperAdminIdentity, switchTenant } = useDemoSystem()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const title = TITLES[path] ?? 'Codentra'
  const notifications = useMemo(
    () => [...state.alerts].sort((left, right) => right.created_at.localeCompare(left.created_at)).slice(0, 6),
    [state.alerts]
  )

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current) return
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <header style={{
      height: 60, borderBottom: '1px solid #D8E4F2',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px 0 14px', background: '#FFFFFF', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 auto' }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm topbar-menu-button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          style={{ flexShrink: 0 }}
        >
          <Menu size={16} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div className="topbar-tenant-card" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F8FBFF', border: '1px solid #D8E4F2',
          borderRadius: 8, padding: '5px 12px', maxWidth: 200,
        }}>
          <Building2 size={13} color="#3B82F6" style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.tenant.name}</span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{state.tenant.business_type === 'manufacturing' ? 'Production' : 'Buy & Sell'}</span>
          </div>
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid #D8E4F2', borderRadius: 8,
          background: '#fff', padding: '6px 10px',
        }}>
          <span style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>Tenant</span>
          <SearchableSelect
            className="topbar-tenant-select"
            placeholder="Select tenant"
            searchPlaceholder="Search tenants..."
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: '#0F172A' }}
            value={activeTenantId || state.tenant.id}
            onChange={(value) => void switchTenant(value)}
            options={availableTenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))}
          />
        </label>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            aria-expanded={notificationsOpen}
            aria-label={`Notifications, ${stats.open_alerts} open alerts`}
            style={{
              position: 'relative', background: '#FFFFFF',
              border: '1px solid #D8E4F2', borderRadius: 8,
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={15} color="#64748B" />
            {stats.open_alerts > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 18, height: 18, padding: '0 4px',
                background: '#EF4444', color: '#fff', borderRadius: 999,
                border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, fontWeight: 800,
              }}>
                {stats.open_alerts}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 10px)',
              width: 360,
              maxWidth: 'calc(100vw - 24px)',
              background: '#FFFFFF',
              border: '1px solid #D8E4F2',
              borderRadius: 14,
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.14)',
              overflow: 'hidden',
              zIndex: 30,
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Notifications</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{stats.open_alerts} open alerts</div>
                </div>
                {stats.open_alerts > 0 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedAlerts((current) => {
                        const openIds = notifications.filter((a) => a.status === 'open').map((a) => a.id)
                        const allSelected = openIds.every((id) => current.includes(id))
                        return allSelected ? [] : openIds
                      })}
                      style={{ fontSize: 11, padding: '5px 8px' }}
                    >
                      {notifications.filter((a) => a.status === 'open').every((a) => selectedAlerts.includes(a.id)) ? 'Clear' : 'Select'} all
                    </button>
                  </div>
                )}
              </div>

              {stats.open_alerts > 0 && selectedAlerts.length > 0 && (
                <div style={{ padding: '10px 16px', display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', background: '#F8FBFF' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const ids = selectedAlerts
                      setSelectedAlerts([])
                      router.push(`/dashboard/orders?restock=${ids.join(',')}`)
                    }}
                    style={{ fontSize: 11, padding: '5px 8px' }}
                  >
                    <ShoppingCart size={13} /> Restock raw → PO ({selectedAlerts.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const ids = selectedAlerts
                      setSelectedAlerts([])
                      router.push(`/dashboard/production?restock=${ids.join(',')}`)
                    }}
                    style={{ fontSize: 11, padding: '5px 8px' }}
                  >
                    <ShoppingCart size={13} /> Restock finished → Production ({selectedAlerts.length})
                  </button>
                </div>
              )}

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px 16px', color: '#64748B', fontSize: 12 }}>
                    No notifications right now.
                  </div>
                ) : notifications.map((alert) => {
                  const color = alert.alert_type === 'out_of_stock' ? '#EF4444' : '#F59E0B'
                  const isResolved = alert.status === 'resolved'
                  const product = state.products.find((entry) => entry.id === alert.product_id)
                  const isFinished = product?.is_finished_good
                  const checked = selectedAlerts.includes(alert.id)
                  return (
                    <div key={alert.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {alert.status === 'open' && (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => setSelectedAlerts((current) => event.target.checked ? [...new Set([...current, alert.id])] : current.filter((id) => id !== alert.id))}
                          style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
                          aria-label={`Select ${product?.name ?? 'alert'}`}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <AlertTriangle size={13} color={color} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                            {product?.name ?? 'Unknown item'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.45 }}>{alert.message}</div>
                        <div style={{ marginTop: 5, fontSize: 10, color: '#94A3B8' }}>
                          {formatNotificationDateTime(alert.created_at)}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="badge" style={{ background: `${color}14`, color, fontSize: 10 }}>{alert.alert_type}</span>
                          <span className="badge badge-blue" style={{ fontSize: 10 }}>{alert.status}</span>
                          {isFinished && <span className="badge" style={{ background: '#8B5CF614', color: '#8B5CF6', fontSize: 10 }}>finished good</span>}
                        </div>
                      </div>

                      {!isResolved && alert.status === 'open' && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (isFinished) router.push('/dashboard/production')
                            else router.push(`/dashboard/orders?restock=${alert.product_id}`)
                          }}
                          style={{ fontSize: 11, padding: '5px 8px', flexShrink: 0 }}
                          title={isFinished ? 'Restock via production' : 'Restock via purchase order'}
                        >
                          Restock
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="topbar-open-alerts" style={{ fontSize: 12, color: '#64748B' }}>
          {stats.open_alerts} open alerts
        </div>
      </div>
    </header>
  )
}
