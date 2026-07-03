import { redirect } from 'next/navigation'
import { DemoSystemProvider } from '@/components/demo-system-provider'
import { DashboardAccessGate } from '@/components/layout/DashboardAccessGate'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { loadAccessibleTenants } from '@/lib/tenant-access'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/dashboard')
  }

  const { tenants, activeTenantId } = await loadAccessibleTenants(user.id)
  if (!tenants.length) {
    redirect('/onboarding')
  }

  return (
    <DemoSystemProvider initialTenantId={activeTenantId ?? tenants[0]?.id ?? ''}>
      <DashboardAccessGate>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#FFFFFF' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TopBar />
            <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
              {children}
            </main>
          </div>
        </div>
      </DashboardAccessGate>
    </DemoSystemProvider>
  )
}
