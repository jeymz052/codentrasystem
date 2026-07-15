import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { DemoSystemProvider } from '@/components/demo-system-provider'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConfiguredSuperAdminEmail, loadAccessibleTenants } from '@/lib/tenant-access'
import { redirect } from 'next/navigation'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Codentra - Simplicity that Scales',
  description: 'Flexible inventory management and POS system for any business type.',
  icons: {
    icon: '/images/Clogo.png',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const isSuperAdminIdentity = isConfiguredSuperAdminEmail(user.email)
  const { tenants, activeTenantId } = await loadAccessibleTenants(user.id, user.email)
  if (!tenants.length) {
    redirect('/onboarding')
  }

  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning>
        <DemoSystemProvider
          initialTenantId={activeTenantId ?? tenants[0]?.id ?? ''}
          authUserEmail={user.email ?? null}
          isSuperAdminIdentity={isSuperAdminIdentity}
        >
          {children}
        </DemoSystemProvider>
      </body>
    </html>
  )
}
