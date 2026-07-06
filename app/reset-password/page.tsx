import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import Image from 'next/image'

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </main>
  )
}
