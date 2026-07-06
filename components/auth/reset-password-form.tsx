'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!success) return

    const timer = window.setTimeout(() => {
      router.replace('/sign-in?reset=1')
    }, 1800)

    return () => window.clearTimeout(timer)
  }, [router, success])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) throw updateError

      setSuccess('Password updated. You can now sign in with your new password.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card auth-card--entry">
      <div className="auth-brand-block">
        <div className="auth-brand">
          <Image
            src="/images/codentralogo-removebg-preview.png"
            alt="Codentra logo"
            width={520}
            height={184}
            priority
            className="auth-brand-logo"
          />
        </div>
        <div className="auth-signin-copy">
          <h1 className="auth-title">Create your new password</h1>
          <p className="auth-copy">
            Choose a new password for your Codentra account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field">
          <span>New password</span>
          <div className="auth-input-wrap">
            <LockKeyhole size={14} />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="auth-eye-button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>

        <label className="auth-field">
          <span>Confirm password</span>
          <div className="auth-input-wrap">
            <LockKeyhole size={14} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              type="button"
              className="auth-eye-button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>

        {error ? <div className="auth-message error">{error}</div> : null}
        {success ? <div className="auth-message success"><CheckCircle2 size={14} />{success}</div> : null}

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update password'}
          <ArrowRight size={16} />
        </button>
      </form>

      <div className="auth-footer">
        After updating, you’ll be sent back to <span style={{ color: 'var(--accent)', fontWeight: 700 }}>sign in</span>.
      </div>
    </div>
  )
}
