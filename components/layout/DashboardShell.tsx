'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { useDemoSystem } from '@/components/demo-system-provider'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { stats } = useDemoSystem()
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  const bannerKey = useMemo(() => String(stats.open_alerts), [stats.open_alerts])
  const shouldShowBanner = stats.open_alerts > 0 && dismissedKey !== bannerKey

  useEffect(() => {
    const stored = window.sessionStorage.getItem('codentra.dashboard-stock-banner')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (typeof parsed?.key === 'string' && typeof parsed?.ts === 'number') {
        if (Date.now() - parsed.ts < 60 * 60 * 1000) {
          setDismissedKey(parsed.key)
        } else {
          window.sessionStorage.removeItem('codentra.dashboard-stock-banner')
        }
      }
    } catch {
      window.sessionStorage.removeItem('codentra.dashboard-stock-banner')
    }
  }, [])

  useEffect(() => {
    if (!dismissedKey) return
    const stored = window.sessionStorage.getItem('codentra.dashboard-stock-banner')
    if (!stored) {
      setDismissedKey(null)
      return
    }
    try {
      const parsed = JSON.parse(stored)
      if (typeof parsed?.ts === 'number') {
        const elapsed = Date.now() - parsed.ts
        const remaining = Math.max(0, 60 * 60 * 1000 - elapsed)
        const timer = setTimeout(() => {
          setDismissedKey(null)
          window.sessionStorage.removeItem('codentra.dashboard-stock-banner')
        }, remaining)
        return () => clearTimeout(timer)
      }
    } catch {
      // ignore
    }
    setDismissedKey(null)
  }, [dismissedKey])

  function dismissBanner() {
    window.sessionStorage.setItem('codentra.dashboard-stock-banner', JSON.stringify({ key: bannerKey, ts: Date.now() }))
    setDismissedKey(bannerKey)
  }

  return (
    <div className="dashboard-shell">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onNavigate={() => setMobileSidebarOpen(false)}
      />
      <div className="dashboard-content">
        <TopBar onToggleSidebar={() => setMobileSidebarOpen((current) => !current)} />
        {shouldShowBanner && (
          <div
            style={{
              position: 'fixed',
              right: 20,
              bottom: 20,
              zIndex: 1000,
              width: 'auto',
              maxWidth: 300,
            }}
          >
            <div
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #FECACA',
                background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)',
                boxShadow: '0 10px 24px rgba(239, 68, 68, 0.18)',
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#DC262614', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={13} color="#DC2626" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#B91C1C', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  Stock warning
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginTop: 2, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                  {stats.open_alerts} open alert{stats.open_alerts === 1 ? '' : 's'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 2 }}>
                <Link href="/dashboard/inventory?filter=low" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', padding: '5px 9px', fontSize: 11 }}>
                  Review
                </Link>
                <button
                  type="button"
                  onClick={dismissBanner}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '4px 7px', minWidth: 30 }}
                  aria-label="Dismiss stock attention banner"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
        <main className="dashboard-main">{children}</main>
      </div>
      {mobileSidebarOpen && <button className="dashboard-overlay" aria-label="Close sidebar" onClick={() => setMobileSidebarOpen(false)} />}
    </div>
  )
}
