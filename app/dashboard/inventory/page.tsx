'use client'

import Link from 'next/link'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Edit2, Package, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useDemoSystem } from '@/components/demo-system-provider'
import type { ProductDraft } from '@/lib/demo-system'

type ProductForm = {
  item_code: string
  name: string
  category: string
  uom: string
  unit_cost: string
  selling_price: string
  quantity_on_hand: string
  reorder_point: string
  supplier: string
  location: string
  description: string
}

const EMPTY_FORM: ProductForm = {
  item_code: '',
  name: '',
  category: '',
  uom: 'pcs',
  unit_cost: '',
  selling_price: '',
  quantity_on_hand: '',
  reorder_point: '',
  supplier: '',
  location: '',
  description: '',
}

const IMPORT_COLUMNS = [
  'item_code',
  'name',
  'category',
  'supplier',
  'uom',
  'unit_cost',
  'selling_price',
  'location',
  'quantity_on_hand',
  'reorder_point',
] as const

const IMPORT_COLUMN_ALIASES: Record<(typeof IMPORT_COLUMNS)[number], string[]> = {
  item_code: ['item_code', 'item code', 'sku', 'code', 'product code', 'item no', 'item number'],
  name: ['name', 'product name', 'item name', 'description'],
  category: ['category', 'cat', 'group'],
  supplier: ['supplier', 'vendor', 'brand'],
  uom: ['uom', 'unit', 'unit of measure', 'measure', 'abbreviation'],
  unit_cost: ['unit_cost', 'unit cost', 'cost', 'purchase price', 'buying price'],
  selling_price: ['selling_price', 'selling price', 'price', 'retail price', 'sale price'],
  location: ['location', 'storage location', 'warehouse', 'warehouse location', 'warehouse/location', 'storage', 'shelf'],
  quantity_on_hand: ['quantity_on_hand', 'quantity on hand', 'qty', 'stock qty', 'stock quantity', 'on hand'],
  reorder_point: ['reorder_point', 'reorder point', 'reorder level', 'reorder qty', 'reorder quantity', 'reorder', 'min stock', 'minimum stock', 'low stock'],
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function toNumber(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const cleaned = raw
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
    .replace(/(?!^)-/g, '')

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeImportRow(row: Record<string, unknown> | unknown[]): ProductDraft | null {
  const values = Array.isArray(row)
    ? row
    : (() => {
        const normalizedEntries = Object.entries(row).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
          const normalized = normalizeHeader(key)
          if (normalized) accumulator[normalized] = value
          return accumulator
        }, {})

        return IMPORT_COLUMNS.map((column) => {
          const direct = row[column]
          if (direct !== undefined) return direct

          const aliases = IMPORT_COLUMN_ALIASES[column]
          const normalizedAliases = aliases.map(normalizeHeader)
          const matchedAlias = normalizedAliases.find((alias) => normalizedEntries[alias] !== undefined)
          if (matchedAlias) return normalizedEntries[matchedAlias]

          const matchedKey = Object.keys(normalizedEntries).find((key) => normalizedAliases.some((alias) => key === alias || key.includes(alias) || alias.includes(key)))
          return matchedKey ? normalizedEntries[matchedKey] : undefined
        })
      })()

  const [item_code, name, category, supplier, uom, unit_cost, selling_price, location, quantity_on_hand, reorder_point] = values

  const draft: ProductDraft = {
    item_code: String(item_code ?? '').trim(),
    name: String(name ?? '').trim(),
    category: String(category ?? '').trim(),
    supplier: String(supplier ?? '').trim(),
    uom: String(uom ?? '').trim(),
    unit_cost: toNumber(unit_cost),
    selling_price: toNumber(selling_price),
    location: String(location ?? '').trim(),
    quantity_on_hand: toNumber(quantity_on_hand),
    reorder_point: toNumber(reorder_point),
    description: '',
  }

  if (!draft.item_code || !draft.name) return null
  return draft
}

export default function InventoryPage() {
  const { state, saveProduct, removeProduct, importProductRows, recordWaste, formatCurrency, notifySuccess, notifyError } = useDemoSystem()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [importRows, setImportRows] = useState<ProductDraft[]>([])
  const [wasteModal, setWasteModal] = useState<string | null>(null)
  const [wasteType, setWasteType] = useState<'waste' | 'defect' | 'reject'>('waste')
  const [wasteQty, setWasteQty] = useState('')
  const [wasteReason, setWasteReason] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const WASTE_TYPES = ['waste', 'defect', 'reject'] as const
  type WasteType = (typeof WASTE_TYPES)[number]
  const wasteByProduct = useMemo(() => {
    const map = new Map<string, { waste: number; defect: number; reject: number; total: number }>()
    for (const movement of state.stockMovements) {
      if (WASTE_TYPES.includes(movement.movement_type as WasteType)) {
        const entry = map.get(movement.product_id) ?? { waste: 0, defect: 0, reject: 0, total: 0 }
        entry[movement.movement_type as WasteType] += Number(movement.quantity ?? 0)
        entry.total += Number(movement.quantity ?? 0)
        map.set(movement.product_id, entry)
      }
    }
    return map
  }, [state.stockMovements])

  const wasteTotals = useMemo(() => {
    let waste = 0
    let defect = 0
    let reject = 0
    let value = 0
    for (const movement of state.stockMovements) {
      if (WASTE_TYPES.includes(movement.movement_type as WasteType)) {
        const quantity = Number(movement.quantity ?? 0)
        const cost = Number(movement.product?.unit_cost ?? state.products.find((product) => product.id === movement.product_id)?.unit_cost ?? 0)
        value += quantity * cost
        if (movement.movement_type === 'waste') waste += quantity
        else if (movement.movement_type === 'defect') defect += quantity
        else reject += quantity
      }
    }
    return { waste, defect, reject, value, total: waste + defect + reject }
  }, [state.stockMovements, state.products])

  const products = state.products
  const lowStockCount = products.filter((product) => product.is_active && product.quantity_on_hand > 0 && product.quantity_on_hand <= product.reorder_point).length
  const outOfStockCount = products.filter((product) => product.is_active && product.quantity_on_hand === 0).length
  const categories = useMemo(() => ['all', ...state.categories.map((category) => category.name)], [state.categories])
  const filtered = products.filter((product) => {
    const status = product.quantity_on_hand === 0 ? 'out' : product.quantity_on_hand <= product.reorder_point ? 'low' : 'ok'
    const matchSearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.item_code.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || product.category_id === state.categories.find((category) => category.name === filterCat)?.id || product.category?.name === filterCat
    const matchStatus = filterStatus === 'all' || filterStatus === status || (filterStatus === 'waste' && ((wasteByProduct.get(product.id)?.total) ?? 0) > 0)
    return matchSearch && matchCat && matchStatus
  })

  function resetForm(product?: (typeof state.products)[number]) {
    if (!product) {
      setForm(EMPTY_FORM)
      return
    }

    setForm({
      item_code: product.item_code,
      name: product.name,
      category: product.category?.name ?? state.categories.find((category) => category.id === product.category_id)?.name ?? '',
      uom: product.uom?.abbreviation ?? product.uom?.name ?? '',
      unit_cost: String(product.unit_cost ?? ''),
      selling_price: String(product.selling_price ?? ''),
      quantity_on_hand: String(product.quantity_on_hand),
      reorder_point: String(product.reorder_point),
      supplier: product.supplier?.name ?? state.suppliers.find((supplier) => supplier.id === product.supplier_id)?.name ?? '',
      location: product.location?.name ?? state.locations.find((location) => location.id === product.location_id)?.name ?? '',
      description: product.description ?? '',
    })
  }

  function openAdd() {
    setEditingId(null)
    resetForm()
    setShowModal(true)
  }

  function openEdit(product: (typeof state.products)[number]) {
    setEditingId(product.id)
    resetForm(product)
    setShowModal(true)
  }

  function toDraft(input: ProductForm): ProductDraft {
    return {
      item_code: input.item_code.trim(),
      name: input.name.trim(),
      category: input.category.trim(),
      uom: input.uom.trim(),
      unit_cost: Number(input.unit_cost) || 0,
      selling_price: Number(input.selling_price) || 0,
      quantity_on_hand: Number(input.quantity_on_hand) || 0,
      reorder_point: Number(input.reorder_point) || 0,
      supplier: input.supplier.trim(),
      location: input.location.trim(),
      description: input.description.trim(),
    }
  }

  function handleSave() {
    const draft = toDraft(form)
    if (!draft.item_code || !draft.name) return
    saveProduct(draft, editingId ?? undefined)
    notifySuccess(editingId ? 'Item updated successfully.' : 'Item added successfully.')
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function handleDelete(id: string) {
    removeProduct(id)
    notifySuccess('Item deleted successfully.')
    setDeleteConfirm(null)
  }

  function openWaste(product: (typeof state.products)[number]) {
    setWasteModal(product.id)
    setWasteType('waste')
    setWasteQty('')
    setWasteReason('')
  }

  function closeWaste() {
    setWasteModal(null)
    setWasteQty('')
    setWasteReason('')
  }

  function handleLogWaste() {
    if (!wasteModal) return
    const product = state.products.find((entry) => entry.id === wasteModal)
    const quantity = Number(wasteQty) || 0
    if (!product || quantity <= 0) return
    if (quantity > product.quantity_on_hand) {
      notifyError(`Cannot log more than the ${product.quantity_on_hand} units on hand.`)
      return
    }
    recordWaste(product.id, wasteType, quantity, wasteReason)
    notifySuccess(`${quantity} unit${quantity === 1 ? '' : 's'} marked as ${wasteType}.`)
    closeWaste()
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const workbook = file.name.toLowerCase().endsWith('.csv')
        ? XLSX.read(await file.text(), { type: 'string' })
        : XLSX.read(await file.arrayBuffer(), { type: 'array' })

      const firstSheet = workbook.SheetNames[0]
      const sheet = firstSheet ? workbook.Sheets[firstSheet] : null
      const parsedRows = sheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }) : []
      const rows = parsedRows
        .map((row) => normalizeImportRow(row))
        .filter((row): row is ProductDraft => Boolean(row))

      setImportRows(rows)
      setShowImportModal(true)
    } catch {
      notifyError('Unable to read that file. Please upload a valid CSV or XLSX file.')
    }

    e.target.value = ''
  }

  function handleImportConfirm() {
    importProductRows(importRows)
    notifySuccess(`Imported ${importRows.length} item${importRows.length === 1 ? '' : 's'} successfully.`)
    setShowImportModal(false)
    setImportRows([])
  }

  return (
    <div>
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Link href="/dashboard/movements" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
          <div className="card" style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid #FECACA', background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: '0 12px 30px rgba(239, 68, 68, 0.10)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DC262614', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={16} color="#DC2626" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#B91C1C', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Stock warning</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 3 }}>
                  {lowStockCount} low-stock item{lowStockCount === 1 ? '' : 's'} and {outOfStockCount} out-of-stock item{outOfStockCount === 1 ? '' : 's'} need attention.
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Click to review movements and prevent missed restocks.</div>
              </div>
            </div>
            <span className="badge" style={{ background: '#DC262614', color: '#DC2626', fontSize: 10, flexShrink: 0 }}>View warnings</span>
          </div>
        </Link>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Inventory</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {filtered.length} of {products.length} items
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import CSV/XLSX
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      <div className="card inventory-toolbar" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input className="input" placeholder="Search by name or item code..." value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 36, height: 36, fontSize: 13 }} />
        </div>
        <select className="input" value={filterCat} onChange={(event) => setFilterCat(event.target.value)} style={{ width: 'auto', height: 36, fontSize: 13 }}>
          <option value="all">All Categories</option>
          {categories.slice(1).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select className="input" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} style={{ width: 'auto', height: 36, fontSize: 13 }}>
          <option value="all">All Status</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
          <option value="waste">Waste / Defect</option>
        </select>
      </div>

      <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 16, border: '1px solid #FEE2E2', background: 'linear-gradient(135deg, #FFF7F7 0%, #FFFDF5 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#DC262614', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={16} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#B91C1C', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Waste / Defect / Reject</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Monitor non-sellable stock written off from inventory.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Waste', value: wasteTotals.waste, color: '#EF4444' },
              { label: 'Defect', value: wasteTotals.defect, color: '#F59E0B' },
              { label: 'Reject', value: wasteTotals.reject, color: '#8B5CF6' },
            ].map((stat) => (
              <div key={stat.label} style={{ padding: '8px 14px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #F1D4D4', textAlign: 'center', minWidth: 78 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
            <div style={{ padding: '8px 14px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #F1D4D4', textAlign: 'center', minWidth: 96 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{formatCurrency(wasteTotals.value)}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Est. loss</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card table-scroll inventory-desktop-table" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Supplier</th>
              <th>UOM</th>
              <th>On Hand</th>
              <th>Reorder</th>
              <th>Unit Cost</th>
              <th>Selling Price</th>
              <th>Location</th>
              <th>Waste</th>
              <th>Status</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const status = product.quantity_on_hand === 0 ? 'out' : product.quantity_on_hand <= product.reorder_point ? 'low' : 'ok'
              const statusColor = status === 'out' ? '#EF4444' : status === 'low' ? '#F59E0B' : '#10B981'
              const statusLabel = status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'
              return (
                <tr key={product.id}>
                  <td>
                    <code style={{ fontSize: 11, background: '#EFF6FF', padding: '2px 6px', borderRadius: 4, color: '#3B82F6' }}>{product.item_code}</code>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{product.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{product.supplier?.name ?? 'No supplier'}</div>
                  </td>
                  <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{product.category?.name ?? 'Uncategorized'}</span></td>
                  <td style={{ color: '#475569', fontSize: 12 }}>{product.supplier?.name ?? 'No supplier'}</td>
                  <td style={{ color: '#475569' }}>{product.uom?.abbreviation ?? 'pcs'}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: statusColor, fontSize: 15 }}>{product.quantity_on_hand}</span>
                    <div style={{ marginTop: 3, width: 48, height: 3, background: '#E2E8F0', borderRadius: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: statusColor, width: `${Math.min((product.quantity_on_hand / Math.max(product.reorder_point * 4, 1)) * 100, 100)}%` }} />
                    </div>
                  </td>
                  <td style={{ color: '#475569' }}>{product.reorder_point}</td>
                  <td style={{ color: '#0F172A' }}>{formatCurrency(Number(product.unit_cost ?? 0))}</td>
                  <td style={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(Number(product.selling_price ?? 0))}</td>
                  <td style={{ color: '#475569', fontSize: 12 }}>{product.location?.name ?? 'Main Storage'}</td>
                  <td>
                    {(() => {
                      const waste = wasteByProduct.get(product.id)
                      const total = (waste?.waste ?? 0) + (waste?.defect ?? 0) + (waste?.reject ?? 0)
                      if (!waste || total === 0) return <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
                      return (
                        <div style={{ display: 'flex', gap: 6, fontSize: 11, fontWeight: 800 }}>
                          {waste.waste > 0 && <span style={{ color: '#EF4444' }}>W {waste.waste}</span>}
                          {waste.defect > 0 && <span style={{ color: '#F59E0B' }}>D {waste.defect}</span>}
                          {waste.reject > 0 && <span style={{ color: '#8B5CF6' }}>R {waste.reject}</span>}
                        </div>
                      )
                    })()}
                  </td>
                  <td><span className="badge" style={{ background: `${statusColor}14`, color: statusColor }}>{statusLabel}</span></td>
                   <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)} style={{ padding: '4px 8px' }}><Edit2 size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(product.id)} style={{ padding: '4px 8px' }}><Trash2 size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openWaste(product)} style={{ padding: '4px 8px', color: '#DC2626' }} title="Log waste / defect / reject"><AlertTriangle size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                  <Package size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
                  <p>No items found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="inventory-mobile-list">
        {filtered.map((product) => {
          const status = product.quantity_on_hand === 0 ? 'out' : product.quantity_on_hand <= product.reorder_point ? 'low' : 'ok'
          const statusColor = status === 'out' ? '#EF4444' : status === 'low' ? '#F59E0B' : '#10B981'
          const statusLabel = status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'

          return (
            <div key={product.id} className="card" style={{ padding: 14, borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>{product.name}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: '#64748B' }}>{product.item_code} · {product.supplier?.name ?? 'No supplier'}</div>
                </div>
                <span className="badge" style={{ background: `${statusColor}14`, color: statusColor, flexShrink: 0 }}>{statusLabel}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 14, fontSize: 12 }}>
                <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#94A3B8' }}>Category</div>
                  <div style={{ marginTop: 4, fontWeight: 700, color: '#0F172A' }}>{product.category?.name ?? 'Uncategorized'}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#94A3B8' }}>Location</div>
                  <div style={{ marginTop: 4, fontWeight: 700, color: '#0F172A' }}>{product.location?.name ?? 'Main Storage'}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#94A3B8' }}>On hand</div>
                  <div style={{ marginTop: 4, fontWeight: 800, color: statusColor }}>{product.quantity_on_hand}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#94A3B8' }}>Reorder</div>
                  <div style={{ marginTop: 4, fontWeight: 800, color: '#0F172A' }}>{product.reorder_point}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#94A3B8' }}>Unit cost</div>
                  <div style={{ marginTop: 4, fontWeight: 800, color: '#0F172A' }}>{formatCurrency(Number(product.unit_cost ?? 0))}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#94A3B8' }}>Selling price</div>
                  <div style={{ marginTop: 4, fontWeight: 800, color: '#10B981' }}>{formatCurrency(Number(product.selling_price ?? 0))}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#94A3B8' }}>Waste / Defect / Reject</div>
                  <div style={{ marginTop: 4, fontWeight: 800, color: '#0F172A' }}>
                    {(() => {
                      const waste = wasteByProduct.get(product.id)
                      const total = (waste?.waste ?? 0) + (waste?.defect ?? 0) + (waste?.reject ?? 0)
                      if (!waste || total === 0) return '—'
                      return (
                        <span style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                          {waste.waste > 0 && <span style={{ color: '#EF4444' }}>W {waste.waste}</span>}
                          {waste.defect > 0 && <span style={{ color: '#F59E0B' }}>D {waste.defect}</span>}
                          {waste.reject > 0 && <span style={{ color: '#8B5CF6' }}>R {waste.reject}</span>}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)} style={{ flex: 1, justifyContent: 'center' }}>
                  <Edit2 size={13} /> Edit
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openWaste(product)} style={{ flex: 1, justifyContent: 'center', color: '#DC2626' }}>
                  <AlertTriangle size={13} /> Log Waste
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(product.id)} style={{ flex: 1, justifyContent: 'center' }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
            <Package size={28} style={{ marginBottom: 8, opacity: 0.35 }} />
            <p>No items found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{editingId ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {[
                { label: 'Item Code', key: 'item_code', placeholder: 'e.g. COF001' },
                { label: 'Product Name', key: 'name', placeholder: 'e.g. Espresso Beans' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input className="input" placeholder={placeholder} value={form[key as keyof ProductForm]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                </div>
              ))}

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Category</label>
                {state.categories.length > 0 ? (
                  <select className="input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                    <option value="">Select category...</option>
                    {state.categories.map((category) => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                ) : (
                  <input className="input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Type a category name" />
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Unit of Measure</label>
                {state.unitsOfMeasure.length > 0 ? (
                  <select className="input" value={form.uom} onChange={(event) => setForm((current) => ({ ...current, uom: event.target.value }))}>
                    {state.unitsOfMeasure.map((unit) => (
                      <option key={unit.id} value={unit.abbreviation}>{unit.abbreviation}</option>
                    ))}
                  </select>
                ) : (
                  <input className="input" value={form.uom} onChange={(event) => setForm((current) => ({ ...current, uom: event.target.value }))} placeholder="Type a unit abbreviation" />
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Supplier</label>
                {state.suppliers.length > 0 ? (
                  <select className="input" value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))}>
                    <option value="">Select supplier...</option>
                    {state.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                    ))}
                  </select>
                ) : (
                  <input className="input" value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} placeholder="Type a supplier name" />
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Location</label>
                {state.locations.length > 0 ? (
                  <select className="input" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}>
                    <option value="">Select location...</option>
                    {state.locations.map((location) => (
                      <option key={location.id} value={location.name}>{location.name}</option>
                    ))}
                  </select>
                ) : (
                  <input className="input" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Type a location name" />
                )}
              </div>

              {[
                { label: 'Unit Cost', key: 'unit_cost', placeholder: '0.00' },
                { label: 'Selling Price', key: 'selling_price', placeholder: '0.00' },
                { label: 'Stock on Hand', key: 'quantity_on_hand', placeholder: '0' },
                { label: 'Reorder Point', key: 'reorder_point', placeholder: '0' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input className="input" type="number" placeholder={placeholder} value={form[key as keyof ProductForm]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                </div>
              ))}

              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Description (optional)</label>
                <textarea className="input" placeholder="Product description..." value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} style={{ height: 70, resize: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={15} />{editingId ? 'Save Changes' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={24} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Delete Item?</h3>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>This action cannot be undone. The item will be permanently removed from your inventory.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete Item</button>
            </div>
          </div>
        </div>
      )}

      {wasteModal && (() => {
        const target = state.products.find((entry) => entry.id === wasteModal)
        if (!target) return null
        const remaining = (wasteByProduct.get(target.id)?.total) ?? 0
        return (
          <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && closeWaste()}>
            <div className="modal" style={{ maxWidth: 440 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Log Waste / Defect / Reject</h2>
                <button onClick={closeWaste} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{target.name}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                  {target.item_code} · {target.quantity_on_hand} on hand{remaining > 0 ? ` · ${remaining} already written off` : ''}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {([
                    { value: 'waste', label: 'Waste', color: '#EF4444' },
                    { value: 'defect', label: 'Defect', color: '#F59E0B' },
                    { value: 'reject', label: 'Reject', color: '#8B5CF6' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWasteType(opt.value)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: 10,
                        border: `1px solid ${wasteType === opt.value ? opt.color : '#D8E4F2'}`,
                        background: wasteType === opt.value ? `${opt.color}14` : '#FFFFFF',
                        color: wasteType === opt.value ? opt.color : '#475569',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Quantity</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={target.quantity_on_hand}
                  value={wasteQty}
                  onChange={(event) => setWasteQty(event.target.value)}
                  placeholder="0"
                  style={{ height: 40, fontSize: 14 }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason (optional)</label>
                <textarea
                  className="input"
                  value={wasteReason}
                  onChange={(event) => setWasteReason(event.target.value)}
                  placeholder="e.g. expired, damaged in transit..."
                  style={{ height: 64, resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={closeWaste}>Cancel</button>
                <button className="btn btn-primary" onClick={handleLogWaste}><AlertTriangle size={15} /> Log {wasteType}</button>
              </div>
            </div>
          </div>
        )
      })()}

      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>Import Preview - {importRows.length} items</h2>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
              Review the items below before importing. Expected columns: Item Code, Name, Category, Supplier, UOM, Unit Cost, Selling Price, Location, Stock Qty, Reorder Level
            </p>
            <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 8, border: '1px solid #D8E4F2' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Category</th><th>Supplier</th><th>Location</th><th>UOM</th><th>Cost</th><th>Price</th><th>Qty</th><th>Reorder</th></tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      <td style={{ fontSize: 11 }}>{row.item_code}</td>
                      <td style={{ color: '#0F172A' }}>{row.name}</td>
                      <td style={{ fontSize: 11 }}>{row.category}</td>
                      <td style={{ fontSize: 11 }}>{row.supplier}</td>
                      <td style={{ fontSize: 11 }}>{row.location}</td>
                      <td style={{ fontSize: 11 }}>{row.uom}</td>
                      <td>{formatCurrency(row.unit_cost)}</td>
                      <td style={{ color: '#10B981' }}>{formatCurrency(row.selling_price)}</td>
                      <td style={{ fontWeight: 700 }}>{row.quantity_on_hand}</td>
                      <td>{row.reorder_point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importRows.length > 20 && <p style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>...and {importRows.length - 20} more items</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowImportModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleImportConfirm}><Upload size={14} /> Import {importRows.length} Items</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
