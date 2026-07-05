'use client'

import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Edit2, Package, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react'
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

export default function InventoryPage() {
  const { state, saveProduct, removeProduct, importProductRows, formatCurrency } = useDemoSystem()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [importRows, setImportRows] = useState<ProductDraft[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const products = state.products
  const categories = useMemo(() => ['all', ...state.categories.map((category) => category.name)], [state.categories])
  const filtered = products.filter((product) => {
    const status = product.quantity_on_hand === 0 ? 'out' : product.quantity_on_hand <= product.reorder_point ? 'low' : 'ok'
    const matchSearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.item_code.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || product.category_id === state.categories.find((category) => category.name === filterCat)?.id || product.category?.name === filterCat
    const matchStatus = filterStatus === 'all' || filterStatus === status
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
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function handleDelete(id: string) {
    removeProduct(id)
    setDeleteConfirm(null)
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = String(event.target?.result ?? '')
      const rows = text
        .split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((row) => row.split(',').map((cell) => cell.trim()))
        .filter((cols) => cols.length >= 10)
        .map(([item_code, name, category, supplier, uom, unit_cost, selling_price, location, quantity_on_hand, reorder_point]) => ({
          item_code,
          name,
          category,
          supplier,
          uom,
          unit_cost: Number(unit_cost) || 0,
          selling_price: Number(selling_price) || 0,
          location,
          quantity_on_hand: Number(quantity_on_hand) || 0,
          reorder_point: Number(reorder_point) || 0,
          description: '',
        }))

      setImportRows(rows)
      setShowImportModal(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImportConfirm() {
    importProductRows(importRows)
    setShowImportModal(false)
    setImportRows([])
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Inventory</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {filtered.length} of {products.length} items
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
        </select>
      </div>

      <div className="card table-scroll" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>UOM</th>
              <th>On Hand</th>
              <th>Reorder</th>
              <th>Unit Cost</th>
              <th>Selling Price</th>
              <th>Location</th>
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
                  <td><span className="badge" style={{ background: `${statusColor}14`, color: statusColor }}>{statusLabel}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)} style={{ padding: '4px 8px' }}><Edit2 size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(product.id)} style={{ padding: '4px 8px' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                  <Package size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
                  <p>No items found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                <select className="input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                  <option value="">Select category...</option>
                  {state.categories.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Unit of Measure</label>
                <select className="input" value={form.uom} onChange={(event) => setForm((current) => ({ ...current, uom: event.target.value }))}>
                  {state.unitsOfMeasure.map((unit) => (
                    <option key={unit.id} value={unit.abbreviation}>{unit.abbreviation}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Supplier</label>
                <select className="input" value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))}>
                  <option value="">Select supplier...</option>
                  {state.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Location</label>
                <select className="input" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}>
                  <option value="">Select location...</option>
                  {state.locations.map((location) => (
                    <option key={location.id} value={location.name}>{location.name}</option>
                  ))}
                </select>
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
                  <tr><th>Code</th><th>Name</th><th>Category</th><th>UOM</th><th>Cost</th><th>Price</th><th>Qty</th><th>Reorder</th></tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      <td style={{ fontSize: 11 }}>{row.item_code}</td>
                      <td style={{ color: '#0F172A' }}>{row.name}</td>
                      <td style={{ fontSize: 11 }}>{row.category}</td>
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
