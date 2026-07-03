import { NextResponse, type NextRequest } from 'next/server'
import { applyDatabaseMutation } from '@/lib/system-db'
import type { PaymentMethod } from '@/types/database'
import { getSupabaseServiceClient } from '@/lib/supabase-server'
import { verifyPayMongoWebhookSignature } from '@/lib/paymongo'

export const runtime = 'nodejs'

function extractIntentId(event: Record<string, any>) {
  return String(
    event?.data?.id ??
    event?.data?.attributes?.payment_intent_id ??
    event?.data?.attributes?.payment_intent?.id ??
    event?.data?.attributes?.source?.id ??
    event?.data?.attributes?.payment_method?.id ??
    ''
  )
}

function isPaidEvent(type: string) {
  const normalized = type.toLowerCase()
  return normalized.includes('succeed') || normalized.includes('paid') || normalized.includes('completed')
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    verifyPayMongoWebhookSignature(rawBody, request.headers)

    const event = JSON.parse(rawBody) as Record<string, any>
    const type = String(event?.type ?? '')
    if (!type) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
    }

    if (!isPaidEvent(type)) {
      return NextResponse.json({ received: true, ignored: true })
    }

    const intentId = extractIntentId(event)
    if (!intentId) {
      return NextResponse.json({ error: 'Missing payment intent id' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const { data: session, error: sessionError } = await supabase
      .from('paymongo_qr_sessions')
      .select('*')
      .eq('intent_id', intentId)
      .maybeSingle()

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    if (!session) {
      return NextResponse.json({ received: true, ignored: true, reason: 'session not found' })
    }

    if (session.status === 'paid' && session.transaction_id) {
      return NextResponse.json({ received: true, alreadyProcessed: true })
    }

    const { data: claimedSession } = await supabase
      .from('paymongo_qr_sessions')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', session.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle()

    if (!claimedSession) {
      return NextResponse.json({ received: true, alreadyProcessed: true })
    }

    const saleItems = Array.isArray(session.items) ? session.items : []
    const mutationResult = await applyDatabaseMutation(session.tenant_id, {
      action: 'completeSale',
      payload: {
        payment_method: 'qr_ph' as PaymentMethod,
        payment_provider: 'paymongo',
        payment_reference: intentId,
        amount_tendered: Number(session.amount ?? 0),
        location_id: session.location_id ?? null,
        notes: session.notes ?? `PayMongo QR Ph payment ${session.receipt_number}`,
        items: saleItems.map((item: any) => ({
          product_id: String(item.product_id),
          quantity: Number(item.quantity ?? 0),
          unit_price: Number(item.unit_price ?? 0),
          unit_cost: item.unit_cost == null ? null : Number(item.unit_cost),
          discount: Number(item.discount ?? 0),
        })),
      },
    })

    const transaction = mutationResult.salesTransactions.find((entry) => entry.receipt_number === session.receipt_number) ?? mutationResult.salesTransactions[mutationResult.salesTransactions.length - 1]

    await supabase
      .from('paymongo_qr_sessions')
      .update({
        status: 'paid',
        transaction_id: transaction?.id ?? null,
        payment_reference: intentId,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    return NextResponse.json({
      received: true,
      processed: true,
      receiptNumber: transaction?.receipt_number ?? session.receipt_number,
      transactionId: transaction?.id ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process PayMongo webhook' },
      { status: 500 }
    )
  }
}
