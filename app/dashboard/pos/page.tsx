'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Barcode,
  Check,
  Clock3,
  CreditCard,
  Landmark,
  Minus,
  Package,
  Percent,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  X,
  Clock,
  Repeat,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { formatTimestamp } from '@/lib/utils'
import { getRolePermissions } from '@/lib/access-control'
import type { PaymentMethod, Tenant, CashShift, CashMovementKind, TransactionStatus } from '@/types/database'

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

type PayMethod = PaymentMethod

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  qr_ph: 'QR Ph (PayMongo)',
  gcash: 'GCash',
  maya: 'Maya',
  bdo: 'BDO',
  maribank: 'Maribank',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
}

function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? 'Other'
}

const MANUAL_METHODS = new Set<PayMethod>(['gcash', 'maya', 'bdo', 'maribank'])

function storePaymentDetails(tenant: Tenant, method: PaymentMethod) {
  switch (method) {
    case 'gcash':
      return { account: tenant.gcash_account ?? null, qrUrl: tenant.gcash_qr_url ?? null }
    case 'maya':
      return { account: tenant.maya_account ?? null, qrUrl: tenant.maya_qr_url ?? null }
    case 'bdo':
      return { account: tenant.bdo_account ?? null, qrUrl: tenant.bdo_qr_url ?? null }
    case 'maribank':
      return { account: tenant.maribank_account ?? null, qrUrl: tenant.maribank_qr_url ?? null }
    default:
      return { account: null, qrUrl: null }
  }
}

type QrSession = {
  intentId: string
  imageUrl: string | null
  amount: number
}

type ReceiptState = {
  receiptNo: string
  items: CartItem[]
  subtotal: number
  discount: number
  discountLabel: string | null
  totalAmount: number
  payMethod: PayMethod
  tendered: number
  change: number
  reference: string
  date: Date
  cashierName: string
}

type PendingSale = {
  items: CartItem[]
  subtotal: number
  discount: number
  discountLabel: string | null
  grandTotal: number
  locationId: string | null
}

const blankCheckout: PendingSale = {
  items: [] as CartItem[],
  subtotal: 0,
  discount: 0,
  discountLabel: null,
  grandTotal: 0,
  locationId: null as string | null,
}

export default function POSPage() {
  const { state, availableTenants, activeTenantId, completeSale, formatCurrency, notifyError, notifySuccess, voidSale, refundSale, openShift, closeShift, recordCashMovement } = useDemoSystem()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? 'cashier'
  const perms = getRolePermissions(role)

  function formatClock(value: string | null | undefined): string {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  }
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [cart, setCart] = useState<CartItem[]>([])
  const [payMethod, setPayMethod] = useState<PayMethod>('cash')
  const [tendered, setTendered] = useState('')
  const [reference, setReference] = useState('')
  const [qrZoom, setQrZoom] = useState<string | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrSession, setQrSession] = useState<QrSession | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrBusy, setQrBusy] = useState(false)
  const [pendingSale, setPendingSale] = useState<typeof blankCheckout | null>(null)
  const [lastReceipt, setLastReceipt] = useState<ReceiptState | null>(null)
  const [scanValue, setScanValue] = useState('')
  const scanRef = useRef<HTMLInputElement>(null)
  const scanTimer = useRef<number | null>(null)
  const [orderDiscountType, setOrderDiscountType] = useState<'none' | 'pwd_senior' | 'employee'>('none')
  const [manualDiscountPercent, setManualDiscountPercent] = useState(0)
  const isProduction = state.tenant.enable_production ?? false
  const [prodType, setProdType] = useState<string>(isProduction ? 'finished' : 'all')

  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showCashModal, setShowCashModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [targetTx, setTargetTx] = useState<any>(null)
  const [shiftAction, setShiftAction] = useState<'open' | 'close'>('open')
  const [cashAction, setCashAction] = useState<'cash_in' | 'cash_out'>('cash_in')
  const [openingFloat, setOpeningFloat] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [shiftStation, setShiftStation] = useState('')
  const [shiftLocationId, setShiftLocationId] = useState<string>(() => state.locations[0]?.id ?? '')
  const [shiftNote, setShiftNote] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashNote, setCashNote] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [voidReason, setVoidReason] = useState('')
  const [noShiftBlock, setNoShiftBlock] = useState(false)

  const currentShift = useMemo(() => state.cashShifts.find((shift) => shift.status === 'open'), [state.cashShifts])
  const lastClosedShift = useMemo(() => {
    return [...state.cashShifts]
      .filter((shift) => shift.status === 'closed' && shift.closed_by === state.currentUserId)
      .sort((a, b) => (b.closed_at ?? '').localeCompare(a.closed_at ?? ''))[0] ?? null
  }, [state.cashShifts, state.currentUserId])
  const currentCashier = state.users.find((user) => user.id === state.currentUserId) ?? null
  const cashierLabel = currentCashier?.full_name?.trim() || currentCashier?.email || 'Cashier'
  const recentTx = useMemo(() => {
    return [...state.salesTransactions]
      .slice()
      .reverse()
      .slice(0, 8)
  }, [state.salesTransactions])
  const categoryOptions = useMemo(() => ['All', ...state.categories.map((category) => category.name)], [state.categories])

  const products = state.products.filter((product) => {
    const categoryName = state.categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized'
    const matchSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.item_code.toLowerCase().includes(search.toLowerCase()) ||
      (product.barcode ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = cat === 'All' || categoryName === cat
    const hasBom = product.is_finished_good || state.productRecipes.some((r) => r.finished_good_id === product.id)
    const matchType = isProduction ? hasBom : (prodType === 'all' || (prodType === 'finished' ? hasBom : !hasBom))
    return product.is_active && matchSearch && matchCategory && matchType
  })

  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity - item.discount, 0)
  const DISCOUNT_RATES = { none: 0, pwd_senior: 0.2, employee: 0.15 } as const
  const discountRate = DISCOUNT_RATES[orderDiscountType]
  const presetLabel = orderDiscountType === 'pwd_senior' ? 'PWD / Senior (−20%)' : orderDiscountType === 'employee' ? 'Employee (−15%)' : null
  const presetDiscount = discountRate > 0 ? subtotal * discountRate : 0
  const manualRate = manualDiscountPercent / 100
  const manualDiscount = subtotal * manualRate
  const totalOrderDiscount = presetDiscount + manualDiscount
  const discountLines = [
    ...(presetDiscount > 0 ? [{ label: presetLabel as string, amount: presetDiscount }] : []),
    ...(manualDiscount > 0 ? [{ label: `Manual (−${manualDiscountPercent}%)`, amount: manualDiscount }] : []),
  ]
  const discountLabel = discountLines.length > 0 ? discountLines.map((entry) => entry.label).join(' + ') : null
  const grandTotal = subtotal - totalOrderDiscount
  const cashEntered = Number(tendered) || 0
  const change = cashEntered - grandTotal

  const stats = useMemo(() => {
    const openOrders = state.purchaseOrders.filter((order) => ['draft', 'pending_approval', 'approved', 'ordered'].includes(order.status)).length
    const todaySales = state.salesTransactions.filter((tx) => tx.status === 'completed' && tx.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10))
    const shiftTotal = currentShift ? state.salesTransactions.filter((tx) => tx.shift_id === currentShift.id && tx.status === 'completed').reduce((sum, tx) => sum + Number(tx.total_amount), 0) : 0
    const shiftTxCount = currentShift ? state.salesTransactions.filter((tx) => tx.shift_id === currentShift.id && tx.status === 'completed').length : 0
    return [
      { label: 'Total SKUs', value: String(state.products.filter((product) => product.is_active).length), hint: 'Active products', icon: Package, color: '#3B82F6', tint: '#DBEAFE' },
      { label: "Today's Sales", value: formatCurrency(todaySales.reduce((sum, tx) => sum + Number(tx.total_amount), 0)), hint: `${todaySales.length} transactions`, icon: CreditCard, color: '#10B981', tint: '#D1FAE5' },
      { label: currentShift ? `Shift Sales (${currentShift.shift_code})` : 'Shift Sales', value: formatCurrency(shiftTotal), hint: `${shiftTxCount} transactions`, icon: Banknote, color: '#F59E0B', tint: '#FEF3C7' },
      { label: 'Starting Cash', value: currentShift ? formatCurrency(Number(currentShift.opening_float)) : '—', hint: currentShift ? `Float for ${currentShift.shift_code}` : 'Open a shift', icon: Wallet, color: '#B45309', tint: '#FEF3C7' },
      { label: 'Pending Orders', value: String(openOrders), hint: 'Purchase orders', icon: ShoppingCart, color: '#8B5CF6', tint: '#EDE9FE' },
      { label: 'Stock Movements', value: String(state.stockMovements.length), hint: 'Audit trail', icon: ReceiptText, color: '#EF4444', tint: '#FEE2E2' },
    ]
  }, [formatCurrency, state.products, state.purchaseOrders, state.salesTransactions, state.stockMovements, currentShift])

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

  function addByScan(rawValue: string) {
    const query = rawValue.replace(/[\r\n]+/g, '').trim().toLowerCase()
    if (!query) return
    const exact = state.products.find((entry) =>
      entry.item_code.toLowerCase() === query ||
      (entry.barcode ?? '').toLowerCase() === query ||
      entry.name.toLowerCase() === query
    )
    const partial = exact ?? state.products.find((entry) =>
      (entry.barcode ?? '').toLowerCase().includes(query) ||
      entry.item_code.toLowerCase().includes(query) ||
      entry.name.toLowerCase().includes(query)
    )
    if (partial) {
      addToCart(partial.id)
      setScanValue('')
      requestAnimationFrame(() => scanRef.current?.focus())
    } else {
      notifyError(`No product found for "${rawValue.trim()}".`)
    }
  }

  function updateQty(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
        .filter(Boolean)
    )
  }

  function setQty(productId: string, value: string) {
    const parsed = Math.floor(Number(value))
    setCart((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 } : item))
    )
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId))
  }

  // Price overrides are a manager-level action. A cashier tapping the price
  // field is denied and nothing changes.
  function updatePrice(productId: string, value: string) {
    if (!perms.canChangePrices) {
      notifyError('Access denied: only a manager can adjust prices.')
      return
    }
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) return
    setCart((current) =>
      current.map((item) => (item.productId === productId ? { ...item, sellingPrice: parsed } : item))
    )
  }

  // Cashier convenience: quick-tender buttons for common peso denominations.
  function addTender(amount: number) {
    setTendered((current) => String((Number(current) || 0) + amount))
  }

  function setExactTender() {
    setTendered(grandTotal > 0 ? String(grandTotal) : '')
  }

  function oversellingItem() {
    return cart.find((item) => {
      const product = state.products.find((entry) => entry.id === item.productId)
      return product ? item.quantity > product.quantity_on_hand : false
    })
  }

  function guardOversell(): boolean {
    const oversell = oversellingItem()
    if (!oversell) return false
    const product = state.products.find((entry) => entry.id === oversell.productId)
    notifyError(`Cannot sell ${oversell.quantity} × ${product?.name ?? 'item'}. Only ${product?.quantity_on_hand ?? 0} in stock.`)
    return true
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
            discount: sale.discount,
            discountLabel: sale.discountLabel,
            totalAmount: sale.grandTotal,
            payMethod: 'qr_ph',
            tendered: sale.grandTotal,
            change: 0,
            reference: '',
            date: new Date(),
            cashierName,
          })
          setShowQrModal(false)
          setQrSession(null)
          setQrError(null)
          setPendingSale(null)
          setShowReceipt(true)
          setCart([])
          setOrderDiscountType('none')
          setManualDiscountPercent(0)
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
    if (!currentShift) {
      notifyError('Open a shift before processing a sale.')
      return
    }
    if (guardOversell()) return
    setQrBusy(true)
    setQrError(null)

    const saleSubtotal = grandTotal
    const locationId = state.locations[0]?.id ?? null
    const receiptHint = `POS-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`
    const saleItems = cart.map((item) => {
      const lineNet = item.sellingPrice * item.quantity - item.discount
      const share = subtotal > 0 ? lineNet / subtotal : 0
      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.sellingPrice,
        unit_cost: item.unitCost,
        discount: item.discount + totalOrderDiscount * share,
      }
    })

    setPendingSale({
      items: cart,
      subtotal,
      discount: totalOrderDiscount,
      discountLabel,
      grandTotal: saleSubtotal,
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
    if (!currentShift) {
      notifyError('Open a shift before completing a sale.')
      return
    }
    if (guardOversell()) return

    if (payMethod === 'qr_ph') {
      void startQrPhCheckout()
      return
    }

    const cashierName = state.users.find((user) => user.id === state.currentUserId)?.full_name ?? 'Cashier'
    const saleItems = cart.map((item) => {
      const lineNet = item.sellingPrice * item.quantity - item.discount
      const share = subtotal > 0 ? lineNet / subtotal : 0
      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.sellingPrice,
        unit_cost: item.unitCost,
        discount: item.discount + totalOrderDiscount * share,
      }
    })

    const result = completeSale({
      payment_method: payMethod,
      payment_provider: 'manual',
      payment_reference: reference.trim() || null,
      amount_tendered: cashEntered,
      location_id: currentShift?.location_id ?? state.locations[0]?.id ?? null,
      notes: `Sold at ${state.tenant.name}`,
      items: saleItems,
    })

    setLastReceipt({
      receiptNo: result.receiptNumber,
      items: cart,
      subtotal,
      discount: totalOrderDiscount,
      discountLabel,
      totalAmount: grandTotal,
      payMethod,
      tendered: cashEntered,
      change: payMethod === 'cash' ? Math.max(cashEntered - grandTotal, 0) : 0,
      reference: reference.trim(),
      date: new Date(),
      cashierName,
    })
    setShowReceipt(true)
    setCart([])
    setOrderDiscountType('none')
    setManualDiscountPercent(0)
    setTendered('')
    setReference('')
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

  function handleOpenShift() {
    if (!openingFloat || Number(openingFloat) < 0) {
      notifyError('Enter a valid starting cash amount.')
      return
    }
    openShift({
      openingFloat: Number(openingFloat),
      locationId: shiftLocationId || (state.locations[0]?.id ?? null),
      notes: shiftNote || undefined,
      station: shiftStation || undefined,
    })
    setShowShiftModal(false)
    setOpeningFloat('')
    setShiftStation('')
    setShiftLocationId(state.locations[0]?.id ?? '')
    setShiftNote('')
    notifySuccess('Shift opened')
  }

  function handleCloseShift() {
    if (!currentShift) return
    if (!countedCash || Number(countedCash) < 0) {
      notifyError('Enter the counted cash amount from the drawer.')
      return
    }
    closeShift(currentShift.id, Number(countedCash), shiftNote || undefined)
    setShowShiftModal(false)
    setCountedCash('')
    setShiftNote('')
    notifySuccess('Shift closed')
  }

  function handleCashMovement() {
    if (!currentShift) {
      notifyError('No active shift. Open a shift first.')
      return
    }
    if (!cashAmount || Number(cashAmount) <= 0) {
      notifyError('Enter a valid amount.')
      return
    }
    recordCashMovement(currentShift.id, cashAction, Number(cashAmount), cashNote || undefined)
    setShowCashModal(false)
    setCashAmount('')
    setCashNote('')
    notifySuccess(cashAction === 'cash_in' ? 'Cash added to drawer' : 'Cash removed from drawer')
  }

  function confirmVoid() {
    if (!targetTx) return
    if (!perms.canVoidSales) {
      notifyError('Access denied: you are not allowed to void sales.')
      return
    }
    if (!voidReason.trim()) {
      notifyError('Please provide a reason for voiding.')
      return
    }
    voidSale(targetTx.id, voidReason.trim())
    setShowVoidModal(false)
    setTargetTx(null)
    setVoidReason('')
    notifySuccess('Transaction voided')
    if (lastReceipt && targetTx.receipt_number === lastReceipt.receiptNo) {
      setShowReceipt(false)
      setLastReceipt(null)
    }
  }

  function confirmRefund() {
    if (!targetTx) return
    if (!perms.canRefundSales) {
      notifyError('Access denied: only a manager can process refunds.')
      return
    }
    if (!refundReason.trim()) {
      notifyError('Please provide a reason for the refund.')
      return
    }
    refundSale(targetTx.id, refundReason.trim())
    setShowRefundModal(false)
    setTargetTx(null)
    setRefundReason('')
    notifySuccess('Refund processed and stock restored')
    if (lastReceipt && targetTx.receipt_number === lastReceipt.receiptNo) {
      setShowReceipt(false)
      setLastReceipt(null)
    }
  }

  const canCheckout = cart.length > 0 && !qrBusy && currentShift && (payMethod !== 'cash' || cashEntered >= grandTotal)
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
            <span className={`badge ${currentShift ? 'badge-green' : 'badge-red'}`}>
              {currentShift ? `Shift ${currentShift.shift_code} Open` : 'No Active Shift'}
            </span>
            {currentShift && (
              <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', display: 'inline-flex', alignItems: 'center' }}>
                <Wallet size={13} style={{ marginRight: 4 }} />
                Float {formatCurrency(Number(currentShift.opening_float))}
              </span>
            )}
            <span className="badge badge-blue">Scanner ready</span>
            <span className="badge badge-teal">Thermal print</span>
            <span className="badge badge-gray" title={`${cashierLabel}${currentShift?.station ? ` · ${currentShift.station}` : ''}`}>
              <UserRound size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />
              {cashierLabel}
              {currentShift?.station ? ` · ${currentShift.station}` : ''}
            </span>
            <span className="badge badge-gray">
              {currentShift
                ? `In ${formatClock(currentShift.opened_at)}`
                : lastClosedShift
                  ? `Out ${formatClock(lastClosedShift.closed_at)}`
                  : 'No shift'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <button className="btn btn-ghost" type="button" onClick={() => scanRef.current?.focus()}>
            <Barcode size={15} /> Focus scanner
          </button>
          {currentShift ? (
            <>
              <button className="btn btn-ghost" type="button" onClick={() => { setCashAction('cash_in'); setShowCashModal(true) }}>
                <Plus size={15} /> Cash In
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setCashAction('cash_out'); setShowCashModal(true) }}>
                <Minus size={15} /> Cash Out
              </button>
              <button className="btn btn-danger" type="button" onClick={() => { setShiftAction('close'); setShowShiftModal(true) }}>
                <Clock size={15} /> Close Shift
              </button>
            </>
          ) : (
            <button className="btn btn-primary" type="button" onClick={() => { setShiftAction('open'); setShowShiftModal(true) }}>
              <Clock size={15} /> Open Shift
            </button>
          )}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, alignItems: 'center' }}>
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
              onChange={(event) => {
                const next = event.target.value
                setScanValue(next)
                if (scanTimer.current) window.clearTimeout(scanTimer.current)
                if (next.trim()) {
                  scanTimer.current = window.setTimeout(() => {
                    addByScan(next)
                    if (scanTimer.current) window.clearTimeout(scanTimer.current)
                    scanTimer.current = null
                  }, 250)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (scanTimer.current) window.clearTimeout(scanTimer.current)
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

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
          {isProduction ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '6px 12px', borderRadius: 999 }}>
              Production business — only finished goods are sold
            </span>
          ) : (
            <>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginRight: 2 }}>Type:</span>
              {[
                { value: 'all', label: 'All' },
                { value: 'finished', label: 'Finished Goods' },
                { value: 'raw', label: 'Raw Materials' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setProdType(option.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    background: prodType === option.value ? '#DCFCE7' : '#FFFFFF',
                    color: prodType === option.value ? '#15803D' : '#475569',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </>
          )}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
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
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{product.name}</div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{product.item_code}</div>
                        {(() => {
                          const isFG = product.is_finished_good || state.productRecipes.some((r) => r.finished_good_id === product.id)
                          const color = isFG ? '#10B981' : '#F59E0B'
                          const label = isFG ? 'Finished Good' : 'Raw Material'
                          return (
                            <span style={{ display: 'inline-block', marginTop: 5, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: `${color}14`, color }}>{label}</span>
                          )
                        })()}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'static', top: 16 }}>
          <section className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 20 }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShoppingBag size={16} color="#3B82F6" /> Current Order
                </h3>
                {cart.length > 0 && (
                  <button onClick={() => { setCart([]); setOrderDiscountType('none'); setManualDiscountPercent(0) }} className="btn btn-danger btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}>
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
                        {perms.canChangePrices ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: '#475569' }}>₱</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.sellingPrice}
                              onChange={(event) => updatePrice(item.productId, event.target.value)}
                              title="Override unit price"
                              style={{ width: 78, fontSize: 11, color: '#0F172A', background: '#FFFFFF', border: '1px solid #D8E4F2', borderRadius: 6, padding: '2px 6px', outline: 'none' }}
                            />
                            <span style={{ fontSize: 11, color: '#475569' }}>/ {item.uom}</span>
                          </div>
                        ) : (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => notifyError('Access denied: only a manager can adjust prices.')}
                            title="Only a manager can adjust prices"
                            style={{ fontSize: 11, color: '#475569', marginTop: 3, cursor: 'not-allowed', userSelect: 'none' }}
                          >
                            {formatCurrency(item.sellingPrice)} / {item.uom}
                          </div>
                        )}
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
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) => setQty(item.productId, event.target.value)}
                          onBlur={(event) => setQty(item.productId, event.target.value)}
                          style={{ width: 44, textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#0F172A', background: '#FFFFFF', border: '1px solid #D8E4F2', borderRadius: 8, padding: '4px 2px', outline: 'none' }}
                        />
                        <button onClick={() => updateQty(item.productId, 1)} style={{ width: 28, height: 28, borderRadius: 8, background: '#F8FBFF', border: '1px solid #D8E4F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                          <Plus size={12} />
                        </button>
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
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>Apply discount</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {([
                    { value: 'none', label: 'None', rate: 0 },
                    { value: 'pwd_senior', label: 'PWD/Senior', rate: 20 },
                    { value: 'employee', label: 'Employee', rate: 15 },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOrderDiscountType(opt.value)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 10,
                        border: `1px solid ${orderDiscountType === opt.value ? '#3B82F6' : '#D8E4F2'}`,
                        background: orderDiscountType === opt.value ? '#EFF6FF' : '#FFFFFF',
                        color: orderDiscountType === opt.value ? '#2563EB' : '#475569',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        {opt.value !== 'none' && <Percent size={11} />}
                        {opt.label}
                      </div>
                      {opt.value !== 'none' && <div style={{ fontSize: 10, marginTop: 2, opacity: 0.85 }}>{opt.rate}%</div>}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Manual discount (%)</span>
                  {!perms.canChangePrices && <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>Manager only</span>}
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={manualDiscountPercent || ''}
                  readOnly={!perms.canChangePrices}
                  onMouseDown={(event) => {
                    if (!perms.canChangePrices) {
                      event.preventDefault()
                      notifyError('Access denied: only a manager can apply a manual discount.')
                    }
                  }}
                  onChange={(event) => {
                    if (!perms.canChangePrices) return
                    setManualDiscountPercent(Math.min(100, Math.max(Number(event.target.value) || 0, 0)))
                  }}
                  placeholder="0"
                  style={{ width: '100%', background: perms.canChangePrices ? '#FFFFFF' : '#F1F5F9', border: '1px solid #D8E4F2', borderRadius: 8, padding: '8px 10px', color: '#0F172A', fontSize: 13, outline: 'none', cursor: perms.canChangePrices ? 'text' : 'not-allowed' }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#475569', fontSize: 13 }}>Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>{formatCurrency(subtotal)}</span>
                </div>
                {discountLines.map((entry) => (
                  <div key={entry.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#DC2626', fontSize: 13 }}>{entry.label}</span>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#DC2626' }}>-{formatCurrency(entry.amount)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #E2E8F0', paddingTop: 10 }}>
                  <span style={{ color: '#0F172A', fontSize: 14, fontWeight: 800 }}>Total</span>
                  <span style={{ fontWeight: 900, fontSize: 22, color: '#0F172A' }}>{formatCurrency(grandTotal)}</span>
                </div>
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

              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, margin: '2px 0 8px' }}>
                Direct (store account / e-wallet)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
                {([
                  ['gcash', 'GCash', Wallet],
                  ['maya', 'Maya', Wallet],
                  ['bdo', 'BDO', Landmark],
                  ['maribank', 'Maribank', Landmark],
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={setExactTender}
                      disabled={grandTotal <= 0}
                      style={{ padding: '7px 4px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 800, cursor: grandTotal > 0 ? 'pointer' : 'not-allowed' }}
                    >
                      Exact
                    </button>
                    {[20, 50, 100, 200, 500, 1000].map((denom) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() => addTender(denom)}
                        style={{ padding: '7px 4px', borderRadius: 8, border: '1px solid #D8E4F2', background: '#FFFFFF', color: '#475569', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        +{denom}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTendered('')}
                      style={{ padding: '7px 4px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                  {cashEntered >= grandTotal && grandTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: '#475569' }}>Change</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#2563EB' }}>{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {MANUAL_METHODS.has(payMethod) && (() => {
                const label = paymentLabel(payMethod)
                const details = storePaymentDetails(state.tenant, payMethod)
                return (
                  <div style={{ marginBottom: 12, padding: '12px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Scan this to pay — {label}</div>
                    {details.qrUrl ? (
                      <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={details.qrUrl}
                          alt={`${label} QR code`}
                          onClick={() => setQrZoom(details.qrUrl)}
                          style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0', cursor: 'zoom-in' }}
                        />
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>Tap image to enlarge</div>
                      </div>
                    ) : null}
                    {details.account ? (
                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{label} account:</span> {details.account}
                      </div>
                    ) : null}
                    {!details.qrUrl && !details.account ? (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>
                        No {label} account set. Add it in Settings → Store payment accounts to show a QR here.
                      </div>
                    ) : null}
                    <label style={{ fontSize: 11, color: '#475569', display: 'block', marginBottom: 5, marginTop: 4 }}>Reference (optional)</label>
                    <input className="input" placeholder="GCash/transaction ref, last 4, etc." value={reference} onChange={(event) => setReference(event.target.value)} style={{ height: 42, fontSize: 14, borderRadius: 12 }} />
                  </div>
                )
              })()}


              {payMethod === 'qr_ph' && (
                <div style={{ marginBottom: 12, padding: '12px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', color: '#475569', fontSize: 12, lineHeight: 1.5 }}>
                  Generate a PayMongo QR Ph code for this exact total. Once the customer pays, the system will confirm it and save the sale automatically.
                </div>
              )}

              {cart.length > 0 && !currentShift && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#B91C1C',
                    marginBottom: 12,
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 12.5, lineHeight: 1.4, flex: 1 }}>
                    <strong style={{ fontWeight: 800 }}>Open a shift first.</strong> You can&rsquo;t complete a sale until a shift is open.
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => { setShiftAction('open'); setShowShiftModal(true) }}
                    style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
                  >
                    <Clock size={14} /> Open Shift
                  </button>
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
              {recentTx.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '26px 10px', color: '#94A3B8' }}>
                  <ReceiptText size={28} style={{ marginBottom: 8, opacity: 0.35 }} />
                  <p style={{ fontSize: 12 }}>No transactions yet</p>
                </div>
              ) : recentTx.map((tx) => {
                const cashier = tx.cashier?.full_name ?? 'Cashier'
                const total = Number(tx.total_amount ?? 0)
                const paidVia = paymentLabel(tx.payment_method)
                const count = tx.items?.length ?? 0
                const isCompleted = tx.status === 'completed'
                const isVoided = tx.status === 'voided'
                const isRefunded = tx.status === 'refunded'
                return (
                  <div
                    key={tx.id}
                    onClick={(e) => {
                      if (!isCompleted) return
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
                        discount: 0,
                        discountLabel: null,
                        totalAmount: total,
                        payMethod: tx.payment_method,
                        tendered: Number(tx.amount_tendered ?? total),
                        change: Number(tx.change_amount ?? 0),
                        reference: tx.payment_reference ?? '',
                        date: new Date(tx.created_at),
                        cashierName: cashier,
                      })
                      setShowReceipt(true)
                    }}
                    style={{
                      textAlign: 'left',
                      border: `1px solid ${isVoided ? '#FECACA' : isRefunded ? '#DEF7EC' : '#E2E8F0'}`,
                      borderRadius: 14,
                      padding: 14,
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      opacity: isVoided || isRefunded ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{tx.receipt_number}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                           {formatTimestamp(tx.created_at)}
                          {isVoided && <span style={{ marginLeft: 6, color: '#B91C1C', fontWeight: 700 }}>VOIDED</span>}
                          {isRefunded && <span style={{ marginLeft: 6, color: '#047857', fontWeight: 700 }}>REFUNDED</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: isVoided ? '#B91C1C' : '#10B981' }}>{formatCurrency(total)}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{paidVia}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#64748B' }}>
                      <span>{count} item{count !== 1 ? 's' : ''}</span>
                      <span>{cashier}</span>
                    </div>
                    {isCompleted && currentShift && tx.shift_id === currentShift.id && (perms.canVoidSales || perms.canRefundSales) && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                        {perms.canVoidSales && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setTargetTx(tx); setShowVoidModal(true) }}
                            style={{ fontSize: 10, padding: '2px 8px', color: '#B91C1C' }}
                          >
                            <Trash2 size={12} /> Void
                          </button>
                        )}
                        {perms.canRefundSales && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setTargetTx(tx); setShowRefundModal(true) }}
                            style={{ fontSize: 10, padding: '2px 8px', color: '#047857' }}
                          >
                            <Repeat size={12} /> Refund
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
                {lastReceipt.discount > 0 && (
                  <div><span>{lastReceipt.discountLabel ?? 'Discount'}</span><strong>-{formatCurrency(lastReceipt.discount)}</strong></div>
                )}
                <div><span>Payment</span><strong>{paymentLabel(lastReceipt.payMethod)}</strong></div>
                {lastReceipt.reference ? (
                  <div><span>Reference</span><strong>{lastReceipt.reference}</strong></div>
                ) : null}
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

      {qrZoom && (
        <div className="modal-overlay pos-print-hide" style={{ cursor: 'zoom-out' }}>
          <div onClick={(event) => event.stopPropagation()} style={{ background: '#fff', padding: 18, borderRadius: 16, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(15,23,42,0.25)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrZoom} alt="QR code" style={{ width: '100%', maxWidth: 340, height: 'auto', display: 'block', margin: '0 auto', borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0' }} />
            <button className="btn btn-ghost" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={() => setQrZoom(null)}>
              <X size={14} /> Close
            </button>
          </div>
        </div>
      )}

      {showShiftModal && (
        <div className="modal-overlay pos-print-hide">
          <div className="modal" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ padding: '20px 20px 0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                {shiftAction === 'open' ? 'Open New Shift' : 'Close Current Shift'}
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                {shiftAction === 'open'
                  ? 'Set the starting cash float in the drawer. This is the opening balance.'
                  : 'Count the cash currently in the drawer. Variance will be calculated automatically.'}
              </p>
              <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 6 }}>
                {shiftAction === 'open' ? 'Starting Cash (PHP)' : 'Counted Cash (PHP)'}
              </label>
              <input
                className="input"
                type="number"
                min={0}
                placeholder="0.00"
                value={shiftAction === 'open' ? openingFloat : countedCash}
                onChange={(event) => shiftAction === 'open' ? setOpeningFloat(event.target.value) : setCountedCash(event.target.value)}
                style={{ height: 44, fontSize: 18, fontWeight: 700, borderRadius: 12, marginBottom: 12 }}
              />
              {currentShift && shiftAction === 'close' && (
                <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #D8E4F2', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#475569' }}>Opening float</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(Number(currentShift.opening_float))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#475569' }}>Expected cash</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(Number(currentShift.opening_float) + Number(currentShift.total_sales || 0))}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Shift: {currentShift.shift_code}</div>
                </div>
              )}
              {shiftAction === 'open' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 6 }}>Store / Location</label>
                  <select
                    className="input"
                    value={shiftLocationId}
                    onChange={(event) => setShiftLocationId(event.target.value)}
                    style={{ height: 42, borderRadius: 12, marginBottom: 4 }}
                  >
                    {state.locations.length === 0 ? (
                      <option value="">No locations configured</option>
                    ) : (
                      state.locations.map((location) => (
                        <option key={location.id} value={location.id}>{location.name} ({location.code})</option>
                      ))
                    )}
                  </select>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Sales during this shift are tagged to this location.</div>
                </div>
              )}
              {shiftAction === 'open' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 6 }}>Station / Bay (optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. Bay 1, Register A"
                    value={shiftStation}
                    onChange={(event) => setShiftStation(event.target.value)}
                    style={{ height: 42, borderRadius: 12, marginBottom: 4 }}
                  />
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Identifies which register this cashier is working from.</div>
                </div>
              )}
              <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
              <input
                className="input"
                placeholder={shiftAction === 'open' ? 'e.g. Morning shift' : 'Any discrepancies...'}
                value={shiftNote}
                onChange={(event) => setShiftNote(event.target.value)}
                style={{ height: 42, borderRadius: 12, marginBottom: 16 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowShiftModal(false)}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={shiftAction === 'open' ? handleOpenShift : handleCloseShift}>
                  <Check size={14} /> {shiftAction === 'open' ? 'Open Shift' : 'Close Shift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCashModal && (
        <div className="modal-overlay pos-print-hide">
          <div className="modal" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ padding: '20px 20px 0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                {cashAction === 'cash_in' ? 'Cash In' : 'Cash Out'}
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                {cashAction === 'cash_in'
                  ? 'Add cash to the drawer (e.g. change fund refill).'
                  : 'Remove cash from the drawer (e.g. drop to safe).'}
              </p>
              <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 6 }}>Amount (PHP)</label>
              <input
                className="input"
                type="number"
                min={0}
                placeholder="0.00"
                value={cashAmount}
                onChange={(event) => setCashAmount(event.target.value)}
                style={{ height: 44, fontSize: 18, fontWeight: 700, borderRadius: 12, marginBottom: 12 }}
              />
              <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 6 }}>Note (optional)</label>
              <input
                className="input"
                placeholder={cashAction === 'cash_in' ? 'Reason for adding cash' : 'Reason for removing cash'}
                value={cashNote}
                onChange={(event) => setCashNote(event.target.value)}
                style={{ height: 42, borderRadius: 12, marginBottom: 16 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCashModal(false)}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCashMovement}>
                  <Check size={14} /> {cashAction === 'cash_in' ? 'Add Cash' : 'Remove Cash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVoidModal && (
        <div className="modal-overlay pos-print-hide">
          <div className="modal" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ padding: '20px 20px 0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#B91C1C', marginBottom: 4 }}>Void Transaction</h3>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                This will cancel {targetTx?.receipt_number ?? 'this transaction'} and restore the stock. This action cannot be undone.
              </p>
              <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 6 }}>Reason for voiding</label>
              <input
                className="input"
                placeholder="e.g. Customer changed mind"
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                style={{ height: 42, borderRadius: 12, marginBottom: 16 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowVoidModal(false); setTargetTx(null); setVoidReason('') }}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmVoid}>
                  <Trash2 size={14} /> Void
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && (
        <div className="modal-overlay pos-print-hide">
          <div className="modal" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ padding: '20px 20px 0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#047857', marginBottom: 4 }}>Process Refund</h3>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                This will refund {targetTx?.receipt_number ?? 'this transaction'} and restore the stock to inventory.
              </p>
              <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 6 }}>Reason for refund</label>
              <input
                className="input"
                placeholder="e.g. Item defective"
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                style={{ height: 42, borderRadius: 12, marginBottom: 16 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowRefundModal(false); setTargetTx(null); setRefundReason('') }}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmRefund}>
                  <Repeat size={14} /> Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
