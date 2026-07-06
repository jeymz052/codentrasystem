import { NextResponse, type NextRequest } from 'next/server'
import { canAccessTenant } from '@/lib/tenant-access'
import { copyResponseCookies, createSupabaseRouteClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const cookieResponse = NextResponse.next()
  const supabase = createSupabaseRouteClient(request, cookieResponse)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const tenantId = String(body.tenantId ?? '')
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  const allowed = await canAccessTenant(user.id, tenantId, user.email)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const response = NextResponse.json({ ok: true, tenantId })
  copyResponseCookies(cookieResponse, response)
  response.cookies.set({
    name: 'codentra.active-tenant',
    value: tenantId,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
