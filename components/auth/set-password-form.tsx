'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import type { EmailOtpType, User } from '@supabase/supabase-js'
import { formatRoleLabel } from '@/lib/access-control'
import type { UserRole } from '@/types/database'

export function SetPasswordForm() {
  // A dedicated client that does NOT auto-consume the URL. We process the invite
  // token manually so we can force the invited user's session even if someone
  // (e.g. an admin/superadmin) is already logged in on this browser.
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { detectSessionInUrl: false, flowType: 'implicit', persistSession: true, autoRefreshToken: true } }
      ),
    []
  )
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [fullName, setFullName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [invitedRole, setInvitedRole] = useState<UserRole | null>(null)

  useEffect(() => {
    let active = true

    function applyUser(user: User | null) {
      if (!user) return
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      setEmail(user.email ?? null)
      setFullName(typeof meta.full_name === 'string' ? meta.full_name : null)
      setTenantName(typeof meta.tenant_name === 'string' ? meta.tenant_name : null)
      setInvitedRole(typeof meta.invited_role === 'string' ? (meta.invited_role as UserRole) : null)
    }

    async function establishSession() {
      try {
        const hashRaw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
        const hashParams = new URLSearchParams(hashRaw)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const errorDescription = hashParams.get('error_description')

        const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
        const tokenHash = query.get('token_hash')
        const otpType = query.get('type')
        const queryError = query.get('error_description')

        if (errorDescription || queryError) {
          throw new Error(decodeURIComponent(errorDescription || queryError || 'Invitation link error'))
        }

        // Implicit flow (invite/recovery): tokens arrive in the URL hash. Force
        // this session so it replaces any pre-existing login on this browser.
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
        } else if (tokenHash && otpType) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as EmailOtpType,
          })
          if (otpError) throw otpError
        }

        // Scrub the token out of the URL so a refresh can't reuse/expire it.
        if (typeof window !== 'undefined' && (hashRaw || tokenHash)) {
          window.history.replaceState(null, '', window.location.pathname)
        }

        const { data } = await supabase.auth.getUser()
        if (!active) return
        if (!data.user) {
          setError('This invitation link is invalid or has expired. Ask an admin to resend the invitation.')
        } else {
          applyUser(data.user)
        }
      } catch (establishError) {
        if (!active) return
        setError(establishError instanceof Error ? establishError.message : 'Invalid or expired invitation link.')
      } finally {
        if (active) setReady(true)
      }
    }

    void establishSession()
    return () => {
      active = false
    }
  }, [supabase])

  useEffect(() => {
    if (!success) return

    const timer = window.setTimeout(() => {
      router.replace('/dashboard')
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

      // Make sure we're acting as the invited user, not a leftover session.
      const { data: current } = await supabase.auth.getUser()
      if (!current.user) {
        throw new Error('Your invitation session has expired. Ask an admin to resend the invitation.')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) throw updateError

      setSuccess('Password set. Taking you to your workspace...')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to set your password')
    } finally {
      setLoading(false)
    }
  }

  const greetingName = fullName?.split(' ')[0] ?? null

  return (
    <div className="auth-card auth-card--entry">
      <div className="auth-brand-block">
        <div className="auth-brand">
          <Image
            src="/images/codentra-removebg-preview.png"
            alt="Codentra logo"
            width={520}
            height={184}
            priority
            className="auth-brand-logo"
          />
        </div>
        <p className="auth-brand-tagline">Simplicity that Scales</p>
        <div className="auth-signin-copy">
          <h1 className="auth-title">
            {greetingName ? `Welcome, ${greetingName}!` : 'Welcome to Codentra!'}
          </h1>
          <p className="auth-copy">
            {tenantName
              ? <>You&apos;ve been invited to join <strong>{tenantName}</strong>{invitedRole ? <> as a <strong>{formatRoleLabel(invitedRole)}</strong></> : null}. Set a password to activate your account.</>
              : <>You&apos;ve been invited to Codentra. Set a password to activate your account.</>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {email ? (
          <label className="auth-field">
            <span>Your email</span>
            <div className="auth-input-wrap">
              <input type="email" value={email} readOnly disabled />
            </div>
          </label>
        ) : null}

        <label className="auth-field">
          <span>Create password</span>
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
              placeholder="Repeat your password"
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

        <button className="auth-button" type="submit" disabled={loading || !ready}>
          {loading ? 'Setting up...' : !ready ? 'Verifying invitation...' : 'Activate account'}
          <ArrowRight size={16} />
        </button>
      </form>

      <div className="auth-footer">
        Already activated? Go to <span style={{ color: 'var(--accent)', fontWeight: 700 }}>sign in</span>.
      </div>
    </div>
  )
}
