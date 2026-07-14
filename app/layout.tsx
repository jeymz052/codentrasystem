import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
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
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
