export type WebsiteSolutionCard = {
  title: string
  imageUrl: string
  alt: string
}

export type WebsiteTestimonial = {
  name: string
  role: string
  quote: string
  initials: string
}

export type WebsiteFaqItem = {
  q: string
  a: string
}

export type WebsiteTextCard = {
  title: string
  text: string
}

export type WebsiteContent = {
  brand: {
    logoUrl: string
    logoAlt: string
  }
  hero: {
    title: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
    imageUrl: string
    imageAlt: string
  }
  features: {
    cards: WebsiteTextCard[]
  }
  choose: {
    cards: WebsiteTextCard[]
  }
  sections: {
    featuresTitle: string
    featuresSubtitle: string
    chooseTitle: string
    chooseSubtitle: string
    solutionsTitle: string
    solutionsSubtitle: string
    pricingTitle: string
    pricingSubtitle: string
    testimonialsTitle: string
    testimonialsSubtitle: string
    faqTitle: string
    faqSubtitle: string
    contactTitle: string
    contactSubtitle: string
  }
  solutions: WebsiteSolutionCard[]
  testimonials: WebsiteTestimonial[]
  faq: WebsiteFaqItem[]
  contact: {
    email: string
    phone: string
    responseTime: string
    note: string
  }
  footer: {
    description: string
    tagline: string
  }
}

export const DEFAULT_WEBSITE_CONTENT: WebsiteContent = {
  brand: {
    logoUrl: '/images/codentra-removebg-preview.png',
    logoAlt: 'Codentra ERP',
  },
  hero: {
    title: 'Streamline Your Supply Chain with Flexible ERP Solutions. From inventory and POS to production and procurement.',
    subtitle: 'Achieve efficiency, gain real-time insights, and grow with Condentra.',
    primaryCta: 'Start 7-Day Free Trial',
    secondaryCta: 'Book a Demo',
    imageUrl: '/images/codentra hero background image.png',
    imageAlt: 'ERP illustration',
  },
  features: {
    cards: [
      {
        title: 'Inventory Management',
        text: 'Inventory management and stock control for businesses that need one clear view across every location.',
      },
      {
        title: 'Point of Sale (POS)',
        text: 'Seamless transactions for retail, production, and operations teams that need speed at the counter.',
      },
    ],
  },
  choose: {
    cards: [
      {
        title: 'Scalable for Growth',
        text: 'Built to scale as your business expands, with room for more products, more locations, and more users.',
      },
      {
        title: 'Real-Time Reporting',
        text: 'Track sales, stock, and operations instantly so decisions always happen from current data.',
      },
      {
        title: 'User-Friendly Interface',
        text: 'A clean interface that keeps teams moving quickly without a steep learning curve.',
      },
    ],
  },
  sections: {
    featuresTitle: 'Key Features',
    featuresSubtitle: 'Everything your operation needs in one platform.',
    chooseTitle: 'Why Choose Codentra?',
    chooseSubtitle: 'Built for Philippine businesses that demand more.',
    solutionsTitle: 'Comprehensive Solutions',
    solutionsSubtitle: 'End-to-end services that power modern enterprises.',
    pricingTitle: 'Supply Chain Pricing',
    pricingSubtitle: 'Simple, transparent plans that grow with you.',
    testimonialsTitle: 'What Our Clients Say',
    testimonialsSubtitle: 'Trusted by businesses across the Philippines.',
    faqTitle: 'Frequently Asked Questions',
    faqSubtitle: 'Everything you need to know before getting started.',
    contactTitle: 'Get in Touch',
    contactSubtitle: "Have a question or need support? Send us a message and we'll respond within 24 hours.",
  },
  solutions: [
    { title: 'ERP &\nAutomation', imageUrl: '/images/aiautomation.png', alt: 'ERP & Automation icon' },
    { title: 'AI Solutions', imageUrl: '/images/ai%20solutions.png', alt: 'AI Solutions icon' },
    { title: 'Website\nDevelopment', imageUrl: '/images/websitedevelopment.png', alt: 'Website Development icon' },
    { title: 'Business\nConsulting', imageUrl: '/images/consulting.png', alt: 'Business Consulting icon' },
    { title: 'Project\nManagement', imageUrl: '/images/projectmanagement.png', alt: 'Project Management icon' },
  ],
  testimonials: [
    { name: 'Maria L.', role: 'Owner, Sari-Sari Plus', quote: 'Codentra replaced three spreadsheets with one screen. I finally know what sells and what sits. The inventory alerts alone saved us from stockouts during peak season.', initials: 'ML' },
    { name: 'James R.', role: 'Ops Lead, Brew & Co.', quote: 'The production module alone saved us hours a week. Onboarding was shockingly easy, and the support team actually knows Philippine retail.', initials: 'JR' },
    { name: 'Ana C.', role: 'Store Manager, Mart PH', quote: 'Stock alerts caught a near-out-of-stock before lunch. That is the whole point. We expanded from 1 to 5 locations without switching systems.', initials: 'AC' },
    { name: 'Roberto T.', role: 'Owner, RT Manufacturing', quote: 'Recipe costing and finished-goods tracking finally make sense. We cut waste by 18% in the first quarter.', initials: 'RT' },
    { name: 'Grace S.', role: 'Finance, Salud Pharmacy', quote: 'The reports are exactly what I needed - sales, margins, and movement in one place. No more waiting for end-of-month reconciliations.', initials: 'GS' },
    { name: 'Mark D.', role: 'IT Head, Metro Retail Group', quote: 'Multi-branch role-based access gave us control without micromanagement. Deployment across 12 stores took less than a week.', initials: 'MD' },
  ],
  faq: [
    { q: 'What is included in the 7-day free trial?', a: 'Full access to your chosen plan - all features, no restrictions. No card is charged during the trial. If you cancel before day 7, you pay nothing.' },
    { q: 'Can I switch plans later?', a: 'Yes. You can upgrade or downgrade anytime from Settings. Changes take effect immediately with prorated billing.' },
    { q: 'Do you support monthly and yearly billing?', a: 'Yes. Yearly billing saves you ~17% compared to monthly. You can switch between them at any time.' },
    { q: 'Is my data secure?', a: 'Your data is stored on Supabase with enterprise-grade security. Role-based access ensures only authorized team members see sensitive information.' },
    { q: 'What happens if I miss a payment?', a: 'You get a 5-day grace period. We retry automatically every other day. If payment still fails after 5 days, the subscription is suspended - but your data is preserved and you can resume anytime.' },
    { q: 'Do you offer on-site implementation?', a: 'Enterprise plans include on-site training and dedicated account management. Contact us for a custom quote.' },
    { q: 'Can I import my existing inventory data?', a: 'Yes. We support CSV imports for products, suppliers, and stock levels. Our team can assist with migration during onboarding.' },
    { q: 'What is your refund policy?', a: 'We offer a 14-day money-back guarantee from your first charge. No questions asked.' },
  ],
  contact: {
    email: 'hello@condentrasystem.com',
    phone: '+63XXXXXXXXX',
    responseTime: 'within 24 hours',
    note: 'Submit the form and our team will reach out within 24 hours to schedule your personalized demo at a time that works for you.',
  },
  footer: {
    description: 'Supply chain, inventory, and POS - simplified for Philippine businesses.',
    tagline: 'Systems with Integrity',
  },
}

export function mergeWebsiteContent(input: Partial<WebsiteContent> | null | undefined): WebsiteContent {
  return {
    brand: { ...DEFAULT_WEBSITE_CONTENT.brand, ...(input?.brand ?? {}) },
    hero: { ...DEFAULT_WEBSITE_CONTENT.hero, ...(input?.hero ?? {}) },
    features: { cards: Array.isArray(input?.features?.cards) && input.features.cards.length ? input.features.cards : DEFAULT_WEBSITE_CONTENT.features.cards },
    choose: { cards: Array.isArray(input?.choose?.cards) && input.choose.cards.length ? input.choose.cards : DEFAULT_WEBSITE_CONTENT.choose.cards },
    sections: { ...DEFAULT_WEBSITE_CONTENT.sections, ...(input?.sections ?? {}) },
    solutions: Array.isArray(input?.solutions) && input.solutions.length ? input.solutions : DEFAULT_WEBSITE_CONTENT.solutions,
    testimonials: Array.isArray(input?.testimonials) && input.testimonials.length ? input.testimonials : DEFAULT_WEBSITE_CONTENT.testimonials,
    faq: Array.isArray(input?.faq) && input.faq.length ? input.faq : DEFAULT_WEBSITE_CONTENT.faq,
    contact: { ...DEFAULT_WEBSITE_CONTENT.contact, ...(input?.contact ?? {}) },
    footer: { ...DEFAULT_WEBSITE_CONTENT.footer, ...(input?.footer ?? {}) },
  }
}
