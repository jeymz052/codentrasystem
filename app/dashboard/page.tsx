'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowUpDown, CreditCard, DollarSign, Package, ShoppingCart, TrendingDown, Users } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'

export default function DashboardPage() {
  const { state, stats, formatCurrency } = useDemoSystem()

  const statCards = [
    { label: 'Total SKUs', value: String(stats.total_products), sub: 'Active products', icon: <Package size={18} />, color: '#3B82F6' },
    { label: 'Inventory Value', value: formatCurrency(stats.total_value), sub: 'Based on unit cost', icon: <DollarSign size={18} />, color: '#10B981' },
    { label: 'Low Stock', value: String(stats.low_stock_count), sub: `${stats.out_of_stock_count} out of stock`, icon: <TrendingDown size={18} />, color: '#F59E0B', alert: true },
    { label: 'Open Alerts', value: String(stats.open_alerts), sub: 'Needs attention', icon: <AlertTriangle size={18} />, color: '#EF4444', alert: true },
    { label: 'Pending Orders', value: String(stats.pending_orders), sub: 'Purchase orders', icon: <ShoppingCart size={18} />, color: '#8B5CF6' },
    { label: "Today's Sales", value: formatCurrency(stats.sales_today), sub: `${stats.transactions_today} transactions`, icon: <CreditCard size={18} />, color: '#2563EB' },
    { label: 'Stock Movements', value: String(state.stockMovements.length), sub: 'Audit trail', icon: <ArrowUpDown size={18} />, color: '#3B82F6' },
    { label: 'Active Users', value: String(state.users.filter((user) => user.is_active).length), sub: 'Admin, Manager, Cashier', icon: <Users size={18} />, color: '#8B5CF6' },
  ]

  const lowStock = state.products
    .filter((product) => product.is_active && product.quantity_on_hand <= product.reorder_point)
    .slice(0, 4)

  const recentMovements = [...state.stockMovements].slice(-5).reverse()

  const quickLinks = [
    { href: '/dashboard/pos', label: 'Open POS', color: '#2563EB', desc: 'Start selling' },
    { href: '/dashboard/inventory', label: 'Add Item', color: '#3B82F6', desc: 'Add new product' },
    { href: '/dashboard/orders', label: 'Create PO', color: '#8B5CF6', desc: 'New purchase order' },
    { href: '/dashboard/reports', label: 'Reports', color: '#0F766E', desc: 'See performance trends' },
  ]
  const recentAlerts = [...state.alerts].slice(-5).reverse()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            Good morning!
          </h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {state.tenant.name} is running on the {state.tenant.plan} plan as of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/dashboard/pos" className="btn btn-teal" style={{ textDecoration: 'none' }}>
            <CreditCard size={15} /> Open POS
          </Link>
          <Link href="/dashboard/inventory" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Package size={15} /> Inventory
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 24 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 24 }}>
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '14px 16px', border: `1px solid ${link.color}33`, cursor: 'pointer' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: link.color }}>{link.label}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{link.desc}</div>
            </div>
          </Link>
          ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
