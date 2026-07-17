import Image from 'next/image'
import { redirect } from 'next/navigation'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConfiguredSuperAdminEmail, loadAccessibleTenants } from '@/lib/tenant-access'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>
}) {
  const params = (await searchParams) ?? {}

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const isSuperAdminIdentity = isConfiguredSuperAdminEmail(user.email)
    const { tenants } = await loadAccessibleTenants(user.id, user.email, null)
    // One email = one tenant: if the account already has a workspace, send
    // them straight to the dashboard instead of letting them create another.
    if (!isSuperAdminIdentity && tenants.length) {
      redirect('/dashboard')
    }
  }

  return (
    <main className="auth-page auth-page--split">
      <section className="auth-hero auth-hero--image" aria-hidden="true">
        <Image
          src="/images/codentrabg.png"
          alt=""
          fill
          priority
          sizes="(max-width: 980px) 100vw, 60vw"
          className="auth-hero-image"
        />
        <div className="auth-hero-overlay" />
      </section>
      <section className="auth-panel">
        <OnboardingForm initialPlan={params.plan} />
      </section>
    </main>
  )
}
