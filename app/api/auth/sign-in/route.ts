import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient, getSupabaseServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? '').trim()
  const password = String(body?.password ?? '')

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  const supabase = createSupabaseRouteClient(request, response)

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Forward any cookies Supabase set (e.g. on a retry/refresh) and return a
    // clear message. Returning a brand new response here used to drop the
    // Set-Cookie headers, which could strand the user in a logout loop.
    return NextResponse.json(
      { message: error.message, code: (error as { status?: number }).status ?? undefined },
      { status: 401, headers: response.headers }
    )
  }

  const user = data.user
  if (user) {
    const serviceClient = getSupabaseServiceClient()
    const { data: membership } = await serviceClient
      .from('tenant_memberships')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle()

    const tenantId = membership?.tenant_id ?? null

    if (tenantId) {
      await serviceClient.from('audit_logs').insert({
        tenant_id: tenantId,
        user_id: user.id,
        action: 'user.login',
        target_type: 'user',
        target_id: user.id,
        details: { email },
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      })

      // Stamp last_login on the matching user record. The app `users` row is
      // keyed by auth user id, but matching on email (within the tenant) is
      // robust even if the auth id changed (e.g. after a resend re-provision).
      await serviceClient.from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('email', user.email)
    }

    // Enforce one active login per account: signing in on a new device must
    // force any other device's session for this user to sign out (so e.g. a
    // sales staff account can't be used from two POS terminals at once).
    // We use the service-role admin client with the NEW session's access token
    // and `scope: 'others'`, which revokes every server-tracked session for
    // this user EXCEPT the one just created — so the device that just signed
    // in stays logged in and the old device (any other browser/device) is
    // kicked on its next request. NOTE: two tabs in the SAME browser share one
    // cookie session, so signing in on a second tab just refreshes that same
    // session and there is nothing to revoke — test this across different
    // browsers/devices, not two tabs of the same browser.
    if (data.session?.access_token) {
      const revoke = await serviceClient.auth.admin
        .signOut(data.session.access_token, 'others')
      if (revoke.error) {
        console.error('[sign-in] failed to revoke other sessions:', revoke.error.message)
      }
    }
  }


  return response
}
