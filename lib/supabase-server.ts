import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Bound every Supabase HTTP call with a timeout so a transient network blip
// (e.g. ECONNRESET from the database) fails fast instead of hanging the route
// for the full platform request budget.
const SUPABASE_FETCH_TIMEOUT_MS = 15000

function timeoutFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS)
  const signal = controller.signal
  return fetch(input, { ...init, signal }).finally(() => clearTimeout(timer))
}

let serviceClient: SupabaseClient | null = null

function normalizeCookieOptions(options: CookieOptions = {}): CookieOptions {
  return {
    ...options,
    path: options.path ?? '/',
  }
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...normalizeCookieOptions(options) })
            })
          } catch {
            // Server components cannot always write cookies; middleware handles refresh.
          }
        },
      },
      global: {
        fetch: timeoutFetch,
      },
    }
  )
}

export function createSupabaseRouteClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...normalizeCookieOptions(options) })
          })
        },
      },
      global: {
        fetch: timeoutFetch,
      },
    }
  )
}

export function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set({
      ...cookie,
      path: cookie.path ?? '/',
    })
  })
}

export function getSupabaseServiceClient() {
  if (serviceClient) return serviceClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  serviceClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: timeoutFetch,
    },
  })

  return serviceClient
}
