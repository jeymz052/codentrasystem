import crypto from 'crypto'

type PayMongoAttributes = Record<string, any>

type PayMongoResource = {
  id: string
  type: string
  attributes: PayMongoAttributes
}

type PayMongoEnvelope<T extends PayMongoResource = PayMongoResource> = {
  data: T
}

function getPayMongoKey(name: 'PAYMONGO_SECRET_KEY' | 'PAYMONGO_PUBLIC_KEY') {
  const key = process.env[name]
  if (!key) {
    throw new Error(`${name} is not configured`)
  }
  return key
}

function basicAuth(key: string) {
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`
}

function timingSafeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

function toPayMongoAmount(amount: number) {
  return Math.round(Number(amount) * 100)
}

function fromPayMongoAmount(amount: number) {
  return Number((Number(amount) / 100).toFixed(2))
}

async function paymongoRequest<T>(path: string, init: RequestInit, keyName: 'PAYMONGO_SECRET_KEY' | 'PAYMONGO_PUBLIC_KEY' = 'PAYMONGO_SECRET_KEY') {
  const baseUrl = 'https://api.paymongo.com/v1'
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: basicAuth(getPayMongoKey(keyName)),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  const text = await response.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }

  if (!response.ok) {
    const message = typeof parsed === 'object' && parsed && 'errors' in parsed
      ? JSON.stringify((parsed as { errors?: unknown }).errors)
      : typeof parsed === 'string'
        ? parsed
        : `PayMongo request failed with status ${response.status}`
    throw new Error(message)
  }

  return parsed as T
}

export async function createQrPhPaymentIntent(input: {
  amount: number
  description: string
  reference?: string
  metadata?: Record<string, string>
  customerEmail?: string
}) {
  const intent = await paymongoRequest<PayMongoEnvelope>('/payment_intents', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          amount: toPayMongoAmount(input.amount),
          currency: 'PHP',
          payment_method_allowed: ['qrph'],
          description: input.description,
          metadata: {
            ...(input.metadata ?? {}),
            reference: input.reference ?? undefined,
            customer_email: input.customerEmail ?? undefined,
          },
        },
      },
    }),
  })

  const clientKey = String(intent.data.attributes.client_key ?? '')

  const paymentMethod = await paymongoRequest<PayMongoEnvelope>('/payment_methods', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          type: 'qrph',
        },
      },
    }),
  }, 'PAYMONGO_PUBLIC_KEY')

  const attached = await paymongoRequest<PayMongoEnvelope>(`/payment_intents/${intent.data.id}/attach`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          payment_method: paymentMethod.data.id,
          client_key: clientKey,
        },
      },
    }),
  }, 'PAYMONGO_PUBLIC_KEY')

  return {
    id: attached.data.id,
    clientKey,
    status: String(attached.data.attributes.status ?? 'pending'),
    amount: fromPayMongoAmount(Number(attached.data.attributes.amount ?? toPayMongoAmount(input.amount))),
    currency: String(attached.data.attributes.currency ?? 'PHP'),
    nextAction: attached.data.attributes.next_action ?? null,
    raw: attached,
  }
}

export async function getPaymentIntent(intentId: string) {
  const intent = await paymongoRequest<PayMongoEnvelope>(`/payment_intents/${intentId}`, {
    method: 'GET',
  })

  return {
    id: intent.data.id,
    status: String(intent.data.attributes.status ?? 'pending'),
    amount: fromPayMongoAmount(Number(intent.data.attributes.amount ?? 0)),
    currency: String(intent.data.attributes.currency ?? 'PHP'),
    nextAction: intent.data.attributes.next_action ?? null,
    raw: intent,
  }
}

export function verifyPayMongoWebhookSignature(payload: string, headers: Headers) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('PAYMONGO_WEBHOOK_SECRET is not configured')
  }

  const signatureHeader =
    headers.get('paymongo-signature') ??
    headers.get('x-paymongo-signature') ??
    headers.get('x-paymongo-webhook-signature') ??
    headers.get('x-signature') ??
    ''

  if (!signatureHeader) {
    throw new Error('Missing PayMongo webhook signature')
  }

  const normalized = signatureHeader.trim()
  const timestampMatch = normalized.match(/(?:^|,)\s*t=(\d+)/)
  const v1Match = normalized.match(/(?:^|,)\s*v1=([a-f0-9]+)/i)

  if (timestampMatch && v1Match) {
    const signedPayload = `${timestampMatch[1]}.${payload}`
    const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')
    if (!timingSafeEqualHex(v1Match[1].toLowerCase(), expected.toLowerCase())) {
      throw new Error('Invalid PayMongo webhook signature')
    }
    return true
  }

  const expected = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
  const plainSignature = normalized.replace(/^sha256=/i, '').replace(/^v1=/i, '').trim()

  if (!plainSignature) {
    throw new Error('Invalid PayMongo webhook signature')
  }

  if (!timingSafeEqualHex(plainSignature.toLowerCase(), expected.toLowerCase())) {
    throw new Error('Invalid PayMongo webhook signature')
  }

  return true
}
