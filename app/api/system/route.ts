import { NextResponse, type NextRequest } from 'next/server'
import { applyDatabaseMutation, ensureDatabaseState, loadTenantState } from '@/lib/system-db'
import { hasSuperAdminMembership, isConfiguredSuperAdminEmail, loadAccessibleTenants, getTenantMembership } from '@/lib/tenant-access'
import { canPerformMutation } from '@/lib/access-control'
import { copyResponseCookies, createSupabaseRouteClient } from '@/lib/supabase-server'
import type { BusinessType, UserRole } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const cookieResponse = NextResponse.next()
    const supabase = createSupabaseRouteClient(request, cookieResponse)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferredTenantId = request.cookies.get('codentra.active-tenant')?.value ?? null
    const { tenants, activeTenantId: defaultTenantId } = await loadAccessibleTenants(user.id, user.email, preferredTenantId)
    if (!tenants.length || !defaultTenantId) {
      return NextResponse.json({ error: 'Complete onboarding first' }, { status: 409 })
    }

    const { searchParams } = new URL(request.url)
    const requestedTenantId = searchParams.get('tenantId') ?? preferredTenantId ?? defaultTenantId
    const activeTenant = tenants.find((tenant) => tenant.id === requestedTenantId) ?? tenants.find((tenant) => tenant.id === defaultTenantId) ?? tenants[0]
    let state: Awaited<ReturnType<typeof ensureDatabaseState>>
    try {
      state = await ensureDatabaseState(activeTenant.id, activeTenant.business_type as BusinessType)
    } catch (error) {
      const fallback = await loadTenantState(activeTenant.id)
      if (fallback) {
        state = fallback
      } else {
        throw error
      }
    }

    const response = NextResponse.json({
      state,
      activeTenantId: activeTenant.id,
      availableTenants: tenants,
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    copyResponseCookies(cookieResponse, response)
    response.cookies.set({
      name: 'codentra.active-tenant',
      value: activeTenant.id,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    })
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load system state' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieResponse = NextResponse.next()
    const supabase = createSupabaseRouteClient(request, cookieResponse)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const preferredTenantId = request.cookies.get('codentra.active-tenant')?.value ?? null
    const { tenants, activeTenantId: defaultTenantId } = await loadAccessibleTenants(user.id, user.email, preferredTenantId)
    const requestedTenantId = String(body.tenantId ?? preferredTenantId ?? defaultTenantId ?? '')
    const activeTenant = tenants.find((tenant) => tenant.id === requestedTenantId) ?? tenants.find((tenant) => tenant.id === defaultTenantId)

    if (!activeTenant) {
      return NextResponse.json({ error: 'Complete onboarding first' }, { status: 409 })
    }

    const tenantId = activeTenant.id
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const membership = await getTenantMembership(user.id, tenantId)
    const superAdmin = membership?.role === 'super_admin' || isConfiguredSuperAdminEmail(user.email) || await hasSuperAdminMembership(user.id)
    const role = (superAdmin ? 'super_admin' : membership?.role) as UserRole | null

    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!canPerformMutation(role, body.action)) {
      return NextResponse.json({ error: 'This role cannot perform that action' }, { status: 403 })
    }

    const state = await applyDatabaseMutation(tenantId, body, request.nextUrl.origin)
    const response = NextResponse.json({
      state,
      activeTenantId: tenantId,
      availableTenants: tenants,
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
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
  } catch (error) {
    console.error('[api/system] mutation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply mutation' },
      { status: 500 }
    )
  }
}
