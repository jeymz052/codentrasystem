import { randomUUID } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'superadmin@codentra.local'
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'SuperAdmin123!'
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME ?? 'Super Admin'
const SUPERADMIN_TENANT_NAME = process.env.SUPERADMIN_TENANT_NAME ?? 'Codentra HQ'

let bootstrapPromise: Promise<void> | null = null

function isDuplicateKeyError(error: unknown) {
  return error instanceof Error && (error.message.includes('23505') || error.message.toLowerCase().includes('duplicate'))
}

async function seedSuperadmin() {
  if (process.env.NODE_ENV === 'production') return
  if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) return

  const client = getSupabaseAdminClient()
  const { data: usersResult, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) {
    throw new Error(`listUsers failed: ${listError.message}`)
  }

  const existingUser = usersResult.users.find((entry) => entry.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase())
  let userId = existingUser?.id ?? null

  if (!existingUser) {
    const { data, error } = await client.auth.admin.createUser({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
    })

    if (error) {
      if (!isDuplicateKeyError(error)) {
        throw new Error(`createUser failed: ${error.message}`)
      }

      const { data: retryUsers, error: retryListError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (retryListError) {
        throw new Error(`listUsers retry failed: ${retryListError.message}`)
      }

      userId = retryUsers.users.find((entry) => entry.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase())?.id ?? null
    } else {
      userId = data.user.id
    }
  } else {
    const { error } = await client.auth.admin.updateUserById(existingUser.id, {
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error(`updateUserById failed: ${error.message}`)
  }

  if (!userId) {
    throw new Error('Could not resolve superadmin auth user')
  }

  const { data: membershipRows, error: membershipError } = await client
    .from('tenant_memberships')
    .select('tenant_id, role')
    .eq('auth_user_id', userId)
    .eq('role', 'super_admin')
    .limit(1)

  if (membershipError) {
    throw new Error(`membership lookup failed: ${membershipError.message}`)
  }

  let tenantId = membershipRows?.[0]?.tenant_id ?? null

  if (!tenantId) {
    tenantId = randomUUID()
    const { error: tenantError } = await client.from('tenants').insert({
      id: tenantId,
      name: SUPERADMIN_TENANT_NAME,
      business_type: 'general',
      billing_email: SUPERADMIN_EMAIL,
      email: SUPERADMIN_EMAIL,
      plan: 'enterprise',
      subscription_status: 'active',
      trial_ends_at: null,
      subscription_ends_at: null,
      max_users: 999,
      max_products: 9999,
      max_locations: 99,
      is_active: true,
    })

    if (tenantError && !isDuplicateKeyError(tenantError)) {
      throw new Error(`tenant insert failed: ${tenantError.message}`)
    }

    const { error: insertError } = await client.from('tenant_memberships').insert({
      id: randomUUID(),
      tenant_id: tenantId,
      auth_user_id: userId,
      role: 'super_admin',
      is_default: true,
    })

    if (insertError && !isDuplicateKeyError(insertError)) {
      throw new Error(`membership insert failed: ${insertError.message}`)
    }
  }
}

export function ensureSuperadminSeeded() {
  if (!bootstrapPromise) {
    bootstrapPromise = seedSuperadmin().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  return bootstrapPromise
}
