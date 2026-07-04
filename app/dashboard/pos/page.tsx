'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  Barcode,
  Check,
  Clock3,
  CreditCard,
  Minus,
  Package,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  ShoppingBag,
  ShoppingCart,
  X,
} from 'lucide-react'
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

type ReceiptState = {
  receiptNo: string
  items: CartItem[]
  subtotal: number
  totalAmount: number
  payMethod: PayMethod
  tendered: number
  change: number
  date: Date
  cashierName: string
}

const blankCheckout = {
  items: [] as CartItem[],
  subtotal: 0,
  locationId: null as string | null,
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
  const [pendingSale, setPendingSale] = useState<typeof blankCheckout | null>(null)
  const [lastReceipt, setLastReceipt] = useState<ReceiptState | null>(null)
  const [scanValue, setScanValue] = useState('')
  const scanRef = useRef<HTMLInputElement>(null)

  const categoryOptions = useMemo(() => ['All', ...state.categories.map((category) => category.name)], [state.categories])
  const recentTransactions = useMemo(() => {
    return [...state.salesTransactions]
      .slice()
      .reverse()
      .slice(0, 6)
  }, [state.salesTransactions])

  const products = state.products.filter((product) => {
    const categoryName = state.categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized'
    const matchSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.item_code.toLowerCase().includes(search.toLowerCase()) ||
      (product.barcode ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = cat === 'All' || categoryName === cat
    return product.is_active && matchSearch && matchCategory
  })

  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity - item.discount, 0)
  const cashEntered = Number(tendered) || 0
  const change = cashEntered - subtotal

  const stats = useMemo(() => {
    const openOrders = state.purchaseOrders.filter((order) => ['draft', 'pending_approval', 'approved', 'ordered'].includes(order.status)).length
    const todaySales = state.salesTransactions.filter((tx) => tx.status === 'completed' && tx.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10))
    return [
      { label: 'Total SKUs', value: String(state.products.filter((product) => product.is_active).length), hint: 'Active products', icon: Package, color: '#3B82F6', tint: '#DBEAFE' },
      { label: "Today's Sales", value: formatCurrency(todaySales.reduce((sum, tx) => sum + Number(tx.total_amount), 0)), hint: `${todaySales.length} transactions`, icon: CreditCard, color: '#10B981', tint: '#D1FAE5' },
      { label: 'Pending Orders', value: String(openOrders), hint: 'Purchase orders', icon: ShoppingCart, color: '#8B5CF6', tint: '#EDE9FE' },
      { label: 'Stock Movements', value: String(state.stockMovements.length), hint: 'Audit trail', icon: ReceiptText, color: '#F59E0B', tint: '#FEF3C7' },
    ]
  }, [formatCurrency, state.products, state.purchaseOrders, state.salesTransactions, state.stockMovements])

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

  function addByScan(value: string) {
    const query = value.trim().toLowerCase()
    if (!query) return
    const product = state.products.find((entry) =>
      entry.item_code.toLowerCase() === query ||
      (entry.barcode ?? '').toLowerCase() === query ||
      entry.name.toLowerCase() === query
    )
    if (product) {
      addToCart(product.id)
      setScanValue('')
      requestAnimationFrame(() => scanRef.current?.focus())
    }
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

  useEffect(() => {
    if (!showReceipt && !showQrModal) {
      scanRef.current?.focus()
    }
  }, [showReceipt, showQrModal])

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

          const cashierName = state.users.find((user) => user.id === state.currentUserId)?.full_name ?? 'Cashier'
          setLastReceipt({
            receiptNo: data.receiptNumber ?? qrSession.intentId,
            items: sale.items,
            subtotal: sale.subtotal,
            totalAmount: sale.subtotal,
            payMethod: 'qr_ph',
            tendered: sale.subtotal,
            change: 0,
            date: new Date(),
            cashierName,
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
  }, [pendingSale, qrSession, state.currentUserId, state.users])

  useEffect(() => {
    const handleAfterPrint = () => setShowReceipt(false)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

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

  function handleCheckout() {
    if (cart.length === 0) return

    if (payMethod === 'qr_ph') {
      void startQrPhCheckout()
      return
    }

    const cashierName = state.users.find((user) => user.id === state.currentUserId)?.full_name ?? 'Cashier'
    const result = completeSale({
      payment_method: payMethod,
      payment_provider: 'manual',
      amount_tendered: cashEntered,
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
      totalAmount: subtotal,
      payMethod,
      tendered: cashEntered,
      change: payMethod === 'cash' ? Math.max(cashEntered - subtotal, 0) : 0,
      date: new Date(),
      cashierName,
    })
    setShowReceipt(true)
    setCart([])
    setTendered('')
  }

  function closeQrModal() {
    setShowQrModal(false)
    setQrSession(null)
    setQrError(null)
    setPendingSale(null)
    setQrBusy(false)
  }

  function printReceipt() {
    window.print()
  }

  const canCheckout = cart.length > 0 && !qrBusy && (payMethod !== 'cash' || cashEntered >= subtotal)
  const receiptDateText = useMemo(
    () =>
      lastReceipt
        ? new Intl.DateTimeFormat('en-PH', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(lastReceipt.date)
        : '',
    [lastReceipt]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card" style={{ padding: 18, borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Point of Sale
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.05em', lineHeight: 1.05, marginTop: 4 }}>
              {state.tenant.name}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span className="badge badge-green">Open</span>
            <span className="badge badge-blue">Scanner ready</span>
            <span className="badge badge-teal">Thermal print</span>
            <span className="badge badge-gray">
              Cashier: {state.users.find((user) => user.id === state.currentUserId)?.full_name ?? 'Cashier'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <button className="btn btn-ghost" type="button" onClick={() => scanRef.current?.focus()}>
            <Barcode size={15} /> Focus scanner
          </button>
          <button className="btn btn-primary" type="button" onClick={handleCheckout} disabled={!canCheckout}>
            <Check size={15} /> Complete Sale
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => window.print()} disabled={!lastReceipt}>
            <Printer size={15} /> Print receipt
          </button>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="card"
              style={{
                padding: 18,
                borderRadius: 18,
                borderColor: item.tint,
                background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: item.tint,
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: item.label === "Today's Sales" ? 20 : 24, fontWeight: 900, color: item.color, letterSpacing: '-0.04em', marginTop: 4 }}>
                    {item.value}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 10, lineHeight: 1.4 }}>{item.hint}</div>
            </div>
          )
        })}
      </section>

      <section className="card" style={{ padding: 14, borderRadius: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              className="input"
              placeholder="Search products, item codes, or scan barcode..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ paddingLeft: 38, height: 42, borderRadius: 12 }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Barcode size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              ref={scanRef}
              className="input"
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addByScan(scanValue)
                }
              }}
              placeholder="Scanner input"
              style={{ paddingLeft: 38, height: 42, borderRadius: 12 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {categoryOptions.map((option) => (
            <button
              key={option}
              onClick={() => setCat(option)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
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
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(360px, 0.9fr)', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          <section className="card" style={{ overflow: 'hidden', borderRadius: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Product grid</h3>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Tap to add items or scan item codes directly.</p>
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{products.length} products</div>
            </div>

            <div style={{ padding: 14, overflowY: 'auto', maxHeight: '62vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
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
                        borderRadius: 14,
                        padding: '14px 12px',
                        cursor: outOfStock ? 'not-allowed' : 'pointer',
                        opacity: outOfStock ? 0.45 : 1,
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
                      }}
                    >
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${catColor}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        color: catColor,
                        fontWeight: 800,
                      }}>
                        {categoryName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{product.name}</div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{product.item_code}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#10B981' }}>{formatCurrency(Number(product.selling_price ?? 0))}</span>
                        <span style={{ fontSize: 10, color: '#64748B' }}>{product.quantity_on_hand} {product.uom?.abbreviation ?? 'pcs'}</span>
                      </div>
                      {inCart && (
                        <div style={{ background: '#3B82F6', borderRadius: 999, padding: '3px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                          {inCart.quantity} in cart
                        </div>
                      )}
                      {outOfStock && (
                        <div style={{ background: '#FEE2E2', borderRadius: 999, padding: '3px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>
                          OUT OF STOCK
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 16 }}>
          <section className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 20 }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShoppingBag size={16} color="#3B82F6" /> Current Order
                </h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="btn btn-danger btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', maxHeight: 360 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
                  <ShoppingBag size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
                  <p style={{ fontSize: 13 }}>No items in cart</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>Scan a barcode or tap a product</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} style={{ padding: '10px 0', borderBottom: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>{formatCurrency(item.sellingPrice)} / {item.uom}</div>
                      </div>
                      <button onClick={() => removeItem(item.productId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => updateQty(item.productId, -1)} style={{ width: 28, height: 28, borderRadius: 8, background: '#F8FBFF', border: '1px solid #D8E4F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.productId, 1)} style={{ width: 28, height: 28, borderRadius: 8, background: '#F8FBFF', border: '1px solid #D8E4F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, color: '#64748B' }}>Disc:</span>
                        <input type="number" value={item.discount || ''} onChange={(event) => updateDiscount(item.productId, event.target.value)} placeholder="0" style={{ width: 64, background: '#FFFFFF', border: '1px solid #D8E4F2', borderRadius: 6, padding: '4px 6px', color: '#0F172A', fontSize: 12, outline: 'none' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                      <span style={{ color: '#64748B' }}>Line total</span>
                      <span style={{ fontWeight: 900, color: '#10B981' }}>{formatCurrency((item.sellingPrice * item.quantity) - item.discount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '14px 16px', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#475569', fontSize: 13 }}>Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: '#0F172A' }}>{formatCurrency(subtotal)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
                {([
                  ['cash', 'Cash', Banknote],
                  ['qr_ph', 'QR Ph', QrCode],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    onClick={() => setPayMethod(value)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 12,
                      border: `1px solid ${payMethod === value ? '#3B82F6' : '#D8E4F2'}`,
                      background: payMethod === value ? '#EFF6FF' : '#FFFFFF',
                      color: payMethod === value ? '#2563EB' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>

              {payMethod === 'cash' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#475569', display: 'block', marginBottom: 5 }}>Amount Tendered</label>
                  <input className="input" type="number" placeholder="0.00" value={tendered} onChange={(event) => setTendered(event.target.value)} style={{ height: 42, fontSize: 16, fontWeight: 700, borderRadius: 12 }} />
                  {cashEntered >= subtotal && subtotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: '#475569' }}>Change</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#2563EB' }}>{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {payMethod === 'qr_ph' && (
                <div style={{ marginBottom: 12, padding: '12px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', color: '#475569', fontSize: 12, lineHeight: 1.5 }}>
                  Generate a PayMongo QR Ph code for this exact total. Once the customer pays, the system will confirm it and save the sale automatically.
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleCheckout}
                disabled={!canCheckout}
                style={{ width: '100%', justifyContent: 'center', height: 46, fontSize: 15, opacity: canCheckout ? 1 : 0.45 }}
              >
                {payMethod === 'qr_ph' ? <QrCode size={17} /> : <Check size={17} />}
                {payMethod === 'qr_ph' ? 'Generate QR Ph' : 'Complete Sale'}
              </button>
            </div>
          </section>

          <section className="card" style={{ overflow: 'hidden', borderRadius: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Recent transactions</h3>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Latest completed sales with quick details.</p>
              </div>
              <Clock3 size={15} color="#64748B" />
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
              {recentTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '26px 10px', color: '#94A3B8' }}>
                  <ReceiptText size={28} style={{ marginBottom: 8, opacity: 0.35 }} />
                  <p style={{ fontSize: 12 }}>No transactions yet</p>
                </div>
              ) : recentTransactions.map((tx) => {
                const cashier = tx.cashier?.full_name ?? 'Cashier'
                const total = Number(tx.total_amount ?? 0)
                const paidVia = tx.payment_method === 'cash' ? 'Cash' : 'QR Ph'
                const count = tx.items?.length ?? 0
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => {
                      const txItems = (tx.items ?? []).map((item) => ({
                        productId: item.product_id,
                        name: item.product?.name ?? 'Item',
                        itemCode: item.product?.item_code ?? '-',
                        sellingPrice: Number(item.unit_price ?? 0),
                        unitCost: item.unit_cost,
                        uom: item.product?.uom?.abbreviation ?? 'pcs',
                        quantity: Number(item.quantity ?? 0),
                        discount: Number(item.discount ?? 0),
                      }))

                      setLastReceipt({
                        receiptNo: tx.receipt_number,
                        items: txItems,
                        subtotal: total,
                        totalAmount: total,
                        payMethod: tx.payment_method === 'qr_ph' ? 'qr_ph' : 'cash',
                        tendered: Number(tx.amount_tendered ?? total),
                        change: Number(tx.change_amount ?? 0),
                        date: new Date(tx.created_at),
                        cashierName: cashier,
                      })
                      setShowReceipt(true)
                    }}
                    style={{
                      textAlign: 'left',
                      border: '1px solid #E2E8F0',
                      borderRadius: 14,
                      padding: 14,
                      background: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{tx.receipt_number}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#10B981' }}>{formatCurrency(total)}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{paidVia}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#64748B' }}>
                      <span>{count} item{count !== 1 ? 's' : ''}</span>
                      <span>{cashier}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {showReceipt && lastReceipt && (
        <div className="modal-overlay">
          <div className="modal pos-receipt-modal" style={{ maxWidth: 400, padding: 0, overflow: 'hidden' }}>
            <div className="pos-receipt-paper">
              <div className="pos-receipt-header">
                <img
                  src="/images/codentralogo-removebg-preview.png"
                  alt="Codentra"
                  className="pos-receipt-logo"
                />
                <div className="pos-receipt-subtitle">{state.tenant.name}</div>
                <div className="pos-receipt-meta">Receipt #{lastReceipt.receiptNo}</div>
                <div className="pos-receipt-meta">{receiptDateText}</div>
                <div className="pos-receipt-meta">Cashier: {lastReceipt.cashierName}</div>
              </div>

              <div className="pos-receipt-divider" />

              <div className="pos-receipt-items">
                {lastReceipt.items.map((item) => (
                  <div key={`${item.productId}-${item.itemCode}`} className="pos-receipt-line">
                    <div className="pos-receipt-line-main">
                      <div className="pos-receipt-item-name">{item.name}</div>
                      <div className="pos-receipt-item-meta">{item.itemCode} • {item.quantity} x {formatCurrency(item.sellingPrice)}</div>
                    </div>
                    <div className="pos-receipt-line-total">{formatCurrency(item.sellingPrice * item.quantity - item.discount)}</div>
                  </div>
                ))}
              </div>

              <div className="pos-receipt-divider" />

              <div className="pos-receipt-totals">
                <div><span>Subtotal</span><strong>{formatCurrency(lastReceipt.subtotal)}</strong></div>
                <div><span>Payment</span><strong>{lastReceipt.payMethod === 'cash' ? 'Cash' : 'QR Ph'}</strong></div>
                {lastReceipt.payMethod === 'cash' && (
                  <>
                    <div><span>Tendered</span><strong>{formatCurrency(lastReceipt.tendered)}</strong></div>
                    <div><span>Change</span><strong>{formatCurrency(lastReceipt.change)}</strong></div>
                  </>
                )}
              </div>

              <div className="pos-receipt-divider" />

              <div className="pos-receipt-total-row">
                <span>TOTAL</span>
                <strong>{formatCurrency(lastReceipt.totalAmount)}</strong>
              </div>

              <div className="pos-receipt-footer">
                <div>Thank you.</div>
                <div>Please keep this receipt.</div>
              </div>
            </div>

            <div className="pos-print-hide" style={{ display: 'flex', gap: 10, padding: 16, borderTop: '1px solid #E2E8F0' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReceipt(false)}>
                <X size={14} /> Close
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={printReceipt}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        </div>
      )}

      {showQrModal && qrSession && (
        <div className="modal-overlay pos-print-hide">
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
