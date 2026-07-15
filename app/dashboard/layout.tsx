import { redirect } from 'next/navigation'
import { DashboardAccessGate } from '@/components/layout/DashboardAccessGate'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/dashboard')
  }

  return (
    <DashboardAccessGate>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAccessGate>
  )
}
