'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="dashboard-shell">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onNavigate={() => setMobileSidebarOpen(false)}
      />
      <div className="dashboard-content">
        <TopBar onToggleSidebar={() => setMobileSidebarOpen((current) => !current)} />
        <main className="dashboard-main">{children}</main>
      </div>
      {mobileSidebarOpen && <button className="dashboard-overlay" aria-label="Close sidebar" onClick={() => setMobileSidebarOpen(false)} />}
    </div>
  )
}
