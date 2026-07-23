import { AuthForm } from '@/components/auth/auth-form'
import Image from 'next/image'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; interval?: string }>
}) {
  const params = (await searchParams) ?? {}
  const plan = SUBSCRIPTION_PLANS.some((entry) => entry.plan === params.plan) ? (params.plan as string) : 'professional'
  const interval = params.interval === 'year' ? 'year' : 'month'
  const nextPath = `/onboarding?plan=${encodeURIComponent(plan)}&interval=${interval}`

  return (
    <main className="auth-page auth-page--split auth-page--stack-mobile">
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
        <AuthForm mode="sign-up" nextPath={nextPath} initialPlan={plan} initialInterval={interval} />
      </section>
    </main>
  )
}
