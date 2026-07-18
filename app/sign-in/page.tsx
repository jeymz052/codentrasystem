import { AuthForm } from '@/components/auth/auth-form'
import Image from 'next/image'

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; reset?: string; email?: string }>
}) {
  const params = (await searchParams) ?? {}
  // Official users can be sent a pre-provisioned link (?email=...) so their
  // email is already filled in when they open the system.
  const initialEmail = params.email ? String(params.email).trim() : ''
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
        <AuthForm mode="sign-in" nextPath={params.next ?? '/dashboard'} resetMessage={params.reset === '1'} initialEmail={initialEmail} />
      </section>
    </main>
  )
}
