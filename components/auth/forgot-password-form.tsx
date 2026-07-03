'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Mail, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export function ForgotPasswordForm() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError
      setSuccess('Password reset email sent. Check your inbox.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-badge">
        <ShieldAlert size={14} />
        Password recovery
      </div>
      <h1 className="auth-title">Reset your password</h1>
      <p className="auth-copy">
        Enter the email tied to your account and we’ll send you a secure reset link.
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field">
          <span>Email</span>
          <div className="auth-input-wrap">
            <Mail size={14} />
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </label>

        {error ? <div className="auth-message error">{error}</div> : null}
        {success ? <div className="auth-message success"><CheckCircle2 size={14} />{success}</div> : null}

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  )
}
