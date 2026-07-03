import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? '').trim()
  const password = String(body?.password ?? '')
  const emailRedirectTo = String(body?.emailRedirectTo ?? '').trim()

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  const supabase = createSupabaseRouteClient(request, response)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo
      ? {
          emailRedirectTo,
        }
      : undefined,
  })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  response.headers.set('x-needs-confirmation', data.session ? '0' : '1')
  return response
}
