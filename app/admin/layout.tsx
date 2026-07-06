import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { DemoSystemProvider } from '@/components/demo-system-provider'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConfiguredSuperAdminEmail, loadAccessibleTenants } from '@/lib/tenant-access'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/admin/tenants')
  }

  const isSuperAdminIdentity = isConfiguredSuperAdminEmail(user.email)
  const { tenants, activeTenantId } = await loadAccessibleTenants(user.id, user.email)
  if (!tenants.length) {
    redirect('/onboarding')
  }

  const cookieStore = await cookies()
  const persistedTenantId = cookieStore.get('codentra.active-tenant')?.value
  const initialTenantId = tenants.find((tenant) => tenant.id === persistedTenantId)?.id ?? activeTenantId ?? tenants[0]?.id ?? ''

  return (
    <DemoSystemProvider initialTenantId={initialTenantId} authUserEmail={user.email ?? null} isSuperAdminIdentity={isSuperAdminIdentity}>
      <DashboardShell>{children}</DashboardShell>
    </DemoSystemProvider>
  )
}
