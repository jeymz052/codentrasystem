import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies } from '@/lib/supabase-server'
import { resolveBillingContext } from '@/lib/billing-auth'

export const runtime = 'nodejs'

/**
 * PayMongo does not provide a Stripe-style hosted customer portal in this app,
 * so we route admins back to the billing screen where they can review status.
 */
export async function POST(request: NextRequest) {
  const cookieResponse = NextResponse.next()

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const resolved = await resolveBillingContext(request, cookieResponse, body.tenantId)
  if ('error' in resolved) return resolved.error

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? request.nextUrl.origin
  const response = NextResponse.json({ url: `${origin}/dashboard/billing` })
  copyResponseCookies(cookieResponse, response)
  return response
}
