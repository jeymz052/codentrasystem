'use client'

import { useState, type FormEvent, useEffect } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { EMAILJS_CONFIG, isEmailJSConfigured } from '@/lib/emailjs'

type Props = {
  open: boolean
  onClose: () => void
}

export function BookDemoModal({ open, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!open) return
    if (!isEmailJSConfigured()) return
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/emailjs.min.js'
    script.async = true
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setStatus(null)

    const form = event.currentTarget
    const data = new FormData(form)
    const preferredDate = String(data.get('preferred_date') ?? '')
    const preferredTime = String(data.get('preferred_time') ?? '')
    const payload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      company: String(data.get('company') ?? ''),
      business_type: String(data.get('business_type') ?? ''),
      locations: String(data.get('locations') ?? ''),
      message: String(data.get('message') ?? ''),
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || null,
      category: 'demo',
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')

      if (isEmailJSConfigured() && typeof window !== 'undefined' && (window as any).emailjs) {
        try {
          await (window as any).emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            {
              from_name: payload.name,
              from_email: payload.email,
              phone: payload.phone || 'N/A',
              company: payload.company || 'N/A',
              business_type: payload.business_type || 'N/A',
              locations: payload.locations || 'N/A',
              preferred_date: payload.preferred_date || 'Not specified',
              preferred_time: payload.preferred_time || 'Not specified',
              message: payload.message,
              category: payload.category,
            },
            EMAILJS_CONFIG.publicKey
          )
        } catch {
          // best-effort
        }
      }

      setStatus({ type: 'success', text: 'Demo request sent! We\'ll reach out within 24 hours.' })
      form.reset()
      setTimeout(onClose, 1800)
    } catch {
      setStatus({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="landing-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="landing-demo-modal" style={{ position: 'relative', background: '#fff', borderRadius: 20, padding: '32px 28px', maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: '#EFF6FF', color: '#1A3555', fontSize: 12, fontWeight: 800, border: '1px solid #DBEAFE', marginBottom: 8 }}>
              <CalendarDays size={14} /> Book a Demo
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#15314F' }}>Request a personalized demo</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 0, marginBottom: 20, lineHeight: 1.6 }}>
          Tell us a bit about your business and we'll schedule a walkthrough tailored to your operations.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <div className="landing-form-grid landing-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input name="name" required placeholder="Your full name *" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D6DEE8', fontSize: 13, background: '#fff', color: '#15314F' }} />
            <input name="email" type="email" required placeholder="Email address *" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D6DEE8', fontSize: 13, background: '#fff', color: '#15314F' }} />
          </div>
          <div className="landing-form-grid landing-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input name="company" placeholder="Company name" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D6DEE8', fontSize: 13, background: '#fff', color: '#15314F' }} />
            <input name="phone" placeholder="Phone number" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D6DEE8', fontSize: 13, background: '#fff', color: '#15314F' }} />
          </div>
          <div className="landing-form-grid landing-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <select name="business_type" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D6DEE8', fontSize: 13, background: '#fff', color: '#15314F' }}>
              <option value="">Business type</option>
              <option value="retail">Retail / Sari-Sari</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="f&b">Food & Beverage</option>
              <option value="pharmacy">Pharmacy / Healthcare</option>
              <option value="other">Other</option>
            </select>
            <input name="locations" placeholder="Number of locations" type="number" min="1" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D6DEE8', fontSize: 13, background: '#fff', color: '#15314F' }} />
          </div>
          <div className="landing-form-grid landing-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Preferred date</label>
              <input name="preferred_date" type="date" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D6DEE8', fontSize: 13, background: '#fff', color: '#15314F', width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Preferred time</label>
              <input name="preferred_time" type="time" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D6DEE8', fontSize: 13, background: '#fff', color: '#15314F', width: '100%' }} />
            </div>
          </div>
          <textarea name="message" required placeholder="What are you looking for? (modules, locations, timeline...)" rows={3} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D6DEE8', fontSize: 13, background: '#fff', color: '#15314F', resize: 'vertical' }} />
          <button type="submit" disabled={submitting} style={{ height: 40, borderRadius: 10, border: 'none', background: '#14315A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {submitting ? 'Sending...' : 'Request Demo'}
          </button>
          {status && <p style={{ fontSize: 12, color: status.type === 'success' ? '#047857' : '#B91C1C', margin: 0 }}>{status.text}</p>}
        </form>
      </div>
    </div>
  )
}
