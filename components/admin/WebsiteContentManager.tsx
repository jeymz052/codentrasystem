'use client'

import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  BadgeDollarSign,
  CircleHelp,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Mail,
  MessageSquare,
  Package,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
} from 'lucide-react'
import { DEFAULT_WEBSITE_CONTENT, mergeWebsiteContent, type WebsiteContent } from '@/lib/website-content'

type LoadState = 'idle' | 'loading' | 'saving' | 'error' | 'saved'
type TabKey = 'home' | 'features' | 'solutions' | 'pricing' | 'testimonials' | 'faq' | 'contact'

const TABS: Array<{ key: TabKey; label: string; icon: typeof Home; description: string }> = [
  { key: 'home', label: 'Home', icon: Home, description: 'Hero image, logo, and CTA buttons' },
  { key: 'features', label: 'Features', icon: LayoutGrid, description: 'Feature cards and why-choose copy' },
  { key: 'solutions', label: 'Solutions', icon: Package, description: 'Solution icons, titles, and alt text' },
  { key: 'pricing', label: 'Pricing', icon: BadgeDollarSign, description: 'Pricing headings and plan context' },
  { key: 'testimonials', label: 'Testimonials', icon: MessageSquare, description: 'Social proof quotes and profiles' },
  { key: 'faq', label: 'FAQ', icon: CircleHelp, description: 'Accordion questions and answers' },
  { key: 'contact', label: 'Contact', icon: Mail, description: 'Contact details and footer copy' },
]

function Input({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  helperText,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  helperText?: string
}) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>{label}</span>
        {helperText && <span style={{ fontSize: 11, color: '#94A3B8' }}>{helperText}</span>}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 14,
            border: '1px solid #D8E4F2',
            fontSize: 13,
            lineHeight: 1.6,
            background: '#FFFFFF',
            color: '#15314F',
            outline: 'none',
          }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 14,
            border: '1px solid #D8E4F2',
            fontSize: 13,
            background: '#FFFFFF',
            color: '#15314F',
            outline: 'none',
          }}
        />
      )}
    </label>
  )
}

function CardSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section
      style={{
        border: '1px solid #D8E4F2',
        borderRadius: 24,
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)',
        padding: 22,
        display: 'grid',
        gap: 18,
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#15314F', letterSpacing: '-0.03em' }}>{title}</h3>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function PillButton({
  active,
  icon: Icon,
  label,
  description,
  onClick,
}: {
  active: boolean
  icon: typeof Home
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: '1px solid',
        borderColor: active ? '#14315A' : '#D8E4F2',
        background: active ? 'linear-gradient(135deg, #14315A 0%, #1D3E66 100%)' : '#FFFFFF',
        color: active ? '#FFFFFF' : '#15314F',
        borderRadius: 18,
        padding: '12px 14px',
        textAlign: 'left',
        display: 'grid',
        gap: 4,
        cursor: 'pointer',
        boxShadow: active ? '0 14px 30px rgba(20, 49, 90, 0.18)' : '0 4px 10px rgba(15, 23, 42, 0.04)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800 }}>
        <Icon size={15} />
        {label}
      </span>
      <span style={{ fontSize: 11, lineHeight: 1.4, color: active ? 'rgba(255,255,255,0.82)' : '#64748B' }}>{description}</span>
    </button>
  )
}

function ImageCard({
  src,
  alt,
  label,
  onUpload,
  onUrlChange,
}: {
  src: string
  alt: string
  label: string
  onUpload: (file: File) => Promise<void>
  onUrlChange: (value: string) => void
}) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: 150,
          borderRadius: 18,
          border: '1px dashed #C9D9EB',
          background: 'linear-gradient(180deg, #F8FBFF 0%, #EDF4FB 100%)',
          overflow: 'hidden',
        }}
      >
        <img src={src} alt={alt} style={{ width: '100%', height: 132, objectFit: 'contain', padding: 16 }} />
      </div>
      <Input label={label} value={src} onChange={onUrlChange} />
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: 42,
          padding: '0 14px',
          borderRadius: 12,
          border: '1px solid #D8E4F2',
          background: '#FFFFFF',
          color: '#15314F',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        <Upload size={15} /> Upload image
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0]
            if (!file) return
            try {
              await onUpload(file)
            } finally {
              event.target.value = ''
            }
          }}
        />
      </label>
    </div>
  )
}

export function WebsiteContentManager() {
  const [content, setContent] = useState<WebsiteContent>(DEFAULT_WEBSITE_CONTENT)
  const [status, setStatus] = useState<LoadState>('loading')
  const [message, setMessage] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('home')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/admin/website-content', { cache: 'no-store' })
        const data = await res.json()
        if (!active) return
        setContent(mergeWebsiteContent(data.content))
        setLastSavedAt(data.updated_at ?? null)
        setStatus('idle')
      } catch (error) {
        if (!active) return
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Failed to load website content')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function uploadImage(file: File, prefix: string) {
    const form = new FormData()
    form.append('file', file)
    form.append('prefix', prefix)
    const res = await fetch('/api/admin/website-content/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Upload failed')
    return String(data.url ?? '')
  }

  function updateFeature(index: number, patch: Partial<WebsiteContent['features']['cards'][number]>) {
    setContent((current) => ({
      ...current,
      features: {
        cards: current.features.cards.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      },
    }))
  }

  function updateChoose(index: number, patch: Partial<WebsiteContent['choose']['cards'][number]>) {
    setContent((current) => ({
      ...current,
      choose: {
        cards: current.choose.cards.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      },
    }))
  }

  function updateSolution(index: number, patch: Partial<WebsiteContent['solutions'][number]>) {
    setContent((current) => ({
      ...current,
      solutions: current.solutions.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  function updateTestimonial(index: number, patch: Partial<WebsiteContent['testimonials'][number]>) {
    setContent((current) => ({
      ...current,
      testimonials: current.testimonials.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  function updateFaq(index: number, patch: Partial<WebsiteContent['faq'][number]>) {
    setContent((current) => ({
      ...current,
      faq: current.faq.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  async function handleSave() {
    setStatus('saving')
    setMessage('')
    try {
      const res = await fetch('/api/admin/website-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setContent(mergeWebsiteContent(data.content))
      setLastSavedAt(new Date().toISOString())
      setStatus('saved')
      setMessage('Landing page content saved successfully.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Failed to save website content')
    }
  }

  function resetDefaults() {
    setContent(DEFAULT_WEBSITE_CONTENT)
    setMessage('Reset to default content. Save to publish these changes.')
    setStatus('idle')
  }

  const isBusy = status === 'loading' || status === 'saving'
  const activeTabConfig = TABS.find((tab) => tab.key === activeTab) ?? TABS[0]

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div
        style={{
          padding: 22,
          borderRadius: 28,
          background: 'linear-gradient(135deg, #14315A 0%, #1E4B78 100%)',
          color: '#FFFFFF',
          boxShadow: '0 20px 45px rgba(20, 49, 90, 0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
              <Sparkles size={14} /> Website Content Editor
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: '-0.05em' }}>Edit the landing page by section</h1>
            <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 1.6 }}>
              Use the tab bar to jump between Home, Features, Solutions, Pricing, Testimonials, FAQ, and Contact. This keeps the workflow focused and mobile-friendly.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={resetDefaults}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 44,
                padding: '0 16px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.28)',
                background: 'rgba(255,255,255,0.10)',
                color: '#FFFFFF',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isBusy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 44,
                padding: '0 18px',
                borderRadius: 14,
                border: 'none',
                background: '#FFFFFF',
                color: '#14315A',
                fontWeight: 900,
                cursor: 'pointer',
                opacity: isBusy ? 0.8 : 1,
              }}
            >
              <Save size={16} /> {status === 'saving' ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 14,
            background: status === 'error' ? '#FEE2E2' : status === 'saved' ? '#D1FAE5' : '#EFF6FF',
            color: status === 'error' ? '#991B1B' : status === 'saved' ? '#065F46' : '#1D4ED8',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}
      >
        {TABS.map((tab) => (
          <PillButton
            key={tab.key}
            active={activeTab === tab.key}
            icon={tab.icon}
            label={tab.label}
            description={tab.description}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      <div
        style={{
          padding: '16px 18px',
          borderRadius: 20,
          background: '#FFFFFF',
          border: '1px solid #D8E4F2',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active tab</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#15314F', marginTop: 4 }}>{activeTabConfig.label}</div>
        </div>
        <div style={{ fontSize: 13, color: '#64748B', maxWidth: 560, lineHeight: 1.6 }}>
          Every change in this tab affects the public landing page immediately after you save.
        </div>
      </div>

      {activeTab === 'home' && (
        <CardSection title="Home / Hero" subtitle="Branding, hero messaging, call-to-action buttons, and the hero illustration.">
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <Input
                label="Logo alt text"
                value={content.brand.logoAlt}
                onChange={(value) => setContent((current) => ({ ...current, brand: { ...current.brand, logoAlt: value } }))}
              />
              <Input
                label="Hero image alt text"
                value={content.hero.imageAlt}
                onChange={(value) => setContent((current) => ({ ...current, hero: { ...current.hero, imageAlt: value } }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)', gap: 18, alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <Input
                  label="Hero title"
                  value={content.hero.title}
                  onChange={(value) => setContent((current) => ({ ...current, hero: { ...current.hero, title: value } }))}
                  multiline
                />
                <Input
                  label="Hero subtitle"
                  value={content.hero.subtitle}
                  onChange={(value) => setContent((current) => ({ ...current, hero: { ...current.hero, subtitle: value } }))}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <Input
                    label="Primary CTA"
                    value={content.hero.primaryCta}
                    onChange={(value) => setContent((current) => ({ ...current, hero: { ...current.hero, primaryCta: value } }))}
                  />
                  <Input
                    label="Secondary CTA"
                    value={content.hero.secondaryCta}
                    onChange={(value) => setContent((current) => ({ ...current, hero: { ...current.hero, secondaryCta: value } }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <Input
                    label="Logo URL"
                    value={content.brand.logoUrl}
                    onChange={(value) => setContent((current) => ({ ...current, brand: { ...current.brand, logoUrl: value } }))}
                  />
                  <Input
                    label="Hero image URL"
                    value={content.hero.imageUrl}
                    onChange={(value) => setContent((current) => ({ ...current, hero: { ...current.hero, imageUrl: value } }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ padding: 16, borderRadius: 18, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Preview</div>
                  <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, color: '#15314F', lineHeight: 1.3 }}>{content.hero.title}</div>
                  <p style={{ margin: '10px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{content.hero.subtitle}</p>
                </div>
                <ImageCard
                  src={content.hero.imageUrl}
                  alt={content.hero.imageAlt}
                  label="Hero image URL"
                  onUrlChange={(value) => setContent((current) => ({ ...current, hero: { ...current.hero, imageUrl: value } }))}
                  onUpload={async (file) => {
                    const url = await uploadImage(file, 'hero')
                    setContent((current) => ({ ...current, hero: { ...current.hero, imageUrl: url } }))
                  }}
                />
                <ImageCard
                  src={content.brand.logoUrl}
                  alt={content.brand.logoAlt}
                  label="Logo URL"
                  onUrlChange={(value) => setContent((current) => ({ ...current, brand: { ...current.brand, logoUrl: value } }))}
                  onUpload={async (file) => {
                    const url = await uploadImage(file, 'brand')
                    setContent((current) => ({ ...current, brand: { ...current.brand, logoUrl: url } }))
                  }}
                />
              </div>
            </div>
          </div>
        </CardSection>
      )}

      {activeTab === 'features' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <CardSection title="Section Headings" subtitle="Copy for the top feature and why-choose blocks.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <Input label="Features title" value={content.sections.featuresTitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, featuresTitle: value } }))} />
              <Input label="Features subtitle" value={content.sections.featuresSubtitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, featuresSubtitle: value } }))} />
              <Input label="Choose title" value={content.sections.chooseTitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, chooseTitle: value } }))} />
              <Input label="Choose subtitle" value={content.sections.chooseSubtitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, chooseSubtitle: value } }))} />
            </div>
          </CardSection>

          <CardSection title="Feature Cards" subtitle="These cards appear in the Key Features section.">
            <div style={{ display: 'grid', gap: 14 }}>
              {content.features.cards.map((card, index) => (
                <div key={`${card.title}-${index}`} style={{ border: '1px solid #D8E4F2', borderRadius: 18, background: '#FFFFFF', padding: 14, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <Input label={`Feature ${index + 1} title`} value={card.title} onChange={(value) => updateFeature(index, { title: value })} />
                    <Input label={`Feature ${index + 1} copy`} value={card.text} onChange={(value) => updateFeature(index, { text: value })} multiline />
                  </div>
                </div>
              ))}
            </div>
          </CardSection>

          <CardSection title="Why Choose Cards" subtitle="These cards power the “Why Choose Codentra?” block.">
            <div style={{ display: 'grid', gap: 14 }}>
              {content.choose.cards.map((card, index) => (
                <div key={`${card.title}-${index}`} style={{ border: '1px solid #D8E4F2', borderRadius: 18, background: '#FFFFFF', padding: 14, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <Input label={`Reason ${index + 1} title`} value={card.title} onChange={(value) => updateChoose(index, { title: value })} />
                    <Input label={`Reason ${index + 1} copy`} value={card.text} onChange={(value) => updateChoose(index, { text: value })} multiline />
                  </div>
                </div>
              ))}
            </div>
          </CardSection>
        </div>
      )}

      {activeTab === 'solutions' && (
        <CardSection title="Solutions Tiles" subtitle="Upload the exact cropped images and tune the labels shown in the solutions grid.">
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <Input label="Solutions title" value={content.sections.solutionsTitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, solutionsTitle: value } }))} />
              <Input label="Solutions subtitle" value={content.sections.solutionsSubtitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, solutionsSubtitle: value } }))} />
            </div>

            {content.solutions.map((solution, index) => (
              <div key={`${solution.title}-${index}`} style={{ border: '1px solid #D8E4F2', borderRadius: 18, padding: 14, background: '#FFFFFF', display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 14, alignItems: 'start' }}>
                  <Input label={`Tile ${index + 1} title`} value={solution.title} onChange={(value) => updateSolution(index, { title: value })} multiline />
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', placeItems: 'center', minHeight: 140, borderRadius: 18, background: 'linear-gradient(180deg, #F8FBFF 0%, #EDF4FB 100%)', border: '1px dashed #D8E4F2' }}>
                      <img src={solution.imageUrl} alt={solution.alt} style={{ width: 92, height: 92, objectFit: 'contain' }} />
                    </div>
                    <Input label="Image URL" value={solution.imageUrl} onChange={(value) => updateSolution(index, { imageUrl: value })} />
                    <Input label="Alt text" value={solution.alt} onChange={(value) => updateSolution(index, { alt: value })} />
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        height: 42,
                        padding: '0 14px',
                        borderRadius: 12,
                        border: '1px solid #D8E4F2',
                        background: '#FFFFFF',
                        color: '#15314F',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      <Upload size={15} /> Upload image
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (event: ChangeEvent<HTMLInputElement>) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          try {
                            const url = await uploadImage(file, `solutions/${index + 1}`)
                            updateSolution(index, { imageUrl: url })
                          } catch (error) {
                            setMessage(error instanceof Error ? error.message : 'Failed to upload solution image')
                            setStatus('error')
                          } finally {
                            event.target.value = ''
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardSection>
      )}

      {activeTab === 'pricing' && (
        <CardSection title="Pricing" subtitle="The pricing cards are driven by the app’s subscription plans, while this tab controls the section headings.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <Input label="Pricing title" value={content.sections.pricingTitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, pricingTitle: value } }))} />
            <Input label="Pricing subtitle" value={content.sections.pricingSubtitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, pricingSubtitle: value } }))} />
          </div>
          <div style={{ borderRadius: 18, padding: 16, background: '#F8FBFF', border: '1px solid #D8E4F2', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
            If you want the plan names, prices, or feature lists editable too, we can extend this module next. For now, the page copy and layout are cleanly separated from the plan data.
          </div>
        </CardSection>
      )}

      {activeTab === 'testimonials' && (
        <CardSection title="Testimonials" subtitle="Edit the quote, name, role, and initials shown in the social-proof section.">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <Input label="Testimonials title" value={content.sections.testimonialsTitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, testimonialsTitle: value } }))} />
              <Input label="Testimonials subtitle" value={content.sections.testimonialsSubtitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, testimonialsSubtitle: value } }))} />
            </div>
            {content.testimonials.map((testimonial, index) => (
              <div key={`${testimonial.name}-${index}`} style={{ border: '1px solid #D8E4F2', borderRadius: 18, background: '#FFFFFF', padding: 14, display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <Input label="Name" value={testimonial.name} onChange={(value) => updateTestimonial(index, { name: value })} />
                  <Input label="Role" value={testimonial.role} onChange={(value) => updateTestimonial(index, { role: value })} />
                  <Input label="Initials" value={testimonial.initials} onChange={(value) => updateTestimonial(index, { initials: value })} />
                </div>
                <Input label="Quote" value={testimonial.quote} onChange={(value) => updateTestimonial(index, { quote: value })} multiline />
              </div>
            ))}
          </div>
        </CardSection>
      )}

      {activeTab === 'faq' && (
        <CardSection title="FAQ" subtitle="Write short, direct answers for the accordion users see before contacting sales.">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <Input label="FAQ title" value={content.sections.faqTitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, faqTitle: value } }))} />
              <Input label="FAQ subtitle" value={content.sections.faqSubtitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, faqSubtitle: value } }))} />
            </div>
            {content.faq.map((item, index) => (
              <div key={`${item.q}-${index}`} style={{ border: '1px solid #D8E4F2', borderRadius: 18, background: '#FFFFFF', padding: 14, display: 'grid', gap: 12 }}>
                <Input label="Question" value={item.q} onChange={(value) => updateFaq(index, { q: value })} />
                <Input label="Answer" value={item.a} onChange={(value) => updateFaq(index, { a: value })} multiline />
              </div>
            ))}
          </div>
        </CardSection>
      )}

      {activeTab === 'contact' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <CardSection title="Contact Details" subtitle="Email, phone, response time, and the short note shown beside the form.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <Input label="Contact title" value={content.sections.contactTitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, contactTitle: value } }))} />
              <Input label="Contact subtitle" value={content.sections.contactSubtitle} onChange={(value) => setContent((current) => ({ ...current, sections: { ...current.sections, contactSubtitle: value } }))} multiline />
              <Input label="Email" value={content.contact.email} onChange={(value) => setContent((current) => ({ ...current, contact: { ...current.contact, email: value } }))} />
              <Input label="Phone" value={content.contact.phone} onChange={(value) => setContent((current) => ({ ...current, contact: { ...current.contact, phone: value } }))} />
              <Input label="Response time" value={content.contact.responseTime} onChange={(value) => setContent((current) => ({ ...current, contact: { ...current.contact, responseTime: value } }))} />
              <Input label="Contact note" value={content.contact.note} onChange={(value) => setContent((current) => ({ ...current, contact: { ...current.contact, note: value } }))} multiline />
            </div>
          </CardSection>

          <CardSection title="Footer Copy" subtitle="Brand description and tagline shown at the bottom of the landing page.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <Input label="Footer description" value={content.footer.description} onChange={(value) => setContent((current) => ({ ...current, footer: { ...current.footer, description: value } }))} multiline />
              <Input label="Footer tagline" value={content.footer.tagline} onChange={(value) => setContent((current) => ({ ...current, footer: { ...current.footer, tagline: value } }))} />
            </div>
          </CardSection>
        </div>
      )}

      <div style={{ fontSize: 12, color: '#64748B' }}>
        Last saved: {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'not saved yet'}
      </div>
    </div>
  )
}
