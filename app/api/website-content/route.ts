import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase-server'
import { DEFAULT_WEBSITE_CONTENT, mergeWebsiteContent, type WebsiteContent } from '@/lib/website-content'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const service = getSupabaseServiceClient()
    const { data, error } = await service
      .from('website_content')
      .select('content, updated_at')
      .eq('slug', 'landing')
      .maybeSingle()

    if (error) {
      throw error
    }

    const content = mergeWebsiteContent((data?.content as Partial<WebsiteContent> | null) ?? null)
    return NextResponse.json({ content, updated_at: data?.updated_at ?? null })
  } catch (error) {
    return NextResponse.json(
      { content: DEFAULT_WEBSITE_CONTENT, error: error instanceof Error ? error.message : 'Failed to load website content' },
      { status: 200 }
    )
  }
}
