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

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 401 })
  }

  const { data: { user } } = await supabase.auth.getUser()
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
  }

  return response
}
