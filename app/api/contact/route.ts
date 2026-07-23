import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim()
    const phone = String(body.phone ?? '').trim() || null
    const company = String(body.company ?? '').trim() || null
    const business_type = String(body.business_type ?? '').trim() || null
    const locations = String(body.locations ?? '').trim() || null
    const message = String(body.message ?? '').trim()
    const category = String(body.category ?? 'general').trim() || 'general'
    const preferred_date = String(body.preferred_date ?? '').trim() || null
    const preferred_time = String(body.preferred_time ?? '').trim() || null

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 })
    }

    const client = getSupabaseServiceClient()
    const { error } = await client.from('contact_submissions').insert({
      name,
      email,
      phone,
      company,
      business_type,
      locations,
      message,
      category,
      preferred_date,
      preferred_time,
      source: 'landing-page',
    })

    if (error) {
      console.error('contact_submissions insert failed:', error.message)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
