'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID

export function GoogleAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    if (!GA4_ID || pathname !== '/') return
    window.gtag?.('event', 'page_view', {
      page_path: pathname,
      page_title: document.title,
      page_location: window.location.href,
    })
  }, [pathname])

  if (!GA4_ID || pathname !== '/') return null

  return (
    <>
      <Script
        id="ga4-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA4_ID}', {
              send_page_view: false
            });
          `,
        }}
      />
    </>
  )
}
