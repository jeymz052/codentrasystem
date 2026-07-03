'use client'

import { useEffect, useMemo, useState } from 'react'
import { Banknote, Check, Minus, Plus, Printer, QrCode, Search, ShoppingBag, X } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'

type CartItem = {
  productId: string
  name: string
  itemCode: string
  sellingPrice: number
  unitCost: number | null
  uom: string
  quantity: number
  discount: number
}

type PayMethod = 'cash' | 'qr_ph'

type QrSession = {
  intentId: string
  imageUrl: string | null
  amount: number
}

export default function POSPage() {
  const { state, completeSale, formatCurrency } = useDemoSystem()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [cart, setCart] = useState<CartItem[]>([])
  const [payMethod, setPayMethod] = useState<PayMethod>('cash')
  const [tendered, setTendered] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrSession, setQrSession] = useState<QrSession | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrBusy, setQrBusy] = useState(false)
  const [pendingSale, setPendingSale] = useState<{
    items: CartItem[]
    subtotal: number
    locationId: string | null
  } | null>(null)
  const [lastReceipt, setLastReceipt] = useState<{ receiptNo: string; items: CartItem[]; subtotal: number; payMethod: PayMethod; tendered: number; change: number; date: Date } | null>(null)

  const categoryOptions = useMemo(() => ['All', ...state.categories.map((category) => category.name)], [state.categories])
  const products = state.products.filter((product) => {
    const categoryName = state.categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized'
    const matchSearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.item_code.toLowerCase().includes(search.toLowerCase())
    const matchCategory = cat === 'All' || categoryName === cat
    return product.is_active && matchSearch && matchCategory
  })

  function addToCart(productId: string) {
    const product = state.products.find((entry) => entry.id === productId)
    if (!product || product.quantity_on_hand === 0) return
    const categoryName = state.categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized'
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id)
      if (existing) {
        return current.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          itemCode: product.item_code,
          sellingPrice: Number(product.selling_price ?? 0),
          unitCost: product.unit_cost,
          uom: product.uom?.abbreviation ?? categoryName,
          quantity: 1,
          discount: 0,
        },
      ]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
        .filter(Boolean)
    )
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId))
  }

  function updateDiscount(productId: string, value: string) {
    setCart((current) => current.map((item) => (item.productId === productId ? { ...item, discount: Math.max(Number(value) || 0, 0) } : item)))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity - item.discount, 0)
  const change = Number(tendered) - subtotal

  useEffect(() => {
    if (!qrSession) return

    let cancelled = false

    const poll = async () => {
      try {
        const response = await fetch(`/api/payments/paymongo/qrph/${encodeURIComponent(qrSession.intentId)}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(await response.text())
        }

        const data = await response.json() as { status?: string; imageUrl?: string | null; receiptNumber?: string; transactionId?: string | null }
        const status = String(data.status ?? '').toLowerCase()
        if (cancelled) return

        if (['succeeded', 'paid', 'completed'].includes(status)) {
          const sale = pendingSale
          if (!sale) return

          setLastReceipt({
            receiptNo: data.receiptNumber ?? qrSession.intentId,
            items: sale.items,
            subtotal: sale.subtotal,
            payMethod: 'qr_ph',
            tendered: sale.subtotal,
            change: 0,
            date: new Date(),
          })
          setShowQrModal(false)
          setQrSession(null)
          setQrError(null)
          setPendingSale(null)
          setShowReceipt(true)
          setCart([])
          setTendered('')
          return
        }

        if (['failed', 'cancelled', 'canceled', 'expired'].includes(status)) {
          setQrError(`Payment ${status}. Please try again.`)
          setQrBusy(false)
          return
        }
      } catch (error) {
        if (!cancelled) {
          setQrError(error instanceof Error ? error.message : 'Failed to check QR Ph payment status')
          setQrBusy(false)
        }
      }
    }

    void poll()
    const timer = window.setInterval(poll, 3500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [pendingSale, qrSession])

  function handleCheckout() {
    if (cart.length === 0) return

    if (payMethod === 'qr_ph') {
      void startQrPhCheckout()
      return
    }

    const result = completeSale({
      payment_method: payMethod,
      payment_provider: 'manual',
      amount_tendered: Number(tendered) || 0,
      location_id: state.locations[0]?.id ?? null,
      notes: `Sold at ${state.tenant.name}`,
      items: cart.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.sellingPrice,
        unit_cost: item.unitCost,
        discount: item.discount,
      })),
    })

    setLastReceipt({
      receiptNo: result.receiptNumber,
      items: cart,
      subtotal,
      payMethod,
      tendered: Number(tendered) || 0,
      change: payMethod === 'cash' ? Math.max(Number(tendered) - subtotal, 0) : 0,
      date: new Date(),
    })
    setShowReceipt(true)
    setCart([])
    setTendered('')
  }

  async function startQrPhCheckout() {
    if (cart.length === 0 || qrBusy) return
    setQrBusy(true)
    setQrError(null)

    const saleSubtotal = subtotal
    const locationId = state.locations[0]?.id ?? null
    const receiptHint = `POS-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`
    const saleItems = cart.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.sellingPrice,
      unit_cost: item.unitCost,
      discount: item.discount,
    }))

    setPendingSale({
      items: cart,
      subtotal: saleSubtotal,
      locationId,
    })

    try {
      const response = await fetch('/api/payments/paymongo/qrph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: saleSubtotal,
          description: `POS sale - ${state.tenant.name}`,
          reference: receiptHint,
          tenantId: state.tenant.id,
          cashierId: state.currentUserId,
          receiptNumber: receiptHint,
          locationId,
          notes: `QR Ph payment at ${state.tenant.name}`,
          items: saleItems,
        }),
      })

      const data = await response.json() as { intentId?: string; imageUrl?: string | null; error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create QR Ph payment')
      }

      if (!data.intentId) {
        throw new Error('PayMongo did not return a payment intent')
      }

      setQrSession({
        intentId: data.intentId,
        imageUrl: data.imageUrl ?? null,
        amount: saleSubtotal,
      })
      setShowQrModal(true)
    } catch (error) {
      setQrError(error instanceof Error ? error.message : 'Failed to create QR Ph payment')
      setPendingSale(null)
    } finally {
      setQrBusy(false)
    }
  }

  function closeQrModal() {
    setShowQrModal(false)
    setQrSession(null)
    setQrError(null)
    setPendingSale(null)
    setQrBusy(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 20, minHeight: 'calc(100vh - 116px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
        <div className="card" style={{ padding: '12px 14px', flexShrink: 0 }}>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input className="input" placeholder="Search product or item code..." value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 36, height: 36 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categoryOptions.map((option) => (
              <button
                key={option}
                onClick={() => setCat(option)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  background: cat === option ? '#DBEAFE' : '#FFFFFF',
                  color: cat === option ? '#2563EB' : '#475569',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {products.map((product) => {
              const inCart = cart.find((item) => item.productId === product.id)
              const outOfStock = product.quantity_on_hand === 0
              const categoryName = state.categories.find((category) => category.id === product.category_id)?.name ?? 'General'
              const catColor = state.categories.find((category) => category.id === product.category_id)?.color ?? '#6366F1'
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product.id)}
                  disabled={outOfStock}
                  style={{
                    background: inCart ? '#EFF6FF' : '#FFFFFF',
                    border: `1px solid ${inCart ? '#3B82F6' : '#D8E4F2'}`,
                    borderRadius: 12,
                    padding: '14px 12px',
                    cursor: outOfStock ? 'not-allowed' : 'pointer',
                    opacity: outOfStock ? 0.45 : 1,
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${catColor}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}>
                    {categoryName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>{product.name}</div>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{product.item_code}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>{formatCurrency(Number(product.selling_price ?? 0))}</span>
                    <span style={{ fontSize: 10, color: '#64748B' }}>{product.quantity_on_hand} {product.uom?.abbreviation ?? 'pcs'}</span>
                  </div>
                  {inCart && (
                    <div style={{ background: '#3B82F6', borderRadius: 4, padding: '2px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                      {inCart.quantity} in cart
                    </div>
                  )}
                  {outOfStock && (
                    <div style={{ background: '#FEE2E2', borderRadius: 4, padding: '2px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>
                      OUT OF STOCK
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={16} color="#3B82F6" /> Current Order
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="btn btn-danger btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
              <ShoppingBag size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>No items in cart</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Click a product to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} style={{ padding: '10px 0', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{formatCurrency(item.sellingPrice)} / {item.uom}</div>
                  </div>
                  <button onClick={() => removeItem(item.productId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => updateQty(item.productId, -1)} style={{ width: 26, height: 26, borderRadius: 6, background: '#F8FBFF', border: '1px solid #D8E4F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, 1)} style={{ width: 26, height: 26, borderRadius: 6, background: '#F8FBFF', border: '1px solid #D8E4F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#64748B' }}>Disc:</span>
                    <input type="number" value={item.discount || ''} onChange={(event) => updateDiscount(item.productId, event.target.value)} placeholder="0" style={{ width: 60, background: '#FFFFFF', border: '1px solid #D8E4F2', borderRadius: 5, padding: '3px 6px', color: '#0F172A', fontSize: 12, outline: 'none' }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#10B981', minWidth: 80, textAlign: 'right' }}>
                    {formatCurrency((item.sellingPrice * item.quantity) - item.discount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '14px 16px', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#475569', fontSize: 13 }}>Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#0F172A' }}>{formatCurrency(subtotal)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginBottom: 12 }}>
            {([
              ['cash', 'Cash', Banknote],
              ['qr_ph', 'QR Ph', QrCode],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setPayMethod(value)}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: `1px solid ${payMethod === value ? '#3B82F6' : '#D8E4F2'}`,
                  background: payMethod === value ? '#EFF6FF' : '#FFFFFF',
                  color: payMethod === value ? '#2563EB' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          {payMethod === 'cash' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#475569', display: 'block', marginBottom: 5 }}>Amount Tendered</label>
              <input className="input" type="number" placeholder="0.00" value={tendered} onChange={(event) => setTendered(event.target.value)} style={{ height: 40, fontSize: 16, fontWeight: 700 }} />
              {Number(tendered) >= subtotal && subtotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>Change</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#2563EB' }}>{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          {payMethod === 'qr_ph' && (
            <div style={{ marginBottom: 12, padding: '12px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #D8E4F2', color: '#475569', fontSize: 12, lineHeight: 1.5 }}>
              Generate a PayMongo QR Ph code for this exact total. Once the customer pays, the system will confirm it and save the sale automatically.
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleCheckout}
            disabled={cart.length === 0 || qrBusy || (payMethod === 'cash' && Number(tendered) < subtotal)}
            style={{ width: '100%', justifyContent: 'center', height: 46, fontSize: 15, opacity: cart.length === 0 ? 0.45 : 1 }}
          >
            {payMethod === 'qr_ph' ? <QrCode size={17} /> : <Check size={17} />}
            {payMethod === 'qr_ph' ? 'Generate QR Ph' : 'Complete Sale'}
          </button>
        </div>
      </div>

      {showReceipt && lastReceipt && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={24} color="#10B981" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Sale Completed</h3>
            <p style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>{lastReceipt.receiptNo}</p>

            <div style={{ background: '#F8FBFF', border: '1px solid #D8E4F2', borderRadius: 10, padding: '14px 16px', marginBottom: 16, textAlign: 'left' }}>
              {lastReceipt.items.map((item) => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>{item.name} x{item.quantity}</span>
                  <span style={{ fontSize: 12, color: '#0F172A' }}>{formatCurrency(item.sellingPrice * item.quantity)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #D8E4F2', marginTop: 10, paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>TOTAL</span>
                  <span style={{ fontWeight: 800, color: '#10B981', fontSize: 16 }}>{formatCurrency(lastReceipt.subtotal)}</span>
                </div>
                {lastReceipt.payMethod === 'cash' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: '#475569' }}>Tendered</span>
                      <span style={{ fontSize: 12, color: '#0F172A' }}>{formatCurrency(lastReceipt.tendered)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: '#475569' }}>Change</span>
                      <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 700 }}>{formatCurrency(lastReceipt.change)}</span>
                    </div>
                  </>
                )}
                {lastReceipt.payMethod === 'qr_ph' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: '#475569' }}>Payment</span>
                    <span style={{ fontSize: 12, color: '#0F172A' }}>PayMongo QR Ph</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReceipt(false)}>
                <X size={14} /> Close
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { window.print(); setShowReceipt(false) }}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        </div>
      )}

      {showQrModal && qrSession && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <QrCode size={24} color="#2563EB" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Scan to Pay</h3>
            <p style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>Waiting for PayMongo QR Ph payment to complete.</p>

            <div style={{ background: '#F8FBFF', border: '1px solid #D8E4F2', borderRadius: 12, padding: 16, marginBottom: 14 }}>
              {qrSession.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSession.imageUrl} alt="PayMongo QR Ph code" style={{ width: '100%', maxWidth: 260, margin: '0 auto', display: 'block', borderRadius: 10 }} />
              ) : (
                <div style={{ padding: '42px 20px', color: '#64748B', fontSize: 13 }}>Generating QR code...</div>
              )}
              <div style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>
                Amount: <strong style={{ color: '#0F172A' }}>{formatCurrency(qrSession.amount)}</strong>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#64748B' }}>
                Payment intent: {qrSession.intentId}
              </div>
            </div>

            {qrError && (
              <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '10px 12px', color: '#B91C1C', fontSize: 12, marginBottom: 14, textAlign: 'left' }}>
                {qrError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={closeQrModal}>
                <X size={14} /> Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                setQrBusy(false)
                setQrError(null)
              }}>
                <Check size={14} /> Still waiting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
