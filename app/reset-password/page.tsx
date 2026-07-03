import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-panel">
          <p className="auth-kicker">Secure reset</p>
          <h2>Set a fresh password and return to your dashboard.</h2>
          <p>
            This page is opened from the reset link in your email.
          </p>
        </div>
      </section>
      <ResetPasswordForm />
    </main>
  )
}
