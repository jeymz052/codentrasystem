import Image from 'next/image'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>
}) {
  const params = (await searchParams) ?? {}

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
