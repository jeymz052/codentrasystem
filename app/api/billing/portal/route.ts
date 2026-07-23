import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies } from '@/lib/supabase-server'
import { resolveBillingContext } from '@/lib/billing-auth'
import { stripeRequest } from '@/lib/billing'

export const runtime = 'nodejs'

/**
 * Create a Stripe Billing Customer Portal session so the customer can update
 * their card, view invoices, change plan, or cancel — all on Stripe-hosted UI.
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
  const { tenant } = resolved.ctx

  if (!tenant.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing customer yet. Subscribe first to manage billing.' }, { status: 409 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? request.nextUrl.origin

  try {
    const session = await stripeRequest<{ url: string }>('/billing_portal/sessions', {
      method: 'POST',
      body: {
        customer: tenant.stripe_customer_id,
        return_url: `${origin}/dashboard/settings?billing=portal`,
      },
    })
    const response = NextResponse.json({ url: session.url })
    copyResponseCookies(cookieResponse, response)
    return response
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to open billing portal' }, { status: 500 })
  }
}
