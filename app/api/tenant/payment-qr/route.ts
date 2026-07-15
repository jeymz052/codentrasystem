import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient, getSupabaseServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const BUCKET = 'tenant-assets'
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_BYTES = 2 * 1024 * 1024
const METHODS = ['gcash', 'maya', 'bdo', 'maribank'] as const

export async function POST(request: NextRequest) {
  const cookieResponse = NextResponse.next()
  const supabase = createSupabaseRouteClient(request, cookieResponse)

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')
  const tenantId = String(form.get('tenantId') ?? '').trim()
  const method = String(form.get('method') ?? '').trim()

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }
  // Allow the legacy fixed methods as well as arbitrary per-account ids
  // (e.g. "pa_abc123") created from the dynamic payment accounts list.
  if (!method || (!METHODS.includes(method as (typeof METHODS)[number]) && !/^pa_[a-z0-9]+$/i.test(method))) {
    return NextResponse.json({ error: 'invalid method' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Only PNG, JPEG, WEBP, or GIF images are allowed' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 2MB' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'gif'
  const path = `payment-qrs/${tenantId}/${method}.${ext}`

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

  const { error } = await service.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: true })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl })
}
