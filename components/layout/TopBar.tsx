'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Building2, ChevronDown, CheckCircle2, LogOut, AlertTriangle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useDemoSystem } from '@/components/demo-system-provider'

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
}

export function TopBar() {
  const path = usePathname()
  const { state, stats, availableTenants, activeTenantId, switchTenant, signOut, acknowledge, resolve } = useDemoSystem()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
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
      padding: '0 32px', background: '#FFFFFF', flexShrink: 0,
    }}>
      <div>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F8FBFF', border: '1px solid #D8E4F2',
          borderRadius: 8, padding: '5px 12px',
        }}>
          <Building2 size={13} color="#3B82F6" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{state.tenant.name}</span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{state.tenant.business_type.replaceAll('_', ' ')}</span>
          </div>
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid #D8E4F2', borderRadius: 8,
          background: '#fff', padding: '6px 10px',
        }}>
          <span style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>Tenant</span>
          <select
            value={activeTenantId || state.tenant.id}
            onChange={(event) => void switchTenant(event.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: '#0F172A' }}
          >
            {availableTenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} color="#94A3B8" />
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
                <div style={{ fontSize: 11, color: '#64748B' }}>Bell only</div>
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px 16px', color: '#64748B', fontSize: 12 }}>
                    No notifications right now.
                  </div>
                ) : notifications.map((alert) => {
                  const color = alert.alert_type === 'out_of_stock' ? '#EF4444' : '#F59E0B'
                  const isResolved = alert.status === 'resolved'
                  return (
                    <div key={alert.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <AlertTriangle size={13} color={color} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                              {state.products.find((product) => product.id === alert.product_id)?.name ?? 'Unknown item'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.45 }}>{alert.message}</div>
                          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span className="badge" style={{ background: `${color}14`, color, fontSize: 10 }}>{alert.alert_type}</span>
                            <span className="badge badge-blue" style={{ fontSize: 10 }}>{alert.status}</span>
                          </div>
                        </div>
                      </div>

                      {!isResolved && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          {alert.status !== 'acknowledged' && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                acknowledge(alert.id)
                                setNotificationsOpen(false)
                              }}
                              style={{ fontSize: 11, padding: '5px 8px' }}
                            >
                              Acknowledge
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              resolve(alert.id)
                              setNotificationsOpen(false)
                            }}
                            style={{ fontSize: 11, padding: '5px 8px' }}
                          >
                            <CheckCircle2 size={13} /> Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#64748B' }}>
          {stats.open_alerts} open alerts
        </div>
        <button
          onClick={() => void signOut()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid #D8E4F2', borderRadius: 8,
            background: '#fff', padding: '8px 10px', cursor: 'pointer',
            color: '#475569',
          }}
        >
          <LogOut size={14} />
          <span style={{ fontSize: 12 }}>Sign out</span>
        </button>
      </div>
    </header>
  )
}
