import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient, getSupabaseServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const cookieResponse = NextResponse.json({ ok: true })
  const supabase = createSupabaseRouteClient(request, cookieResponse)

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
        action: 'user.logout',
        target_type: 'user',
        target_id: user.id,
        details: { email: user.email },
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      })
    }
  }

  await supabase.auth.signOut()

  cookieResponse.cookies.set({ name: 'codentra.active-tenant', value: '', path: '/', maxAge: 0 })
  cookieResponse.cookies.set({ name: 'codentra.demo-cache.v3', value: '', path: '/', maxAge: 0 })
  return cookieResponse
}
