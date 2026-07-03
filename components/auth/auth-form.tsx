'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { SUBSCRIPTION_PLANS, formatPlanPrice } from '@/lib/subscription-plans'

type AuthMode = 'sign-in' | 'sign-up'

type AuthFormProps = {
  mode: AuthMode
  nextPath?: string
  initialPlan?: string
}

export function AuthForm({
  mode,
  nextPath = '/dashboard',
  initialPlan = 'professional',
}: AuthFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(initialPlan)

  const activePlan = useMemo(() => {
    return SUBSCRIPTION_PLANS.find((plan) => plan.plan === selectedPlan) ?? SUBSCRIPTION_PLANS[1]
  }, [selectedPlan])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setLoading(true)
    setError(null)
    setSuccess(null)

    const submittedEmail = String(formData.get('email') ?? '').trim()
    const submittedPassword = String(formData.get('password') ?? '')

    try {
      if (mode === 'sign-in') {
        const response = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: submittedEmail,
            password: submittedPassword,
          }),
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || 'Sign in failed')
        }

        window.location.replace(nextPath)
        return
      }

      const submittedConfirmPassword = String(formData.get('confirmPassword') ?? '')
      if (submittedPassword !== submittedConfirmPassword) {
        throw new Error('Passwords do not match')
      }

      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: submittedEmail,
          password: submittedPassword,
          plan: selectedPlan,
          emailRedirectTo: `${window.location.origin}/onboarding?plan=${encodeURIComponent(selectedPlan)}`,
        }),
      })

      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null

      if (!response.ok) {
        throw new Error(body?.message || 'Sign up failed')
      }

      const needsConfirmation = response.headers.get('x-needs-confirmation') === '1'
      if (!needsConfirmation) {
        window.location.replace(`/onboarding?plan=${encodeURIComponent(selectedPlan)}`)
      } else {
        setSuccess('Check your email to confirm your account, then continue to onboarding.')
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-badge">
        <LockKeyhole size={14} />
        Secure multi-tenant access
      </div>

      <h1 className="auth-title">
        {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
      </h1>
      <p className="auth-copy">
        {mode === 'sign-in'
          ? 'Sign in to manage your stores, branches, subscriptions, and operations from one place.'
          : 'Start a tenant, pick a plan, confirm your password, and onboard the first business in minutes.'}
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field">
          <span>Email</span>
          <div className="auth-input-wrap">
            <Mail size={14} />
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </label>

        <label className="auth-field">
          <span>Password</span>
          <div className="auth-input-wrap">
            <LockKeyhole size={14} />
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
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

        {mode === 'sign-up' ? (
          <>
            <label className="auth-field">
              <span>Confirm password</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={14} />
                <input
                  name="confirmPassword"
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

            <label className="auth-field">
              <span>Choose your plan</span>
              <select
                className="auth-select"
                name="plan"
                value={selectedPlan}
                onChange={(event) => setSelectedPlan(event.target.value)}
              >
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <option key={plan.plan} value={plan.plan}>
                    {plan.name} - {formatPlanPrice(plan.monthly)}/mo
                  </option>
                ))}
              </select>
            </label>

            <div className="auth-plan-summary">
              <div>
                <strong>{activePlan.name}</strong>
                <span>{activePlan.description}</span>
              </div>
              <div className="auth-plan-price">
                <strong>{formatPlanPrice(activePlan.monthly)}</strong>
                <span>/ month</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="auth-inline-row">
              <label className="auth-inline-label">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) => setShowPassword(event.target.checked)}
                />
                Show password
              </label>
              <Link href="/forgot-password" className="auth-link-button">
                Forgot password?
              </Link>
            </div>
            <div className="auth-helper">
              Need to reset? We’ll email a secure link to create a new password.
            </div>
          </>
        )}

        {mode === 'sign-up' ? (
          <div className="auth-helper">
            Your plan choice will carry into onboarding. You can upgrade or manage billing later from Settings.
          </div>
        ) : null}

        {error ? <div className="auth-message error">{error}</div> : null}
        {success ? <div className="auth-message success"><CheckCircle2 size={14} />{success}</div> : null}

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          <ArrowRight size={16} />
        </button>

      </form>

      <div className="auth-footer">
        {mode === 'sign-in' ? (
          <span>
            New here? <Link href="/sign-up">Create your SaaS account</Link>
          </span>
        ) : (
          <span>
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </span>
        )}
      </div>

    </div>
  )
}
