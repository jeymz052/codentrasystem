import { AuthForm } from '@/components/auth/auth-form'

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>
}) {
  const params = (await searchParams) ?? {}
  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-panel">
          <p className="auth-kicker">Codentra SaaS</p>
          <h2>One system for coffee shops, manufacturers, sari-sari stores, and every other small business.</h2>
          <p>
            Real login. Real tenants. Real billing hooks. The same product can flex across different operations without changing the core workflow.
          </p>
        </div>
      </section>
      <AuthForm mode="sign-in" nextPath={params.next ?? '/dashboard'} />
    </main>
  )
}
