import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Inter } from 'next/font/google'
import { DemoSystemProvider } from '@/components/demo-system-provider'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConfiguredSuperAdminEmail, loadAccessibleTenants } from '@/lib/tenant-access'
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

  let initialTenantId = ''
  let authUserEmail: string | null = null
  let isSuperAdminIdentity = false

  if (user) {
    authUserEmail = user.email ?? null
    isSuperAdminIdentity = isConfiguredSuperAdminEmail(user.email)
    const cookieStore = await cookies()
    const preferredTenantId = cookieStore.get('codentra.active-tenant')?.value ?? null
    const { tenants, activeTenantId } = await loadAccessibleTenants(user.id, user.email, preferredTenantId)
    initialTenantId = activeTenantId ?? tenants[0]?.id ?? ''
  }

  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning>
        <DemoSystemProvider
          initialTenantId={initialTenantId}
          authUserEmail={authUserEmail}
          isSuperAdminIdentity={isSuperAdminIdentity}
        >
          {children}
        </DemoSystemProvider>
      </body>
    </html>
  )
}
