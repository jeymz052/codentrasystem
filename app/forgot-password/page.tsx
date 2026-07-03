import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-panel">
          <p className="auth-kicker">Account access</p>
          <h2>We’ll help you get back in safely.</h2>
          <p>
            Send a reset link to the email tied to your Codentra account.
          </p>
        </div>
      </section>
      <ForgotPasswordForm />
    </main>
  )
}
