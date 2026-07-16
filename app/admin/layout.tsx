import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConfiguredSuperAdminEmail, hasSuperAdminMembership, loadAccessibleTenants } from '@/lib/tenant-access'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/admin/tenants')
  }

  const isSuperAdmin = isConfiguredSuperAdminEmail(user.email) || await hasSuperAdminMembership(user.id)
  if (!isSuperAdmin) {
    redirect('/dashboard')
  }

  const { tenants } = await loadAccessibleTenants(user.id, user.email)
  if (!tenants.length) {
    redirect('/onboarding')
  }

  return (
    <DashboardShell>{children}</DashboardShell>
  )
}
