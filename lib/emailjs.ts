// EmailJS configuration
// Get these from https://www.emailjs.com/
// 1. Create an account
// 2. Add an email service (Gmail, Outlook, etc.)
// 3. Create an email template
// 4. Copy the Service ID, Template ID, and Public Key here

export const EMAILJS_CONFIG = {
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
  templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '',
}

export function isEmailJSConfigured(): boolean {
  return Boolean(EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId && EMAILJS_CONFIG.publicKey)
}

export const EMAILJS_CONTACT_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE_ID || EMAILJS_CONFIG.templateId

export const EMAILJS_DEMO_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_DEMO_TEMPLATE_ID || EMAILJS_CONFIG.templateId

let emailjsLoader: Promise<boolean> | null = null

export function ensureEmailJSScriptLoaded(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if ((window as typeof window & { emailjs?: unknown }).emailjs) return Promise.resolve(true)

  if (!emailjsLoader) {
    emailjsLoader = new Promise<boolean>((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-emailjs="true"]')
      if (existing) {
        existing.addEventListener('load', () => resolve(true), { once: true })
        existing.addEventListener('error', () => resolve(false), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/emailjs.min.js'
      script.async = true
      script.dataset.emailjs = 'true'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  return emailjsLoader
}

export async function sendEmailJS(templateId: string, templateParams: Record<string, string>) {
  if (!isEmailJSConfigured() || !templateId) return false
  const loaded = await ensureEmailJSScriptLoaded()
  if (!loaded || typeof window === 'undefined') return false

  const emailjs = (window as typeof window & {
    emailjs?: { send: (...args: unknown[]) => Promise<unknown> }
  }).emailjs

  if (!emailjs) return false

  await emailjs.send(
    EMAILJS_CONFIG.serviceId,
    templateId,
    templateParams,
    EMAILJS_CONFIG.publicKey
  )

  return true
}
