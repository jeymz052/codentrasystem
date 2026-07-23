'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, ArrowUpDown, BarChart3, Boxes, CheckCircle2, CreditCard, DollarSign, LayoutDashboard, Package, PieChart, ShoppingCart, TrendingDown, Users, X } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { formatRoleLabel } from '@/lib/access-control'
import { formatTimestamp } from '@/lib/utils'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

function formatShortDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No renewal date'
}

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { state, stats, formatCurrency } = useDemoSystem()
  const router = useRouter()
  const visibleUsers = state.users
  const activeUsers = visibleUsers.filter((user) => user.is_active)
  const activeUserNames = activeUsers.map((user) => `${user.full_name || user.email || 'Unknown'} (${formatRoleLabel(user.role)})`).join(', ')
  const plan = SUBSCRIPTION_PLANS.find((entry) => entry.plan === state.tenant.plan) ?? SUBSCRIPTION_PLANS[0]
  const isProduction = state.tenant.enable_production ?? false
  const greeting = getGreeting(new Date().getHours())
  const renewalDate = state.tenant.subscription_status === 'trial' ? state.tenant.trial_ends_at : state.tenant.subscription_ends_at
  const renewalLabel = renewalDate
    ? `${state.tenant.subscription_status === 'trial' ? 'Trial ends' : 'Renews'} ${formatShortDate(renewalDate)}`
    : 'No renewal date'

  const billingBanner = (() => {
    const st = state.tenant.subscription_status
    const daysLeft = (iso: string | null) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)) : null)
    if (st === 'trial' && state.tenant.trial_ends_at) {
      const d = daysLeft(state.tenant.trial_ends_at)
      return { tone: 'warning' as const, text: `Free trial — ${d} day${d === 1 ? '' : 's'} left. Subscribe to keep access after ${formatShortDate(state.tenant.trial_ends_at)}.` }
    }
    if (st === 'past_due' && state.tenant.grace_period_ends_at) {
      const d = daysLeft(state.tenant.grace_period_ends_at)
      return { tone: 'danger' as const, text: `Payment failed. Update your card within ${d} day${d === 1 ? '' : 's'} (by ${formatShortDate(state.tenant.grace_period_ends_at)}) or your subscription ends.` }
    }
    if (st === 'suspended') {
      return { tone: 'danger' as const, text: 'Your subscription is suspended. Subscribe from Settings to restore full access.' }
    }
    if (state.tenant.cancel_at_period_end && state.tenant.current_period_end) {
      return { tone: 'warning' as const, text: `Subscription set to cancel on ${formatShortDate(state.tenant.current_period_end)}.` }
    }
    return null
  })()
  const planUsage = [
    { label: 'Users', used: visibleUsers.length, limit: typeof plan.users === 'number' ? plan.users : visibleUsers.length, color: '#2563EB' },
    { label: 'Products', used: state.products.length, limit: typeof plan.products === 'number' ? plan.products : state.products.length, color: '#10B981' },
    { label: 'Locations', used: state.locations.filter((location) => !location.is_waste_location).length, limit: typeof plan.locations === 'number' ? plan.locations : state.locations.filter((location) => !location.is_waste_location).length, color: '#F59E0B' },
  ].map((item) => ({
    ...item,
    percent: Math.min(Math.round((item.used / Math.max(item.limit, 1)) * 100), 100),
  }))

  const statCards = [
    { label: 'Total SKUs', value: String(stats.total_products), sub: 'Active products', icon: <Package size={18} />, color: '#3B82F6' },
    { label: 'Inventory Value', value: formatCurrency(stats.materials_value), sub: 'Raw materials & packing', icon: <DollarSign size={18} />, color: '#10B981' },
    ...(isProduction
      ? [{
          label: 'Finished Goods',
          value: formatCurrency(stats.finished_goods_value),
          sub: 'Based on POS selling price',
          icon: <Boxes size={18} />,
          color: '#0EA5E9',
        }]
      : []),
    { label: 'Low Stock', value: String(stats.low_stock_count), sub: `${stats.out_of_stock_count} out of stock`, icon: <TrendingDown size={18} />, color: '#F59E0B', alert: true },
    { label: 'Open Alerts', value: String(stats.open_alerts), sub: 'Needs attention', icon: <AlertTriangle size={18} />, color: '#EF4444', alert: true },
    { label: 'Pending Orders', value: String(stats.pending_orders), sub: 'Purchase orders', icon: <ShoppingCart size={18} />, color: '#8B5CF6' },
    { label: "Today's Sales", value: formatCurrency(stats.sales_today), sub: `${stats.transactions_today} transactions`, icon: <CreditCard size={18} />, color: '#2563EB' },
    { label: 'Stock Movements', value: String(state.stockMovements.length), sub: 'Audit trail', icon: <ArrowUpDown size={18} />, color: '#3B82F6' },
    { label: 'Active Users', value: String(activeUsers.length), sub: activeUserNames || 'No active users', icon: <Users size={18} />, color: '#8B5CF6' },
  ]

  const lowStock = state.products
    .filter((product) => product.is_active && product.quantity_on_hand <= product.reorder_point)
    .slice(0, 4)
  const outOfStockCount = state.alerts.filter((alert) => alert.status === 'open' && alert.alert_type === 'out_of_stock').length
  const lowStockCount = state.alerts.filter((alert) => alert.status === 'open' && alert.alert_type === 'low_stock').length

  const recentMovements = [...state.stockMovements]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const recentAlerts = [...state.alerts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const movementMix = useMemo(() => {
    const counts = state.stockMovements.reduce<Record<string, number>>((accumulator, movement) => {
      accumulator[movement.movement_type] = (accumulator[movement.movement_type] ?? 0) + Number(movement.quantity ?? 0)
      return accumulator
    }, {})
    const labels = [
      { key: 'inbound', label: 'Inbound', color: '#10B981' },
      { key: 'outbound', label: 'Outbound', color: '#EF4444' },
      { key: 'adjustment', label: 'Adjustment', color: '#8B5CF6' },
      { key: 'production', label: 'Production', color: '#3B82F6' },
    ]
    const max = Math.max(...labels.map((item) => counts[item.key] ?? 0), 1)
    return labels.map((item) => ({
      ...item,
      value: counts[item.key] ?? 0,
      width: `${Math.max(((counts[item.key] ?? 0) / max) * 100, 6)}%`,
    }))
  }, [state.stockMovements])

  const salesPulse = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const key = date.toISOString().slice(0, 10)
      return { key, label: date.toLocaleDateString('en-US', { weekday: 'short' }) }
    })

    const salesByDay = state.salesTransactions
      .filter((tx) => tx.status === 'completed')
      .reduce<Record<string, number>>((accumulator, tx) => {
        const key = tx.created_at.slice(0, 10)
        accumulator[key] = (accumulator[key] ?? 0) + Number(tx.total_amount ?? 0)
        return accumulator
      }, {})

    const max = Math.max(...days.map((day) => salesByDay[day.key] ?? 0), 1)
    return days.map((day) => ({
      ...day,
      value: salesByDay[day.key] ?? 0,
      height: `${Math.max(((salesByDay[day.key] ?? 0) / max) * 100, 8)}%`,
    }))
  }, [state.salesTransactions])

  const quickLinks = [
    { href: '/dashboard/pos', label: 'Open POS', color: '#2563EB', desc: 'Start selling' },
    { href: '/dashboard/inventory', label: 'Add Item', color: '#3B82F6', desc: 'Add new product' },
    { href: '/dashboard/orders', label: 'Create PO', color: '#8B5CF6', desc: 'New purchase order' },
    { href: '/dashboard/reports?tab=Sales%20Summary&range=daily', label: 'Daily Sales', color: '#0F766E', desc: 'One-click daily report' },
    { href: '/dashboard/reports?tab=Sales%20Summary&range=weekly', label: 'Weekly Sales', color: '#14B8A6', desc: 'One-click weekly report' },
    { href: '/dashboard/reports', label: 'Reports', color: '#0F766E', desc: 'See performance trends' },
  ]

  const navTiles = [
    { href: '/dashboard', label: 'Dashboard', desc: 'Overview', icon: LayoutDashboard, color: '#2563EB' },
    { href: '/dashboard/inventory', label: 'Inventory', desc: 'Products', icon: Package, color: '#10B981' },
    { href: '/dashboard/movements', label: 'Movements', desc: 'Audit trail', icon: ArrowUpDown, color: '#3B82F6' },
    { href: '/dashboard/reports', label: 'Reports', desc: 'Trends', icon: BarChart3, color: '#8B5CF6' },
    { href: '/dashboard/pos', label: 'POS', desc: 'Selling screen', icon: CreditCard, color: '#0EA5E9' },
    { href: '/dashboard/orders', label: 'Orders', desc: 'Purchase flow', icon: ShoppingCart, color: '#F59E0B' },
  ]

  const topProducts = useMemo(() => {
    const completedIds = new Set(state.salesTransactions.filter((tx) => tx.status === 'completed').map((tx) => tx.id))
    const totals: Record<string, { qty: number; revenue: number }> = {}
    for (const item of state.salesTransactionItems) {
      if (!completedIds.has(item.transaction_id)) continue
      const id = item.product_id
      totals[id] = totals[id] ?? { qty: 0, revenue: 0 }
      totals[id].qty += Number(item.quantity ?? 0)
      totals[id].revenue += Number(item.subtotal ?? 0)
    }

    const entries = Object.entries(totals)
      .map(([id, value]) => {
        const product = state.products.find((entry) => entry.id === id)
        return { id, name: product?.name ?? 'Unknown item', qty: value.qty, revenue: value.revenue }
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    const max = Math.max(...entries.map((entry) => entry.qty), 1)
    return entries.map((entry) => ({ ...entry, width: `${(entry.qty / max) * 100}%` }))
  }, [state.salesTransactionItems, state.salesTransactions, state.products])

  const categoryBreakdown = useMemo(() => {
    const colorOf = (name: string) => state.categories.find((entry) => entry.name === name)?.color ?? '#94A3B8'
    const byCategory: Record<string, number> = {}
    for (const product of state.products) {
      const name = product.category?.name ?? 'Uncategorized'
      byCategory[name] = (byCategory[name] ?? 0) + Number(product.unit_cost ?? 0) * Number(product.quantity_on_hand ?? 0)
    }

    const all = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value, color: colorOf(name) }))
      .sort((a, b) => b.value - a.value)

    const total = all.reduce((sum, entry) => sum + entry.value, 0) || 1
    const top = all.slice(0, 5)
    const rest = all.slice(5)
    const segments = [...top]
    if (rest.length > 0) {
      segments.push({ name: 'Other', value: rest.reduce((sum, entry) => sum + entry.value, 0), color: '#94A3B8' })
    }

    let accumulated = 0
    const built = segments.map((segment) => {
      const start = (accumulated / total) * 360
      accumulated += segment.value
      const end = (accumulated / total) * 360
      return { ...segment, start, end, pct: Math.round((segment.value / total) * 100) }
    })

    const gradient = `conic-gradient(${built.map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`).join(', ')})`
    return { segments: built, total, gradient }
  }, [state.products, state.categories])

  return (
    <div>
      {billingBanner && (
        <Link
          href="/dashboard/settings#billing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.5,
            color: billingBanner.tone === 'danger' ? '#B91C1C' : '#B45309',
            background: billingBanner.tone === 'danger' ? '#FEF2F2' : '#FFFBEB',
            border: `1px solid ${billingBanner.tone === 'danger' ? '#FECACA' : '#FDE68A'}`,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{billingBanner.text}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            Manage billing <ArrowRight size={14} />
          </span>
        </Link>
      )}
      <div className="card" style={{ position: 'relative', padding: 24, marginBottom: 22, borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(135deg, #F8FBFF 0%, #FFFFFF 58%, #EEF6FF 100%)' }}>
        <div style={{ position: 'absolute', inset: 'auto -80px -70px auto', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.20) 0%, rgba(59,130,246,0.00) 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: '-70px auto auto -90px', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.00) 68%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 760 }}>
            <div className="auth-badge" style={{ marginBottom: 14 }}>
              {greeting}, {state.tenant.name}
            </div>
            <h2 style={{ fontSize: 'clamp(1.9rem, 3vw, 2.7rem)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.05em', lineHeight: 1.02 }}>
              Your {plan.name} workspace is ready
            </h2>
            <p style={{ color: '#475569', fontSize: 14, marginTop: 8, maxWidth: 720, lineHeight: 1.6 }}>
              {plan.description} {plan.name} gives you up to {plan.users} users, {plan.products} products, and {plan.locations} locations.
              <span style={{ fontWeight: 700, color: '#0F172A' }}> {renewalLabel}.</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/dashboard/pos" className="btn btn-teal" style={{ textDecoration: 'none' }}>
              <CreditCard size={15} /> Open POS
            </Link>
            <Link href="/dashboard/inventory" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <Package size={15} /> Inventory
            </Link>
              <Link href="/dashboard/reports?tab=Sales%20Summary&range=daily" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              <ArrowUpDown size={15} /> Sales Reports
            </Link>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          <span className="badge badge-blue">{plan.name} plan</span>
          <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1' }}>{plan.users} users</span>
          <span className="badge" style={{ background: '#DCFCE7', color: '#166534' }}>{plan.products} products</span>
          <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>{plan.locations} locations</span>
          <span className="badge" style={{ background: '#EEF2FF', color: '#4338CA' }}>{renewalLabel}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 18, position: 'relative', zIndex: 1 }}>
          <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.76)', border: '1px solid #D8E4F2', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>Workspace capacity</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Plan usage at a glance</div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {planUsage.map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                    <span style={{ color: '#475569', fontWeight: 700 }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: 800 }}>{item.used}/{item.limit}</span>
                  </div>
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(item.percent, 6)}%`, height: '100%', background: item.color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 16, background: 'rgba(239,246,255,0.9)', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>Health snapshot</div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#64748B' }}>Low stock</span>
                <span style={{ color: '#EF4444', fontWeight: 800 }}>{stats.low_stock_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#64748B' }}>Open alerts</span>
                <span style={{ color: '#EF4444', fontWeight: 800 }}>{stats.open_alerts}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#64748B' }}>Movements</span>
                <span style={{ color: '#2563EB', fontWeight: 800 }}>{state.stockMovements.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#64748B' }}>Today sales</span>
                <span style={{ color: '#10B981', fontWeight: 800 }}>{formatCurrency(stats.sales_today)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="card" style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid #FECACA', background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: '0 12px 30px rgba(239, 68, 68, 0.10)', marginBottom: 18 }}>
          <Link href="/dashboard/inventory?filter=low" style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#B91C1C', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Attention needed</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 3 }}>
                {lowStockCount} low-stock item{lowStockCount === 1 ? '' : 's'} and {outOfStockCount} out-of-stock item{outOfStockCount === 1 ? '' : 's'} need attention.
              </div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/inventory')}>
              <Package size={13} /> View all
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Quick navigation</h3>
          <span style={{ fontSize: 12, color: '#64748B' }}>Jump to any workspace</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {navTiles.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '16px', border: '1px solid #D8E4F2', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: `linear-gradient(135deg, ${item.color}2E, ${item.color}12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <ArrowRight size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {statCards.map((item) => (
          <div key={item.label} className="card" style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            {'alert' in item && item.alert && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: item.color }} />}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${item.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                {item.icon}
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'alert' in item && item.alert ? item.color : '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {item.value}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 5 }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'alert' in item && item.alert ? item.color : '#64748B', marginTop: 3 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ padding: 18, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Sales pulse</h3>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Quick view of the last 7 days.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/dashboard/reports?tab=Sales%20Summary&range=daily" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Daily</Link>
              <Link href="/dashboard/reports?tab=Sales%20Summary&range=weekly" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Weekly</Link>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 180, paddingBottom: 4 }}>
            {salesPulse.map((day) => (
              <div key={day.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{formatCurrency(day.value)}</div>
                <div style={{ width: '100%', height: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ width: '72%', height: day.height, minHeight: 8, borderRadius: 8, background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.15)' }} />
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{day.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Movement mix</h3>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Graphical breakdown of stock activity.</p>
            </div>
            <Link href="/dashboard/movements" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>View ledger</Link>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {movementMix.map((item) => (
              <div key={item.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: '#0F172A', fontWeight: 700 }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 800 }}>{item.value} units</span>
                </div>
                <div style={{ height: 10, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: item.width, height: '100%', background: item.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Alert timeline</h3>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Most recent stock alerts with timestamps.</p>
            </div>
            <span className="badge badge-blue">{stats.open_alerts} open</span>
          </div>
          {recentAlerts.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13 }}>No active alerts right now.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {recentAlerts.map((alert) => {
                const product = state.products.find((item) => item.id === alert.product_id)
                const color = alert.alert_type === 'out_of_stock' ? '#EF4444' : '#F59E0B'
                return (
                  <div key={alert.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{product?.name ?? 'Unknown item'}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{alert.message}</div>
                       <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>{formatTimestamp(alert.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {alert.purchase_order_id ? (
                        <span className="badge" style={{ background: '#10B98114', color: '#059669', fontSize: 10 }}>ordered</span>
                      ) : (
                        <span className="badge" style={{ background: `${color}14`, color, fontSize: 10 }}>{alert.status}</span>
                      )}
                      {alert.status === 'open' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => {
                          const p = state.products.find((item) => item.id === alert.product_id)
                          if (p?.is_finished_good) router.push('/dashboard/production')
                          else router.push(`/dashboard/orders?restock=${alert.product_id}`)
                        }} title="Restock"><ShoppingCart size={13} /></button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ padding: 18, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Top Selling Products</h3>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Best movers by units sold.</p>
            </div>
            <BarChart3 size={16} color="#3B82F6" />
          </div>
          {topProducts.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13 }}>No sales recorded yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {topProducts.map((item, index) => (
                <div key={item.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, #2563EB, #3B82F6)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{index + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', flexShrink: 0 }}>{item.qty} sold</span>
                  </div>
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: item.width, height: '100%', background: 'linear-gradient(90deg, #60A5FA, #2563EB)', borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{formatCurrency(item.revenue)} revenue</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 18, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Inventory by Category</h3>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Stock value distribution.</p>
            </div>
            <PieChart size={16} color="#8B5CF6" />
          </div>
          {categoryBreakdown.segments.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13 }}>No inventory yet.</p>
          ) : (
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 132, height: 132, borderRadius: '50%', background: categoryBreakdown.gradient, flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 26, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Total</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{formatCurrency(categoryBreakdown.total)}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 160 }}>
                {categoryBreakdown.segments.map((segment) => (
                  <div key={segment.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: segment.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{segment.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>{segment.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Critical Stock Levels</h3>
            <Link href="/dashboard/inventory?filter=low" style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>
              View all
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13 }}>No low-stock items right now.</p>
          ) : (
            lowStock.map((product) => {
              const pct = Math.max((product.quantity_on_hand / Math.max(product.reorder_point * 4, 1)) * 100, 0)
              const color = product.quantity_on_hand === 0 ? '#EF4444' : '#F59E0B'
              return (
                <div key={product.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{product.name}</span>
                      <span style={{ fontSize: 10, color: '#64748B', marginLeft: 8 }}>{product.item_code}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color }}>
                      {product.quantity_on_hand} <span style={{ fontSize: 10, fontWeight: 400, color: '#64748B' }}>/ reorder: {product.reorder_point}</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Recent Movements</h3>
            <Link href="/dashboard/movements" style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>
              View all
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13 }}>No stock movements yet.</p>
          ) : (
            recentMovements.map((movement) => {
              const product = state.products.find((item) => item.id === movement.product_id)
              const isOutbound = movement.movement_type === 'outbound'
              const color = isOutbound ? '#EF4444' : '#10B981'
              return (
                <div key={movement.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowUpDown size={14} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{product?.name ?? 'Unknown item'}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{movement.reference_type ?? 'movement'} · {new Date(movement.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color }}>
                    {isOutbound ? '-' : '+'}{movement.quantity}
                  </span>
                  <span className="badge" style={{ background: `${color}14`, color, fontSize: 10 }}>
                    {movement.movement_type}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '18px 20px', marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Recent Notifications</h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Notifications now live in the top-right bell.</p>
          </div>
          <span className="badge badge-blue" style={{ fontSize: 10 }}>{stats.open_alerts} open</span>
        </div>
        {recentAlerts.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: 13 }}>No recent notifications.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {recentAlerts.map((alert) => {
              const product = state.products.find((item) => item.id === alert.product_id)
              const color = alert.alert_type === 'out_of_stock' ? '#EF4444' : '#F59E0B'
              return (
                <div key={alert.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{product?.name ?? 'Unknown item'}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{alert.message}</div>
                  </div>
                  <span className="badge" style={{ background: `${color}14`, color, fontSize: 10 }}>{alert.status}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
