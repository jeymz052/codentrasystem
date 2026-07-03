import { NextResponse, type NextRequest } from 'next/server'
import { createQrPhPaymentIntent } from '@/lib/paymongo'
import { getSupabaseServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const amount = Number(body.amount ?? 0)
    const tenantId = String(body.tenantId ?? '')
    const cashierId = String(body.cashierId ?? '')
    const locationId = body.locationId ? String(body.locationId) : null
    const receiptNumber = String(body.receiptNumber ?? body.reference ?? `POS-${Date.now()}`)
    const items = Array.isArray(body.items) ? body.items : []

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 })
    }
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const { error: sessionError } = await supabase
      .from('paymongo_qr_sessions')
      .insert({
        tenant_id: tenantId,
        cashier_id: cashierId || null,
        location_id: locationId,
        receipt_number: receiptNumber,
        amount,
        currency: 'PHP',
        payment_provider: 'paymongo',
        payment_reference: String(body.reference ?? receiptNumber),
        notes: body.notes ? String(body.notes) : null,
        items,
        status: 'pending',
      })

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    const result = await createQrPhPaymentIntent({
      amount,
      description: String(body.description ?? 'POS QR Ph payment'),
      reference: receiptNumber,
      metadata: {
        tenant_id: tenantId,
        cashier_id: cashierId,
        receipt_number: receiptNumber,
      },
      customerEmail: body.customerEmail ? String(body.customerEmail) : undefined,
    })

    await supabase
      .from('paymongo_qr_sessions')
      .update({
        intent_id: result.id,
        qr_image_url: result.nextAction?.code?.image_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('receipt_number', receiptNumber)

    return NextResponse.json({
      intentId: result.id,
      clientKey: result.clientKey,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      imageUrl: result.nextAction?.code?.image_url ?? null,
      qrDataUrl: result.nextAction?.code?.qr_code_base64 ?? null,
      receiptNumber,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create QR Ph payment' },
      { status: 500 }
    )
  }
}
