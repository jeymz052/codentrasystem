import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies, createSupabaseRouteClient, getSupabaseServiceClient } from '@/lib/supabase-server'
import { hasSuperAdminMembership, isConfiguredSuperAdminEmail } from '@/lib/tenant-access'
import { DEFAULT_WEBSITE_CONTENT, mergeWebsiteContent, type WebsiteContent } from '@/lib/website-content'

export const runtime = 'nodejs'

async function requireSuperAdmin(request: NextRequest) {
  const cookieResponse = NextResponse.next()
  const supabase = createSupabaseRouteClient(request, cookieResponse)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), cookieResponse }
  }

  const isSuperAdmin = isConfiguredSuperAdminEmail(user.email) || await hasSuperAdminMembership(user.id)
  if (!isSuperAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), cookieResponse }
  }

  return { user, cookieResponse }
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if ('error' in auth) return auth.error

  try {
    const service = getSupabaseServiceClient()
    const { data, error } = await service
      .from('website_content')
      .select('content, updated_at')
      .eq('slug', 'landing')
      .maybeSingle()

    if (error) throw error

    const response = NextResponse.json({
      content: mergeWebsiteContent((data?.content as Partial<WebsiteContent> | null) ?? null),
      updated_at: data?.updated_at ?? null,
    })
    copyResponseCookies(auth.cookieResponse, response)
    return response
  } catch (error) {
    return NextResponse.json(
      { content: DEFAULT_WEBSITE_CONTENT, error: error instanceof Error ? error.message : 'Failed to load website content' },
      { status: 200 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const content = mergeWebsiteContent((body?.content as Partial<WebsiteContent> | null) ?? null)

    const service = getSupabaseServiceClient()
    const { error } = await service.from('website_content').upsert({
      slug: 'landing',
      content,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' })

    if (error) throw error

    const response = NextResponse.json({ ok: true, content })
    copyResponseCookies(auth.cookieResponse, response)
    return response
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save website content' }, { status: 500 })
  }
}
