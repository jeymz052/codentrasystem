import { NextResponse, type NextRequest } from 'next/server'
import { copyResponseCookies, createSupabaseRouteClient, getSupabaseServiceClient } from '@/lib/supabase-server'
import { hasSuperAdminMembership, isConfiguredSuperAdminEmail } from '@/lib/tenant-access'

export const runtime = 'nodejs'

const BUCKET = 'website-assets'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

export async function POST(request: NextRequest) {
  const cookieResponse = NextResponse.next()
  const supabase = createSupabaseRouteClient(request, cookieResponse)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = isConfiguredSuperAdminEmail(user.email) || await hasSuperAdminMembership(user.id)
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file')
  const prefix = String(form.get('prefix') ?? 'landing').trim() || 'landing'

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be 5MB or smaller' }, { status: 400 })
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1] ?? 'png'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase()
  const path = `${prefix}/${Date.now()}-${safeName}.${ext}`

  const service = getSupabaseServiceClient()
  try {
    await service.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ALLOWED,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!/already exists/i.test(message)) {
      return NextResponse.json({ error: message || 'Failed to prepare storage bucket' }, { status: 500 })
    }
  }

  const { error } = await service.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = service.storage.from(BUCKET).getPublicUrl(path)
  const response = NextResponse.json({ url: data.publicUrl, path })
  copyResponseCookies(cookieResponse, response)
  return response
}
