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
