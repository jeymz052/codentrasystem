import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { DashboardAccessGate } from '@/components/layout/DashboardAccessGate'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConfiguredSuperAdminEmail, loadAccessibleTenants } from '@/lib/tenant-access'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/dashboard')
  }

  const isSuperAdminIdentity = isConfiguredSuperAdminEmail(user.email)
  const cookieStore = await cookies()
  const preferredTenantId = cookieStore.get('codentra.active-tenant')?.value ?? null
  const { tenants, activeTenantId } = await loadAccessibleTenants(user.id, user.email, preferredTenantId)
  if (!tenants.length) {
    redirect('/onboarding')
  }

  return (
    <DashboardAccessGate>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAccessGate>
  )
}
