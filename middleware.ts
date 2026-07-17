import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = { ...(options as CookieOptions), path: options.path ?? '/' }
            // Keep the auth cookies behind the Cloudflare -> Vercel proxy so the
            // session survives. Without `sameSite: 'lax'` the browser can drop
            // them, which makes getUser() return null on the next hop and the
            // middleware ping-pongs between /sign-in and /dashboard (ERR_TOO_MANY_REDIRECTS).
            if (!('sameSite' in cookieOptions)) cookieOptions.sameSite = 'lax'
            if (!('secure' in cookieOptions)) cookieOptions.secure = process.env.NODE_ENV === 'production'
            response.cookies.set({ name, value, ...cookieOptions })
          })
        },
      },
    }
  )

  // If getUser() throws (transient token/network error, e.g. during a token
  // refresh at odd hours), treat the user as unauthenticated but DO NOT loop.
  // We let the request through the matcher and only redirect on protected pages
  // when we are certain there is no session, avoiding a redirect storm.
  let user = null as null | { id: string }
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    user = null
  }

  const isProtected = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/onboarding')
  const isAuthPage = request.nextUrl.pathname.startsWith('/sign-in') || request.nextUrl.pathname.startsWith('/sign-up')

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.search = ''
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
