import { WebsiteContentManager } from '@/components/admin/WebsiteContentManager'

export default function WebsiteContentPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 46%, #F7FAFC 100%)',
      padding: '28px 24px 40px',
      color: '#0F172A',
    }}>
      <WebsiteContentManager />
    </main>
  )
}
