import { OnboardingForm } from '@/components/onboarding/onboarding-form'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>
}) {
  const params = (await searchParams) ?? {}

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-panel">
          <p className="auth-kicker">Workspace setup</p>
          <h2>We’ll tailor the first workspace to the business you’re selling this system to.</h2>
          <p>
            The same codebase can support a coffee shop, sari-sari store, factory, or clinic by changing tenant data, templates, and plan limits.
          </p>
        </div>
      </section>
      <OnboardingForm initialPlan={params.plan} />
    </main>
  )
}
