import { redirect } from 'next/navigation'
import { DemoSystemProvider } from '@/components/demo-system-provider'
import { DashboardAccessGate } from '@/components/layout/DashboardAccessGate'
import { DashboardShell } from '@/components/layout/DashboardShell'
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
        <DashboardShell>{children}</DashboardShell>
      </DashboardAccessGate>
    </DemoSystemProvider>
  )
}
