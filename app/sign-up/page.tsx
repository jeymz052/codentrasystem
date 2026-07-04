import { AuthForm } from '@/components/auth/auth-form'
import Image from 'next/image'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>
}) {
  const params = (await searchParams) ?? {}
  const plan = SUBSCRIPTION_PLANS.some((entry) => entry.plan === params.plan) ? (params.plan as string) : 'professional'

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
        <AuthForm mode="sign-up" nextPath={`/onboarding?plan=${encodeURIComponent(plan)}`} initialPlan={plan} />
      </section>
    </main>
  )
}
