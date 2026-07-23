import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Inter } from 'next/font/google'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { DemoSystemProvider } from '@/components/demo-system-provider'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConfiguredSuperAdminEmail, loadAccessibleTenants } from '@/lib/tenant-access'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Codentra | Simplicity that Scales',
    template: '%s | Codentra',
  },
  description: 'Flexible inventory management and POS system for any business type.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Codentra',
    title: 'Codentra | Simplicity that Scales',
    description: 'Flexible inventory management and POS system for any business type.',
    images: [
      {
        url: '/images/codentrabg.png',
        width: 1200,
        height: 630,
        alt: 'Codentra ERP landing page',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Codentra | Simplicity that Scales',
    description: 'Flexible inventory management and POS system for any business type.',
    images: ['/images/codentrabg.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
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
        <GoogleAnalytics />
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
