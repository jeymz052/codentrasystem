import { AuthForm } from '@/components/auth/auth-form'
import Image from 'next/image'

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; reset?: string }>
}) {
  const params = (await searchParams) ?? {}
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
        <AuthForm mode="sign-in" nextPath={params.next ?? '/dashboard'} resetMessage={params.reset === '1'} />
      </section>
    </main>
  )
}
