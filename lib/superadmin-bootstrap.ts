import { randomUUID } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'superadmin@codentra.local'
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'SuperAdmin123!'
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME ?? 'Super Admin'

let bootstrapPromise: Promise<void> | null = null

function isDuplicateKeyError(error: unknown) {
  return error instanceof Error && (error.message.includes('23505') || error.message.toLowerCase().includes('duplicate'))
}

async function seedSuperadmin() {
  if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) return

  const client = getSupabaseAdminClient()
  const { data: usersResult, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) {
    throw new Error(`listUsers failed: ${listError.message}`)
  }

  const existingUser = usersResult.users.find((entry) => entry.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase())
  let userId = existingUser?.id ?? null

  if (!existingUser) {
    // Only auto-create outside production to avoid spinning up stray accounts
    // in the live environment. In production we still REPAIR an existing
    // superadmin's credentials so a drifted password can be restored with the
    // configured SUPERADMIN_PASSWORD (fixes "correct credentials are invalid").
    if (process.env.NODE_ENV === 'production') {
      return
    }
    const { data, error } = await client.auth.admin.createUser({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: SUPERADMIN_NAME },
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
      user_metadata: { full_name: SUPERADMIN_NAME },
    })
    if (error) throw new Error(`updateUserById failed: ${error.message}`)
    userId = existingUser.id
  }

  if (!userId) {
    throw new Error('Could not resolve superadmin auth user')
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
