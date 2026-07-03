import { NextResponse, type NextRequest } from 'next/server'
import { getPaymentIntent } from '@/lib/paymongo'
import { getSupabaseServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(_: NextRequest, { params }: { params: Promise<{ intentId: string }> }) {
  try {
    const { intentId } = await params
    const supabase = getSupabaseServiceClient()
    const { data: session } = await supabase
      .from('paymongo_qr_sessions')
      .select('*, transaction_id')
      .eq('intent_id', intentId)
      .maybeSingle()

    if (session) {
      return NextResponse.json({
        intentId,
        status: session.status,
        amount: session.amount,
        currency: session.currency,
        imageUrl: session.qr_image_url ?? null,
        qrDataUrl: null,
        receiptNumber: session.receipt_number,
        transactionId: session.transaction_id,
      })
    }

    const result = await getPaymentIntent(intentId)
    return NextResponse.json({
      intentId: result.id,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      imageUrl: result.nextAction?.code?.image_url ?? null,
      qrDataUrl: result.nextAction?.code?.qr_code_base64 ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch QR Ph payment' },
      { status: 500 }
    )
  }
}
