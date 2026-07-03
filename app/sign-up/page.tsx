import { AuthForm } from '@/components/auth/auth-form'
import { SUBSCRIPTION_PLANS, formatPlanPrice } from '@/lib/subscription-plans'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>
}) {
  const params = (await searchParams) ?? {}
  const plan = SUBSCRIPTION_PLANS.some((entry) => entry.plan === params.plan) ? (params.plan as string) : 'professional'

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-panel">
          <p className="auth-kicker">Start your business hub</p>
          <h2>Launch with the right plan, then add locations and users as you grow.</h2>
          <p>
            The onboarding flow creates the first tenant, connects billing-ready fields, and prepares the account for subscription enforcement.
          </p>
          <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
            {SUBSCRIPTION_PLANS.map((entry) => (
              <div
                key={entry.plan}
                style={{
                  background: entry.plan === plan ? '#0F172A' : '#fff',
                  color: entry.plan === plan ? '#fff' : '#0F172A',
                  border: `1px solid ${entry.plan === plan ? '#0F172A' : '#D8E4F2'}`,
                  borderRadius: 18,
                  padding: 18,
                  boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7 }}>{entry.name}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.05em', marginTop: 4 }}>
                      {formatPlanPrice(entry.monthly)}
                      <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.75 }}>/mo</span>
                    </div>
                  </div>
                  {entry.highlight ? (
                    <span style={{
                      background: entry.plan === plan ? '#fff' : '#DBEAFE',
                      color: '#1D4ED8',
                      borderRadius: 999,
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}>
                      {entry.highlight}
                    </span>
                  ) : null}
                </div>
                <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, opacity: 0.88 }}>{entry.description}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, fontSize: 12, opacity: 0.82 }}>
                  <span>{entry.users} users</span>
                  <span>{entry.products} products</span>
                  <span>{entry.locations} locations</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <AuthForm mode="sign-up" nextPath={`/onboarding?plan=${encodeURIComponent(plan)}`} initialPlan={plan} />
    </main>
  )
}
