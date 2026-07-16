import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(180deg, #F8FBFF 0%, #EEF4FF 100%)' }}>
      <div style={{ width: 'min(560px, 100%)', background: '#fff', border: '1px solid #D8E4F2', borderRadius: 24, padding: 28, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Not found</div>
        <h1 style={{ marginTop: 10, fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.05em', color: '#0F172A', fontWeight: 900 }}>
          We couldn’t find that page.
        </h1>
        <p style={{ marginTop: 12, color: '#64748B', lineHeight: 1.6 }}>
          The page may have moved, been renamed, or no longer exists in this workspace.
        </p>
        <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 44, padding: '0 18px', borderRadius: 14, background: '#3B82F6', color: '#fff', fontWeight: 800, textDecoration: 'none' }}>
            Back to dashboard
          </Link>
          <Link href="/admin/tenants" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 44, padding: '0 18px', borderRadius: 14, background: '#F8FBFF', color: '#3B82F6', fontWeight: 800, textDecoration: 'none', border: '1px solid #D8E4F2' }}>
            Open admin console
          </Link>
        </div>
      </div>
    </div>
  )
}
