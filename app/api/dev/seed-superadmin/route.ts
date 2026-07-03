import { NextResponse } from 'next/server'
import { ensureSuperadminSeeded } from '@/lib/superadmin-bootstrap'
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'superadmin@codentra.local'
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'SuperAdmin123!'

export async function POST() {
  try {
    await ensureSuperadminSeeded()

    return NextResponse.json({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed superadmin login' },
      { status: 500 }
    )
  }
}
