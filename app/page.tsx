'use client'

import { useState, type FormEvent, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  CalendarDays,
  Check,
  LayoutPanelTop,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  Package,
  Phone,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Truck,
  Wallet,
  X,
  } from 'lucide-react'
import { SUBSCRIPTION_PLANS, formatPlanPrice } from '@/lib/subscription-plans'
import { BookDemoModal } from '@/components/landing/BookDemoModal'
import type { BillingInterval } from '@/types/database'
import { DEFAULT_WEBSITE_CONTENT, mergeWebsiteContent, type WebsiteContent } from '@/lib/website-content'

const NAV = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

const planFeatures: Record<string, string[]> = {
  starter: ['3 users', '100 products', '1 location', 'Basic inventory & POS', 'Email support', '7-day free trial'],
  professional: ['10 users', '1,000 products', '5 locations', 'Full inventory & POS', 'Purchasing module', 'Production & recipes', 'Reports & analytics', 'Priority support', '7-day free trial'],
  enterprise: ['Unlimited users', '9,999 products', '99 locations', 'Everything in Professional', 'Custom integrations', 'Dedicated account manager', 'SLA & uptime priority', 'On-site training available', '7-day free trial'],
}

const footerColumns = [
  { title: 'Product', items: ['Inventory', 'Sales', 'POS', 'Purchasing', 'Production'] },
  { title: 'Company', items: ['About Us', 'Careers', 'Blog', 'Codeoethi'] },
  { title: 'Resources', items: ['Documentation', 'Help Center', 'API Reference', 'System Status'] },
  { title: 'Legal', items: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
]

function AnimatedText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let i = 0
    setDisplayed('')
    setShowCursor(true)

    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }

    const type = () => {
      i++
      setDisplayed(text.slice(0, i))
      if (i < text.length) {
        timerRef.current = setTimeout(type, 60)
      } else {
        timerRef.current = setTimeout(() => setShowCursor(false), 2500)
        timerRef.current = setTimeout(() => {
          setShowCursor(true)
          i = 0
          setDisplayed('')
          timerRef.current = setTimeout(type, 400)
        }, 3000)
      }
    }

    timerRef.current = setTimeout(type, 400)
    return clear
  }, [text])

  return (
    <span style={{ display: 'inline' }}>
      {displayed}
      {showCursor && (
        <span style={{ display: 'inline-block', width: '3px', height: '0.85em', background: '#fff', marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'blink 0.7s steps(1) infinite' }} />
      )}
    </span>
  )
}

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export default function LandingPage() {
  useScrollReveal()
  const [contactOpen, setContactOpen] = useState(false)
  const [bookDemoOpen, setBookDemoOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [interval, setInterval] = useState<BillingInterval>('month')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [landingContent, setLandingContent] = useState<WebsiteContent>(DEFAULT_WEBSITE_CONTENT)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/website-content', { cache: 'no-store' })
        const data = await res.json()
        if (!active) return
        setLandingContent(mergeWebsiteContent(data.content))
      } catch {
        if (!active) return
        setLandingContent(DEFAULT_WEBSITE_CONTENT)
      }
    })()
    return () => { active = false }
  }, [])

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormSubmitting(true)
    setFormStatus(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const data = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      company: String(formData.get('company') ?? ''),
      business_type: String(formData.get('business_type') ?? ''),
      locations: String(formData.get('locations') ?? ''),
      message: String(formData.get('message') ?? ''),
      category: String(formData.get('category') ?? 'general'),
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save submission')
      setFormStatus({ type: 'success', text: 'Message sent! We\'ll get back to you within 24 hours.' })
      form.reset()
    } catch {
      setFormStatus({ type: 'error', text: 'Something went wrong. Please try again or email us directly.' })
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <main className="landing-page" style={{ minHeight: '100vh', background: '#ffffff', color: '#15314F' }}>
      {/* ===== HERO ===== */}
      <header
        className="landing-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: '#ffffff',
          borderBottom: '1px solid #E5EEF8',
        }}
      >
        <div
          className="landing-header-inner"
          style={{
            maxWidth: 1458,
            margin: '0 auto',
            padding: '0 18px',
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            position: 'relative',
          }}
        >
          <Link href="/" className="landing-brand" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src={landingContent.brand.logoUrl}
              alt={landingContent.brand.logoAlt}
              style={{ height: 27, width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </Link>

          <nav className={`landing-nav ${mobileNavOpen ? 'landing-nav--open' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className="landing-nav-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: '#1F2F44',
                  fontSize: 11,
                  fontWeight: 500,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="landing-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              href="/sign-in"
              onClick={() => setMobileNavOpen(false)}
              className="landing-header-ghost"
              style={{
                height: 22,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 12px',
                borderRadius: 999,
                border: '1px solid #1D3E66',
                color: '#1D3E66',
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 700,
                background: '#ffffff',
              }}
            >
              Sign in
            </Link>
            <button
              onClick={() => {
                setBookDemoOpen(true)
                setMobileNavOpen(false)
              }}
              className="landing-header-ghost"
              style={{
                height: 22,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 12px',
                borderRadius: 999,
                border: '1px solid #1D3E66',
                color: '#1D3E66',
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 700,
                background: '#ffffff',
              }}
            >
              {landingContent.hero.secondaryCta}
            </button>
            <Link
              href="/sign-up?plan=professional&interval=month"
              onClick={() => setMobileNavOpen(false)}
              className="landing-header-primary"
              style={{
                height: 22,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 12px',
                borderRadius: 999,
                border: '1px solid #1D3E66',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 700,
                background: '#1D3E66',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
              >
              {landingContent.hero.primaryCta}
            </Link>
          </div>

          <button
            type="button"
            className="landing-menu-button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((value) => !value)}
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 12,
              border: '1px solid #D6DEE8',
              background: '#ffffff',
              color: '#14315A',
              cursor: 'pointer',
            }}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {mobileNavOpen && (
            <div className="landing-mobile-menu" style={{ display: 'grid' }}>
              <div style={{ display: 'grid', gap: 10 }}>
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#F8FBFF',
                      textDecoration: 'none',
                      color: '#15314F',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                <Link href="/sign-in" onClick={() => setMobileNavOpen(false)} style={{ ...{ textDecoration: 'none' } }} className="landing-mobile-action landing-mobile-action--ghost">
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setBookDemoOpen(true)
                    setMobileNavOpen(false)
                  }}
                  className="landing-mobile-action landing-mobile-action--ghost"
                  style={{ border: '1px solid #D6DEE8', background: '#fff', cursor: 'pointer' }}
                >
                  {landingContent.hero.secondaryCta}
                </button>
                <Link
                  href="/sign-up?plan=professional&interval=month"
                  onClick={() => setMobileNavOpen(false)}
                  className="landing-mobile-action landing-mobile-action--primary"
                  style={{ textDecoration: 'none' }}
                >
                  {landingContent.hero.primaryCta}
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section
        id="home"
        className="landing-hero"
        style={{
          position: 'relative',
          minHeight: 600,
          padding: '60px 50px 56px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #14315A 0%, #173B6B 38%, #0F2C53 100%)',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 72% 38%, rgba(255,255,255,0.12), transparent 24%), radial-gradient(circle at 84% 18%, rgba(93,150,212,0.30), transparent 11%), radial-gradient(circle at 76% 82%, rgba(255,255,255,0.06), transparent 16%)',
            pointerEvents: 'none',
          }}
        />

        <div className="landing-hero-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center', maxWidth: 1458, margin: '0 auto' }}>
          <div className="landing-hero-copy" style={{ paddingTop: 6, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 400 }}>
            <div>
              <h1
                style={{
                  fontSize: 'clamp(2rem, 4.4vw, 3.18rem)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.05em',
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                <AnimatedText text={landingContent.hero.title} />
              </h1>
              <p
                style={{
                  marginTop: 20,
                  maxWidth: 480,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.82)',
                }}
              >
                {landingContent.hero.subtitle}
              </p>
            </div>

            <div className="landing-hero-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href="/sign-up?plan=professional&interval=month"
                style={{
                  height: 36,
                  padding: '0 24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  border: '1px solid #ffffff',
                  background: '#ffffff',
                  color: '#102944',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.16)',
                }}
              >
                {landingContent.hero.primaryCta}
              </Link>
              <button
                onClick={() => setBookDemoOpen(true)}
                style={{
                  height: 36,
                  padding: '0 24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.45)',
                  background: 'transparent',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {landingContent.hero.secondaryCta}
              </button>
            </div>
          </div>

          <div className="landing-hero-visual" style={{ position: 'relative', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={landingContent.hero.imageUrl}
              alt={landingContent.hero.imageAlt}
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: 500,
                objectFit: 'contain',
                objectPosition: 'right center',
                transform: 'translateX(8px)',
              }}
            />
          </div>
        </div>
      </section>

      {/* ===== KEY FEATURES SECTION ===== */}
      <section
        id="features"
        data-reveal
        className="landing-section"
        style={{
          width: '100%',
          padding: '80px 50px',
          background: 'linear-gradient(180deg, #F6FAFF 0%, #EEF4FA 100%)',
          borderTop: '1px solid #E4ECF4',
        }}
      >
        <div className="landing-section-inner" style={{ maxWidth: 1458, margin: '0 auto' }}>
          <h2 style={{ margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>{landingContent.sections.featuresTitle}</h2>
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 15, marginTop: 10 }}>{landingContent.sections.featuresSubtitle}</p>
          <div className="landing-grid landing-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, marginTop: 40 }}>
            {landingContent.features.cards.map((card, index) => (
              <article key={card.title} style={{ textAlign: 'center', padding: '24px 20px 28px' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px', display: 'grid', placeItems: 'center', color: '#1A3555', background: '#EFF6FF' }}>
                  {index === 0 ? <Package size={38} strokeWidth={1.6} /> : <LayoutPanelTop size={38} strokeWidth={1.6} />}
                </div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{card.title}</h3>
                <p style={{ margin: '12px auto 0', maxWidth: 420, fontSize: 13, lineHeight: 1.6, color: '#1E2F41' }}>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE SECTION ===== */}
      <section
        data-reveal
        className="landing-section"
        style={{
          width: '100%',
          padding: '80px 50px',
          background: '#ffffff',
        }}
      >
        <div className="landing-section-inner" style={{ maxWidth: 1458, margin: '0 auto' }}>
          <h2 style={{ margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>{landingContent.sections.chooseTitle}</h2>
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 15, marginTop: 10 }}>{landingContent.sections.chooseSubtitle}</p>
          <div className="landing-grid landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20, marginTop: 40 }}>
            {landingContent.choose.cards.map((card, index) => (
              <article
                key={card.title}
                style={{
                  minHeight: 280,
                  borderRadius: 12,
                  border: '1px solid #D6DEE8',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
                  padding: '24px 20px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                {index === 0 ? <BarChart3 size={40} strokeWidth={1.8} /> : index === 1 ? <MonitorSmartphone size={40} strokeWidth={1.8} /> : <Search size={40} strokeWidth={1.8} />}
                <h3 style={{ margin: '16px 0 0', fontSize: 16, fontWeight: 800 }}>{card.title}</h3>
                <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: '#263A4D' }}>{card.text}</p>
                <div
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    minHeight: 110,
                    borderRadius: 8,
                    background:
                      index === 0
                        ? 'linear-gradient(180deg, #F8FBFF 0%, #EDF4FF 100%)'
                        : index === 1
                          ? 'linear-gradient(180deg, #F7FAFF 0%, #F1F5FB 100%)'
                          : 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
                    border: '1px solid #E6EDF5',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 16,
                      right: 16,
                      bottom: 16,
                      height: 50,
                      borderRadius: 6,
                      background:
                        index === 0
                          ? 'linear-gradient(135deg, rgba(29,62,102,0.12), rgba(29,62,102,0.04))'
                          : index === 1
                            ? 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))'
                            : 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
                    }}
                  />
                  {index === 0 ? <div style={{ position: 'absolute', left: 20, bottom: 22, width: 80, height: 36, borderRadius: 6, background: '#14315A' }} /> : null}
                  {index === 1 ? <div style={{ position: 'absolute', left: 24, bottom: 24, width: 32, height: 32, borderRadius: '50%', border: '4px solid #1D3E66' }} /> : null}
                  {index === 2 ? <div style={{ position: 'absolute', left: 28, bottom: 22, width: 100, height: 30, borderRadius: 999, background: '#1D3E66' }} /> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMPREHENSIVE SOLUTIONS SECTION ===== */}
      <section
        id="solutions"
        data-reveal
        className="landing-section"
        style={{
          width: '100%',
          padding: '80px 50px',
          background: 'linear-gradient(180deg, #F6FAFF 0%, #EEF4FA 100%)',
        }}
      >
        <div className="landing-section-inner" style={{ maxWidth: 1458, margin: '0 auto' }}>
          <h2 style={{ margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>{landingContent.sections.solutionsTitle}</h2>
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 15, marginTop: 10 }}>{landingContent.sections.solutionsSubtitle}</p>
          <div className="landing-grid landing-grid-5 landing-solutions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 24, marginTop: 48, alignItems: 'start' }}>
            {landingContent.solutions.map((card) => (
              <div key={card.title} style={{ textAlign: 'center', color: '#17314D', display: 'grid', justifyItems: 'center', gap: 12 }}>
                <img
                  src={card.imageUrl}
                  alt={card.alt}
                  width={56}
                  height={56}
                  style={{ display: 'block', width: 56, height: 56, objectFit: 'contain' }}
                />
                <div style={{ fontSize: 13, lineHeight: 1.3, whiteSpace: 'pre-line', fontWeight: 700 }}>{card.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section
        id="pricing"
        data-reveal
        className="landing-section"
        style={{
          width: '100%',
          padding: '80px 50px',
          background: '#ffffff',
        }}
      >
        <div className="landing-section-inner" style={{ maxWidth: 1458, margin: '0 auto' }}>
          <h2 style={{ margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>Supply Chain Pricing</h2>
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 15, marginTop: 10 }}>Simple, transparent plans that grow with you.</p>

          <div className="landing-grid landing-grid-3 landing-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20, marginTop: 40, alignItems: 'stretch' }}>
            {SUBSCRIPTION_PLANS.map((plan) => {
              const price = interval === 'year' ? plan.yearly : plan.monthly
              const features = planFeatures[plan.plan] ?? []
              return (
                <article
                  key={plan.plan}
                  style={{
                    position: 'relative',
                    borderRadius: plan.highlight ? 14 : 12,
                    border: plan.highlight ? '2px solid #14315A' : '1px solid #D6DEE8',
                    background: '#ffffff',
                    padding: plan.highlight ? '28px 24px 24px' : '24px 20px 24px',
                    boxShadow: plan.highlight ? '0 2px 0 rgba(20,49,90,0.18)' : '0 1px 2px rgba(15,23,42,0.05)',
                    minHeight: 420,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {plan.highlight && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: -1,
                        height: 24,
                        background: '#14315A',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'grid',
                        placeItems: 'center',
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                      }}
                    >
                      {plan.highlight}
                    </div>
                  )}

                  <div style={{ textAlign: 'center', paddingTop: plan.highlight ? 14 : 0 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{plan.name}</h3>
                    <div style={{ marginTop: 8, fontSize: 36, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.04em' }}>
                      {formatPlanPrice(price)}
                      <span style={{ fontSize: 16, fontWeight: 700 }}>/{interval === 'year' ? 'yr' : 'mo'}</span>
                    </div>
                    <p style={{ marginTop: 8, fontSize: 12, color: '#4B5E73' }}>{plan.description}</p>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'grid', gap: 10, fontSize: 13, color: '#1E2F41', flex: 1 }}>
                    {features.map((feature) => (
                      <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Check size={14} strokeWidth={3} color="#152F4E" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/sign-up?plan=${plan.plan}&interval=${interval}`}
                    style={{
                      marginTop: 20,
                      height: 36,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#14315A',
                    }}
                  >
                    Start free trial
                  </Link>
                </article>
              )
            })}
          </div>

          <div className="landing-pricing-toggle-wrap" style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <div style={{ display: 'inline-flex', background: '#fff', borderRadius: 999, padding: 4, border: '1px solid #D6DEE8' }}>
              {(['month', 'year'] as BillingInterval[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setInterval(opt)}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 22px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                    background: interval === opt ? '#14315A' : 'transparent',
                    color: interval === opt ? '#ffffff' : '#4B5E73',
                  }}
                >
                  {opt === 'month' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS SECTION ===== */}
      <section
        id="testimonials"
        data-reveal
        className="landing-section"
        style={{
          width: '100%',
          padding: '80px 50px',
          background: 'linear-gradient(180deg, #F6FAFF 0%, #EEF4FA 100%)',
        }}
      >
        <div className="landing-section-inner" style={{ maxWidth: 1458, margin: '0 auto' }}>
          <h2 style={{ margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>{landingContent.sections.testimonialsTitle}</h2>
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 15, marginTop: 10 }}>{landingContent.sections.testimonialsSubtitle}</p>
          <div className="landing-grid landing-grid-testimonials" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 48 }}>
            {landingContent.testimonials.map((t) => (
              <div key={t.name} style={{ padding: 28, borderRadius: 14, border: '1px solid #E4ECF4', background: '#ffffff', boxShadow: '0 1px 2px rgba(16,24,40,0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 2, color: '#F59E0B' }}>
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill="#F59E0B" />)}
                </div>
                <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.7, flex: 1 }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EFF6FF', color: '#1A4D81', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#15314F' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section
        id="faq"
        data-reveal
        className="landing-section"
        style={{
          width: '100%',
          padding: '80px 50px',
          background: '#ffffff',
        }}
      >
        <div className="landing-section-inner" style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>{landingContent.sections.faqTitle}</h2>
          <p style={{ textAlign: 'center', color: '#475569', fontSize: 15, marginTop: 10, marginBottom: 40 }}>{landingContent.sections.faqSubtitle}</p>
          <div style={{ display: 'grid', gap: 12 }}>
            {landingContent.faq.map((item) => (
              <details
                key={item.q}
                style={{
                  borderRadius: 12,
                  border: '1px solid #E4ECF4',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
                  overflow: 'hidden',
                }}
              >
                <summary
                  style={{
                    padding: '18px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#15314F',
                    cursor: 'pointer',
                    listStyle: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span>{item.q}</span>
                  <span style={{ color: '#64748B', fontSize: 12, flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ padding: '0 20px 18px', fontSize: 13, color: '#475569', lineHeight: 1.7, borderTop: '1px solid #F1F5F9' }}>
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BOOK A DEMO / REQUEST A DEMO SECTION ===== */}
      <section
        id="contact"
        data-reveal
        className="landing-section"
        style={{
          width: '100%',
          padding: '80px 50px',
          background: 'linear-gradient(135deg, #14315A 0%, #1D3E66 100%)',
          color: '#ffffff',
        }}
      >
        <div className="landing-section-inner" style={{ maxWidth: 1458, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', fontSize: 12, fontWeight: 800, marginBottom: 12, border: '1px solid rgba(255,255,255,0.18)' }}>
              <Mail size={14} /> Contact Us
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em' }}>{landingContent.sections.contactTitle}</h2>
            <p style={{ color: '#CBD5E1', fontSize: 15, margin: 0 }}>{landingContent.sections.contactSubtitle}</p>
          </div>

          <div className="landing-contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 40, alignItems: 'start' }}>
            <form className="landing-contact-form" onSubmit={handleContactSubmit} style={{ display: 'grid', gap: 14 }}>
              <div className="landing-form-grid landing-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input name="name" required placeholder="Your full name *" style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff' }} />
                <input name="email" type="email" required placeholder="Email address *" style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff' }} />
              </div>
              <div className="landing-form-grid landing-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input name="company" placeholder="Company name" style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff' }} />
                <input name="phone" placeholder="Phone number" style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff' }} />
              </div>
              <input name="subject" placeholder="Subject" style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff' }} />
              <textarea name="message" required placeholder="How can we help you?" rows={4} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#fff', resize: 'vertical' }} />
              <button type="submit" disabled={formSubmitting} style={{ height: 44, borderRadius: 10, border: 'none', background: '#ffffff', color: '#102944', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                {formSubmitting ? 'Sending...' : 'Send Message'}
              </button>
              {formStatus && (
                <p style={{ fontSize: 12, color: formStatus.type === 'success' ? '#6EE7B7' : '#FCA5A5', margin: 0 }}>{formStatus.text}</p>
              )}
            </form>

            <div style={{ display: 'grid', gap: 24, alignContent: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CBD5E1', marginBottom: 8 }}>Email</div>
                <a href={`mailto:${landingContent.contact.email}`} style={{ color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 600 }}>{landingContent.contact.email}</a>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CBD5E1', marginBottom: 8 }}>Phone</div>
                <a href={`tel:${landingContent.contact.phone}`} style={{ color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 600 }}>{landingContent.contact.phone}</a>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#fff' }}>What happens next?</div>
                <p style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>{landingContent.contact.note}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer
        data-reveal
        className="landing-footer"
        style={{
          background: '#0F172A',
          color: '#ffffff',
          padding: '64px 50px 24px',
        }}
      >
        <div className="landing-section-inner" style={{ maxWidth: 1458, margin: '0 auto' }}>
          <div className="landing-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, alignItems: 'start', marginBottom: 40 }}>
            <div className="landing-footer-brand" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <img src={landingContent.brand.logoUrl} alt={landingContent.brand.logoAlt} style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, maxWidth: 280 }}>
                {landingContent.footer.description}
              </p>
            </div>
            {footerColumns.map((column) => (
              <div key={column.title}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{column.title}</div>
                <div style={{ display: 'grid', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>
                  {column.items.map((item) => (
                    <span key={item} style={{ cursor: 'pointer' }}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: 11, color: 'rgba(255,255,255,0.72)', flexWrap: 'wrap' }}>
            <span>© {new Date().getFullYear()} Condentra ERP. All rights reserved.</span>
            <span>{landingContent.footer.tagline}</span>
          </div>
        </div>
      </footer>

      {/* ===== FLOATING CONTACT WIDGET ===== */}
      <div className="landing-fab" style={{ position: 'fixed', right: 16, bottom: 18, zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        {contactOpen && (
          <div className="landing-fab-menu" style={{ display: 'grid', gap: 6 }}>
            {[
              { label: 'Chat with Sales', icon: MessageCircle, href: 'https://m.me/condentrasystem', prefill: "Hi! I'm interested in Codentra ERP. I'd like to request a demo." },
              { label: 'Book a Demo', icon: CalendarDays, action: 'demo' },
              { label: 'Call Us', icon: Phone, href: `tel:${landingContent.contact.phone}` },
              { label: 'Email Us', icon: Mail, href: `mailto:${landingContent.contact.email}` },
            ].map((item) => {
              if ((item as any).action === 'demo') {
                return (
                  <button
                    key={item.label}
                    onClick={() => { setBookDemoOpen(true); setContactOpen(false) }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      height: 32,
                      padding: '0 16px 0 14px',
                      borderRadius: 999,
                      background: '#1D4A78',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        background: '#F7FBFF',
                        color: '#1D4A78',
                        flexShrink: 0,
                      }}
                    >
                      <item.icon size={12} />
                    </span>
                    {item.label}
                  </button>
                )
              }

              const isMessenger = item.label === 'Chat with Sales'
              const finalHref = isMessenger ? `${item.href}?text=${encodeURIComponent(item.prefill ?? '')}` : item.href
              return (
                <a
                  key={item.label}
                  href={finalHref}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 32,
                    padding: '0 16px 0 14px',
                    borderRadius: 999,
                    background: '#1D4A78',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      background: '#F7FBFF',
                      color: '#1D4A78',
                      flexShrink: 0,
                    }}
                  >
                    <item.icon size={12} />
                  </span>
                  {item.label}
                </a>
              )
            })}
          </div>
        )}

        <button
          type="button"
          aria-label="Toggle contact options"
          onClick={() => setContactOpen((value) => !value)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: '#1D3E66',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
            cursor: 'pointer',
          }}
        >
          {contactOpen ? <X size={16} /> : <MessageCircle size={16} />}
        </button>
      </div>

      <BookDemoModal open={bookDemoOpen} onClose={() => setBookDemoOpen(false)} />
    </main>
  )
}



