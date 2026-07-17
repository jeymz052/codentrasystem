'use client'

import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeftRight, Edit2, Eye, Package, Plus, Power, RotateCcw, Save, Search, ShoppingCart, Trash2, Upload, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useDemoSystem } from '@/components/demo-system-provider'
import { getRolePermissions } from '@/lib/access-control'
import { formatTimestamp } from '@/lib/utils'
import type { ProductDraft } from '@/lib/demo-system'
import { isWasteReversed } from '@/lib/demo-system'
import type { InventoryLot } from '@/types/database'
import { useTableState, type SortDirection } from '@/lib/use-table-state'
import { TableToolbar, type ToolbarFilter } from '@/components/ui/table/TableToolbar'

// Resolve the location that actually holds a product's on-hand stock. A
// product's `location_id` can drift from where its FIFO lots are stored, which
// made the transfer check report "Only 0 units available" even though stock
// existed. Prefer the explicitly requested source when it holds stock;
// otherwise fall back to the location that actually holds the on-hand quantity.
function resolveStockSourceLocation(
  lots: InventoryLot[],
  productId: string,
  requestedSource: string | null
): string | null {
  const atRequested = lots
    .filter((lot) => lot.product_id === productId && lot.location_id === requestedSource)
    .reduce((sum, lot) => sum + Number(lot.quantity ?? 0), 0)
  if (atRequested > 0) return requestedSource
  const held = [...lots]
    .filter((lot) => lot.product_id === productId && Number(lot.quantity ?? 0) > 0 && lot.location_id)
    .sort((a, b) => Number(b.quantity ?? 0) - Number(a.quantity ?? 0))[0]
  return held?.location_id ?? requestedSource
}
import { SortHeader } from '@/components/ui/table/SortHeader'
import { Pagination } from '@/components/ui/table/Pagination'
import { SelectAllCheckbox, RowCheckbox, BulkActionBar } from '@/components/ui/table/TableSelection'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

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
  barcode: string
  finishedGood: boolean
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
  barcode: '',
  finishedGood: false,
}

type LocationStock = { locationId: string; name: string; quantity: number }

function StockLocationBreakdown({ items, wasteIds }: { items: LocationStock[]; wasteIds?: Set<string> }) {
  const filtered = items.filter((item) => !wasteIds?.has(item.locationId))
  if (filtered.length <= 1) return null
  return (
    <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', fontSize: 10, color: '#64748B', lineHeight: 1.3 }}>
      {filtered.map((item) => (
        <div key={item.locationId} style={{ display: 'flex', gap: 5, alignItems: 'baseline', justifyContent: 'flex-end' }}>
          <strong style={{ color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>{item.quantity}</strong>
          <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@ {item.name}</span>
        </div>
      ))}
    </div>
  )
}

function MultiSiteBadge() {
  return (
    <span
      className="badge"
      style={{ fontSize: 9, fontWeight: 800, background: '#EFF6FF', color: '#3B82F6' }}
    >
      multi-site
    </span>
  )
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

function isFinishedGoodCategory(categoryValue: string): boolean {
  const norm = normalizeHeader(categoryValue)
  if (!norm) return false
  if (norm === 'fg' || norm === 'finishedgood' || norm === 'finishedgoods') return true
  return norm.includes('finished good') || norm.includes('finish good')
}

function parseFinishedGoodFlag(value: unknown): boolean {
  const norm = normalizeHeader(value)
  if (!norm) return false
  if (['yes', 'y', 'true', '1', 'finished', 'finished good', 'fg'].includes(norm)) return true
  return norm.startsWith('finish')
}

const FINISHED_GOOD_COLUMN_ALIASES = [
  'finished good',
  'finished_good',
  'is finished good',
  'is_finished_good',
  'finishedgood',
  'product type',
  'type',
]

function normalizeImportRow(row: Record<string, unknown> | unknown[]): ProductDraft | null {
  let normalizedEntries: Record<string, unknown> = {}
  const values = Array.isArray(row)
    ? row
    : (() => {
        normalizedEntries = Object.entries(row).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
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

  // A product whose category is named like "Finished Good" (or that has an
  // explicit finished-good column set to yes/true) is auto-marked as a
  // finished good on import. The Finished Good toggle in the add/edit form is
  // still available for manual control.
  let isFinishedGood = isFinishedGoodCategory(draft.category)
  if (!isFinishedGood) {
    for (const alias of FINISHED_GOOD_COLUMN_ALIASES) {
      const value = normalizedEntries[alias]
      if (value !== undefined && value !== '' && parseFinishedGoodFlag(value)) {
        isFinishedGood = true
        break
      }
    }
  }

  // Optional barcode column (barcode / upc / ean). Strips surrounding whitespace
  // and quotes so scanner output maps cleanly to the product.
  const BARCODE_ALIASES = ['barcode', 'bar code', 'upc', 'ean']
  let barcode: string | undefined
  for (const alias of BARCODE_ALIASES) {
    const value = normalizedEntries[alias]
    if (value !== undefined && value !== '') {
      const cleaned = String(value).replace(/^["'\s]+|["'\s]+$/g, '').trim()
      if (cleaned) {
        barcode = cleaned
        break
      }
    }
  }

  return { ...draft, is_finished_good: isFinishedGood, barcode }
}

export default function InventoryPage() {
  const { state, availableTenants, activeTenantId, saveProduct, removeProduct, removeProducts, importProductRows, setWasteTypes, reverseWaste, transferStock, toggleProduct, requestDeletion, formatCurrency, notifySuccess, notifyError } = useDemoSystem()
  const router = useRouter()
  const activeTenant = availableTenants.find((tenant) => tenant.id === (activeTenantId || state.tenant.id)) ?? availableTenants[0]
  const role = activeTenant?.role ?? 'admin'
  const perms = getRolePermissions(role)
  const isProduction = state.tenant.enable_production ?? false
  const wasteLocationIds = state.locations.filter((location) => location.is_waste_location).map((location) => location.id)
  const wasteLocationIdSet = new Set(wasteLocationIds)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [importRows, setImportRows] = useState<ProductDraft[]>([])
  const [wasteModal, setWasteModal] = useState<string | null>(null)
  const [wasteDraft, setWasteDraft] = useState<{ waste: string; defect: string; reject: string }>({ waste: '', defect: '', reject: '' })
  const [wasteRemark, setWasteRemark] = useState('')
  const [lotsModal, setLotsModal] = useState<string | null>(null)
  const [transferModal, setTransferModal] = useState<string | null>(null)
  const [warningsFilter, setWarningsFilter] = useState<null | 'low' | 'out'>(null)
  const [wasteSummaryModal, setWasteSummaryModal] = useState<WasteType | 'all' | null>(null)
  const [wasteReverseConfirm, setWasteReverseConfirm] = useState<string | null>(null)
  const [transferTo, setTransferTo] = useState('')
  const [transferFrom, setTransferFrom] = useState('')
  const [transferQty, setTransferQty] = useState('')
  const [transferNotes, setTransferNotes] = useState('')
  const [viewId, setViewId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const WASTE_TYPES = ['waste', 'defect', 'reject'] as const
  type WasteType = (typeof WASTE_TYPES)[number]
  const wasteByProduct = useMemo(() => {
    const map = new Map<string, { waste: number; defect: number; reject: number; total: number }>()
    const quarantineIds = new Set(
      state.locations.filter((location) => location.is_waste_location).map((location) => location.id)
    )
    for (const lot of state.inventoryLots) {
      if (!lot.location_id || !quarantineIds.has(lot.location_id)) continue
      const location = state.locations.find((entry) => entry.id === lot.location_id)
      const type =
        location?.code === 'WASTE' ? 'waste'
          : location?.code === 'DEFECT' ? 'defect'
            : location?.code === 'REJECT' ? 'reject'
              : null
      if (!type) continue
      const entry = map.get(lot.product_id) ?? { waste: 0, defect: 0, reject: 0, total: 0 }
      const quantity = Number(lot.quantity ?? 0)
      entry[type] += quantity
      entry.total += quantity
      map.set(lot.product_id, entry)
    }
    return map
  }, [state.inventoryLots, state.locations])

  const stockByLocation = useMemo(() => {
    const map = new Map<string, { locationId: string; name: string; quantity: number }[]>()
    const nameFor = (locationId: string | null) =>
      state.locations.find((location) => location.id === locationId)?.name ?? 'Unassigned'
    for (const lot of state.inventoryLots) {
      const quantity = Number(lot.quantity ?? 0)
      if (quantity <= 0) continue
      if (lot.location_id && wasteLocationIds.includes(lot.location_id)) continue
      const key = lot.location_id ?? 'unassigned'
      const arr = map.get(lot.product_id) ?? []
      const existing = arr.find((entry) => entry.locationId === key)
      if (existing) existing.quantity += quantity
      else arr.push({ locationId: key, name: nameFor(lot.location_id), quantity })
      map.set(lot.product_id, arr)
    }
    for (const arr of map.values()) arr.sort((a, b) => b.quantity - a.quantity)
    return map
  }, [state.inventoryLots, state.locations, wasteLocationIds])

  const quarantineLocations = state.locations.filter((location) => location.is_waste_location)
  const quarantineStock = useMemo(() => {
    const map = new Map<string, number>()
    for (const lot of state.inventoryLots) {
      if (!lot.location_id || !quarantineLocations.some((location) => location.id === lot.location_id)) continue
      map.set(lot.location_id, (map.get(lot.location_id) ?? 0) + Number(lot.quantity ?? 0))
    }
    return map
  }, [state.inventoryLots, quarantineLocations])

  const quarantineValue = useMemo(() => {
    let value = 0
    for (const lot of state.inventoryLots) {
      if (!lot.location_id || !quarantineLocations.some((location) => location.id === lot.location_id)) continue
      const product = state.products.find((entry) => entry.id === lot.product_id)
      value += Number(lot.quantity ?? 0) * Number(product?.unit_cost ?? 0)
    }
    return value
  }, [state.inventoryLots, state.products, quarantineLocations])

  const stockForType = (type: 'waste' | 'defect' | 'reject') => {
    const location = quarantineLocations.find((entry) => entry.code === type.toUpperCase())
    return location ? (quarantineStock.get(location.id) ?? 0) : 0
  }

  const wasteItems = useMemo(() => {
    const productFor = (movement: (typeof state.stockMovements)[number]) =>
      movement.product ?? state.products.find((product) => product.id === movement.product_id)
    return state.stockMovements
      .filter(
        (movement) =>
          WASTE_TYPES.includes(movement.movement_type as WasteType) &&
          movement.reference_type !== 'waste_reversal' &&
          !isWasteReversed(state, movement.id)
      )
      .map((movement) => ({
        id: movement.id,
        type: movement.movement_type as WasteType,
        quantity: Number(movement.quantity ?? 0),
        notes: movement.notes ?? '',
        created_at: movement.created_at,
        isReversed: state.stockMovements.some((other) => other.reference_id === movement.id && other.reference_type === 'waste_reversal'),
        product: productFor(movement),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [state.stockMovements, state.products])

  const products = state.products
  const lowStockCount = state.alerts.filter((alert) => alert.status === 'open' && alert.alert_type === 'low_stock').length
  const outOfStockCount = state.alerts.filter((alert) => alert.status === 'open' && alert.alert_type === 'out_of_stock').length
  const lowStockItems = products.filter((product) => product.is_active && product.quantity_on_hand > 0 && product.quantity_on_hand <= product.reorder_point)
  const outOfStockItems = products.filter((product) => product.is_active && product.quantity_on_hand === 0)
  const categoryNames = useMemo(() => ['all', ...state.categories.map((category) => category.name)], [state.categories])

  const productRows = useMemo(() => {
    return products.map((product) => {
      const status = product.quantity_on_hand === 0 ? 'out' : product.quantity_on_hand <= product.reorder_point ? 'low' : 'ok'
      const waste = wasteByProduct.get(product.id)?.total ?? 0
      return {
        id: product.id,
        item_code: product.item_code,
        name: product.name,
        categoryName: product.category?.name ?? 'Uncategorized',
        supplierName: product.supplier?.name ?? '',
        uom: product.uom?.abbreviation ?? 'pcs',
        onHand: product.quantity_on_hand,
        reorder: product.reorder_point,
        unitCost: Number(product.unit_cost ?? 0),
        price: Number(product.selling_price ?? 0),
        locationName: product.location?.name ?? 'Unassigned',
        barcode: product.barcode ?? '',
        wasteTotal: waste,
        status: waste > 0 ? 'waste' : status,
      }
    })
  }, [products, wasteByProduct])

  const productById = useMemo(() => {
    const map = new Map(products.map((product) => [product.id, product]))
    return map
  }, [products])

  const table = useTableState({
    data: productRows,
    initialPageSize: 10,
    searchKeys: (row) => [String(row.name), String(row.item_code), String(row.supplierName), String(row.categoryName), String(row.locationName)],
    filterFields: [
      {
        key: 'category',
        label: 'Category',
        options: categoryNames.map((name) => ({ value: name, label: name === 'all' ? 'All Categories' : name })),
        getValue: (row) => String(row.categoryName),
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'ok', label: 'In Stock' },
          { value: 'low', label: 'Low Stock' },
          { value: 'out', label: 'Out of Stock' },
          { value: 'waste', label: 'Waste / Defect' },
        ],
        getValue: (row) => String(row.status),
      },
    ],
  })

  const filtered = table.sortedAndFiltered
  const filters: ToolbarFilter[] = [
    {
      key: 'category',
      label: 'Category',
      value: table.filters.category,
      onChange: (value) => table.setFilter('category', value),
      options: categoryNames.map((name) => ({ value: name, label: name === 'all' ? 'All Categories' : name })),
    },
    {
      key: 'status',
      label: 'Status',
      value: table.filters.status,
      onChange: (value) => table.setFilter('status', value),
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'ok', label: 'In Stock' },
        { value: 'low', label: 'Low Stock' },
        { value: 'out', label: 'Out of Stock' },
        { value: 'waste', label: 'Waste / Defect' },
      ],
    },
  ]

  function handleDeleteSelected() {
    if (!perms.canDeleteRecords) {
      const itemCodes = state.products
        .filter((entry) => table.selectedIds.includes(entry.id))
        .map((entry) => entry.item_code)
      requestDeletion('removeProducts', 'product', table.selectedIds[0] ?? '', { product_ids: table.selectedIds, item_codes: itemCodes })
      notifySuccess('Deletion request sent to manager for approval.')
      table.clearSelection()
      setBulkConfirm(false)
      return
    }
    removeProducts(table.selectedIds)
    notifySuccess(`Deleted ${table.selectedCount} item${table.selectedCount === 1 ? '' : 's'} successfully.`)
    table.clearSelection()
    setBulkConfirm(false)
  }

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
      finishedGood: product.is_finished_good ?? false,
      barcode: product.barcode ?? '',
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
      is_finished_good: input.finishedGood,
      barcode: input.barcode.trim(),
    }
  }

  function handleSave() {
    const draft = toDraft(form)
    if (!draft.item_code || !draft.name) return

    const code = draft.item_code.trim().toLowerCase()
    const name = draft.name.trim().toLowerCase()
    const duplicateCode = state.products.find(
      (product) => product.id !== editingId && product.item_code.trim().toLowerCase() === code,
    )
    const duplicateName = state.products.find(
      (product) => product.id !== editingId && product.name.trim().toLowerCase() === name,
    )
    if (duplicateName) {
      notifyError(`Product "${draft.name}" already exists.`)
      return
    }
    if (duplicateCode) {
      notifyError(`Item code "${draft.item_code}" already exists.`)
      return
    }

    saveProduct(draft, editingId ?? undefined)
    notifySuccess(editingId ? 'Item updated successfully.' : 'Item added successfully.')
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function handleDelete(id: string) {
    if (!perms.canDeleteRecords) {
      const product = state.products.find((entry) => entry.id === id)
      requestDeletion('removeProduct', 'product', id, { item_code: product?.item_code, name: product?.name })
      notifySuccess('Deletion request sent to manager for approval.')
      setDeleteConfirm(null)
      return
    }
    removeProduct(id)
    notifySuccess('Item deleted successfully.')
    setDeleteConfirm(null)
  }

  function quarantineQty(productId: string, type: 'waste' | 'defect' | 'reject') {
    const location = quarantineLocations.find((entry) => entry.code === type.toUpperCase())
    if (!location) return 0
    return state.inventoryLots
      .filter((lot) => lot.product_id === productId && lot.location_id === location.id)
      .reduce((sum, lot) => sum + Number(lot.quantity ?? 0), 0)
  }

  function openWaste(product: (typeof state.products)[number]) {
    setWasteModal(product.id)
    setWasteDraft({
      waste: String(quarantineQty(product.id, 'waste')),
      defect: String(quarantineQty(product.id, 'defect')),
      reject: String(quarantineQty(product.id, 'reject')),
    })
    setWasteRemark('')
  }

  function closeWaste() {
    setWasteModal(null)
    setWasteDraft({ waste: '', defect: '', reject: '' })
    setWasteRemark('')
  }

  function handleSaveWaste() {
    if (!wasteModal) return
    const product = state.products.find((entry) => entry.id === wasteModal)
    if (!product) return
    const draft = {
      waste: Math.max(0, Number(wasteDraft.waste) || 0),
      defect: Math.max(0, Number(wasteDraft.defect) || 0),
      reject: Math.max(0, Number(wasteDraft.reject) || 0),
    }
    // setWasteTypes reconciles each type to the requested quantity: it restores
    // whatever is already quarantined back to sellable stock, then re-records
    // the new targets. So the real pool available to distribute across waste /
    // defect / reject is the current sellable on-hand PLUS everything already
    // quarantined for this product — not just the sellable on-hand. Capping
    // against on-hand alone was the source of the "editing waste inflates stock
    // on hand" bug (e.g. 100 -> 25/25/25 -> edit waste to 50 left 75 on hand).
    const onHand = Number(product.quantity_on_hand ?? 0)
    const quarantined =
      quarantineQty(product.id, 'waste') +
      quarantineQty(product.id, 'defect') +
      quarantineQty(product.id, 'reject')
    const available = onHand + quarantined
    // Hard block: waste + defect + reject can never exceed the physical stock
    // available (sellable on-hand plus whatever is already quarantined). We must
    // not proceed (and never silently cap-and-create) when the request is above
    // stock — that would fabricate phantom inventory. The core reducer also caps
    // as a safety net, but the UI rejects first so the user gets clear feedback.
    const requestedTotal = draft.waste + draft.defect + draft.reject
    if (requestedTotal > available) {
      notifyError(
        `Cannot log ${requestedTotal} units — only ${available} available for ${product.name}. Reduce the waste / defect / reject amounts.`
      )
      return
    }
    setWasteTypes(product.id, draft, wasteRemark.trim() || undefined)
    notifySuccess(`Updated waste / defect / reject for ${product.name}.`)
    closeWaste()
  }

  function handleReverseWaste(movementId: string) {
    if (!movementId) return
    reverseWaste(movementId)
    setWasteReverseConfirm(null)
    notifySuccess('Waste / defect / reject entry reversed — stock restored to sellable.')
  }

  function openLots(product: (typeof state.products)[number]) {
    setLotsModal(product.id)
  }

  function closeLots() {
    setLotsModal(null)
  }

  function openTransfer(product: (typeof state.products)[number]) {
    setTransferModal(product.id)
    const requestedSource = product.location_id ?? product.location?.id ?? null
    const source = resolveStockSourceLocation(state.inventoryLots, product.id, requestedSource)
    setTransferFrom(source ?? '')
    setTransferTo('')
    setTransferQty('')
    setTransferNotes('')
  }

  function closeTransfer() {
    setTransferModal(null)
    setTransferTo('')
    setTransferQty('')
    setTransferNotes('')
  }

  function handleTransfer() {
    if (!transferModal) return
    const product = state.products.find((entry) => entry.id === transferModal)
    if (!product || !product.is_active) {
      notifyError('Activate the item before transferring stock.')
      return
    }
    const quantity = Number(transferQty) || 0
    if (quantity <= 0) {
      notifyError('Enter a quantity greater than 0.')
      return
    }
    const requestedSource = transferFrom || (product.location_id ?? product.location?.id ?? null)
    const sourceLocationId = resolveStockSourceLocation(state.inventoryLots, product.id, requestedSource)
    const lotsAtSource = state.inventoryLots
      .filter((lot) => lot.product_id === product.id && lot.location_id === sourceLocationId)
      .reduce((sum, lot) => sum + Number(lot.quantity ?? 0), 0)
    const onHand = Number(product.quantity_on_hand ?? 0)
    // A product may carry on-hand stock without location-specific FIFO lots
    // (stock created directly, imported, or lots left with a null location).
    // Fall back to the total on-hand and transfer from the product's lots as a
    // whole so the move still works instead of reporting "0 available".
    const hasLocationLots = lotsAtSource > 0
    const availableAtSource = hasLocationLots ? lotsAtSource : onHand
    const movingAll = quantity >= onHand
    if (!sourceLocationId && onHand <= 0) {
      notifyError('Select a source location.')
      return
    }
    if (quantity > availableAtSource) {
      notifyError(`Cannot transfer ${quantity} units — only ${availableAtSource} available for ${product.name}. Reduce the transfer amount.`)
      return
    }
    if (quantity > onHand) {
      notifyError(`Cannot transfer ${quantity} units — on-hand stock is only ${onHand} for ${product.name}. Reduce the transfer amount.`)
      return
    }
    if (transferTo && transferTo === sourceLocationId) {
      notifyError('Destination must be a different location.')
      return
    }
    if (transferTo && wasteLocationIds.includes(transferTo)) {
      notifyError('Stock cannot be transferred into a Waste / Defect / Reject location.')
      return
    }
    transferStock({
      productId: product.id,
      fromLocationId: movingAll ? null : (hasLocationLots ? sourceLocationId : null),
      toLocationId: transferTo || null,
      quantity,
      notes: transferNotes.trim() || undefined,
    })
    notifySuccess(`Transferred ${quantity} × ${product.name}.`)
    closeTransfer()
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

      if (!rows.length) {
        notifyError(
          'No valid rows found. The file must include at least an "Item Code" and "Name" column (with headers). Please use the expected CSV/XLSX template.',
        )
        return
      }

      setImportRows(rows)
      setShowImportModal(true)
    } catch {
      notifyError('Unable to read that file. Please upload a valid CSV or XLSX file.')
    }

    e.target.value = ''
  }

  function handleImportConfirm() {
    if (!importRows.length) {
      notifyError('There are no rows to import.')
      setShowImportModal(false)
      return
    }

    const existingCodes = new Set(state.products.map((product) => String(product.item_code ?? '').trim().toLowerCase()))
    const newCount = importRows.filter((row) => !existingCodes.has(String(row.item_code ?? '').trim().toLowerCase())).length
    const limit = Number(state.tenant.max_products ?? 0)
    if (state.products.length + newCount > limit) {
      notifyError(`Data cannot be loaded due to Plan package limitation. Your ${state.tenant.plan} plan allows up to ${limit} products.`)
      setShowImportModal(false)
      setImportRows([])
      return
    }
    importProductRows(importRows)
    notifySuccess(`Imported ${importRows.length} item${importRows.length === 1 ? '' : 's'} successfully.`)
    setShowImportModal(false)
    setImportRows([])
  }

  return (
    <div>
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
          {lowStockCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setWarningsFilter('low')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setWarningsFilter('low') } }}
              style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', outline: 'none' }}
            >
              <div className="card" style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid #FED7AA', background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFDF5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: '0 12px 30px rgba(245, 158, 11, 0.10)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F59E0B14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={16} color="#F59E0B" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#B45309', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Low stock</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 3 }}>
                      {lowStockCount} item{lowStockCount === 1 ? '' : 's'} at or below reorder point
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Click to view low-stock items.</div>
                  </div>
                </div>
                <span className="badge" style={{ background: '#F59E0B14', color: '#F59E0B', fontSize: 10, flexShrink: 0 }}>View</span>
              </div>
            </div>
          )}
          {outOfStockCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setWarningsFilter('out')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setWarningsFilter('out') } }}
              style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', outline: 'none' }}
            >
              <div className="card" style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid #FECACA', background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: '0 12px 30px rgba(239, 68, 68, 0.10)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DC262614', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={16} color="#DC2626" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#B91C1C', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Out of stock</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 3 }}>
                      {outOfStockCount} item{outOfStockCount === 1 ? '' : 's'} with zero on hand
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Click to view out-of-stock items.</div>
                  </div>
                </div>
                <span className="badge" style={{ background: '#DC262614', color: '#DC2626', fontSize: 10, flexShrink: 0 }}>View</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Inventory</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {table.totalItems} of {products.length} items
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

      <TableToolbar
        search={table.search}
        onSearch={table.setSearch}
        searchPlaceholder="Search by name, item code, or supplier..."
        filters={filters}
        showReset={table.totalItems !== products.length || Boolean(table.search)}
        onReset={table.resetFilters}
      />

      <BulkActionBar
        count={table.selectedCount}
        onClear={table.clearSelection}
        onDelete={() => setBulkConfirm(true)}
        deleteLabel={`Delete ${table.selectedCount} selected`}
      />

      <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 16, border: '1px solid #FEE2E2', background: 'linear-gradient(135deg, #FFF7F7 0%, #FFFDF5 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#DC262614', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={16} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#B91C1C', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Quarantine Storage</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Written-off stock held here, separate from sellable goods — cannot be issued or sold at POS.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Waste', color: '#EF4444', type: 'waste' as const },
              { label: 'Defect', color: '#F59E0B', type: 'defect' as const },
              { label: 'Reject', color: '#8B5CF6', type: 'reject' as const },
            ].map((stat) => (
              <div
                key={stat.label}
                role="button"
                tabIndex={0}
                onClick={() => setWasteSummaryModal(stat.type)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setWasteSummaryModal(stat.type) } }}
                style={{ padding: '8px 14px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #F1D4D4', textAlign: 'center', minWidth: 78, cursor: 'pointer', outline: 'none' }}
              >
                <div style={{ fontSize: 18, fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stockForType(stat.type)}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setWasteSummaryModal('all')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setWasteSummaryModal('all') } }}
              style={{ padding: '8px 14px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #F1D4D4', textAlign: 'center', minWidth: 96, cursor: 'pointer', outline: 'none' }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{formatCurrency(quarantineValue)}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Est. loss</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card table-scroll inventory-desktop-table" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr>
              <th style={{ width: 36 }}>
                <SelectAllCheckbox
                  checked={table.isAllFilteredSelected}
                  indeterminate={table.isSomeFilteredSelected}
                  onToggle={table.selectAllFiltered}
                  disabled={table.totalItems === 0}
                />
              </th>
              <SortHeader label="Item Code" column="item_code" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
              <th>Barcode</th>
              <SortHeader label="Product Name" column="name" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
              <SortHeader label="Category" column="categoryName" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
              <th>Supplier</th>
              <th>UOM</th>
              <SortHeader label="On Hand" column="onHand" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} align="right" />
              <SortHeader label="Reorder" column="reorder" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} align="right" />
              <SortHeader label="Unit Cost" column="unitCost" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} align="right" />
              <SortHeader label="Selling Price" column="price" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} align="right" />
              <SortHeader label="Location" column="locationName" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
              <SortHeader label="Waste" column="wasteTotal" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} align="right" />
              <SortHeader label="Status" column="status" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
              <th style={{ width: 104, textAlign: 'center', position: 'sticky', right: 0, background: '#F8FAFC', zIndex: 2 }}>Action</th>
            </tr></thead>
          <tbody>
            {table.paginated.map((row) => {
              const product = productById.get(String(row.id))!
              const isSelected = table.selected.has(product.id)
              const status = product.quantity_on_hand === 0 ? 'out' : product.quantity_on_hand <= product.reorder_point ? 'low' : 'ok'
              const statusColor = status === 'out' ? '#EF4444' : status === 'low' ? '#F59E0B' : '#10B981'
              const statusLabel = status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'
              return (
                <tr key={product.id} style={isSelected ? { background: '#EFF6FF' } : (!product.is_active ? { opacity: 0.55, background: '#F8FAFC' } : undefined)}>
                  <td>
                    <RowCheckbox checked={isSelected} onToggle={() => table.toggleSelect(product.id)} />
                  </td>
                  <td>
                    <code style={{ fontSize: 11, background: '#EFF6FF', padding: '2px 6px', borderRadius: 4, color: '#3B82F6' }}>{product.item_code}</code>
                  </td>
                  <td>
                    {product.barcode ? (
                      <code style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, color: '#0F172A' }}>{product.barcode}</code>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{product.name}</span>
                      {isProduction && product.is_finished_good && (
                        <span className="badge badge-purple" style={{ fontSize: 9 }}>Finished Good</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{product.supplier?.name ?? 'No supplier'}</div>
                  </td>
                  <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{product.category?.name ?? 'Uncategorized'}</span></td>
                  <td style={{ color: '#475569', fontSize: 12 }}>{product.supplier?.name ?? 'No supplier'}</td>
                  <td style={{ color: '#475569' }}>{product.uom?.abbreviation ?? 'pcs'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: statusColor, fontSize: 15 }}>{product.quantity_on_hand}</span>
                      {(stockByLocation.get(product.id)?.length ?? 0) > 1 && <MultiSiteBadge />}
                    </div>
                    <div style={{ marginTop: 3, width: 48, height: 3, marginLeft: 'auto', background: '#E2E8F0', borderRadius: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: statusColor, width: `${Math.min((product.quantity_on_hand / Math.max(product.reorder_point * 4, 1)) * 100, 100)}%` }} />
                    </div>
                    <StockLocationBreakdown items={stockByLocation.get(product.id) ?? []} wasteIds={wasteLocationIdSet} />
                  </td>
                  <td style={{ color: '#475569' }}>{product.reorder_point}</td>
                  <td style={{ color: '#0F172A' }}>{formatCurrency(Number(product.unit_cost ?? 0))}</td>
                  <td style={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(Number(product.selling_price ?? 0))}</td>
                  <td style={{ color: '#475569', fontSize: 12 }}>
                    {product.location?.name ?? 'Unassigned'}
                    {(stockByLocation.get(product.id)?.length ?? 0) > 1 && <MultiSiteBadge />}
                  </td>
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
                  <td><span className="badge" style={{ background: `${statusColor}14`, color: statusColor }}>{statusLabel}{!product.is_active ? ' · Inactive' : ''}</span></td>
                  <td style={{ position: 'sticky', right: 0, background: '#fff', zIndex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 30px)', gap: 4, justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)} disabled={!product.is_active} style={{ padding: 5, opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }} title="Edit"><Edit2 size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openLots(product)} disabled={!product.is_active} style={{ padding: 5, opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }} title="View FIFO lots"><Package size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openWaste(product)} disabled={!product.is_active} style={{ padding: 5, color: '#DC2626', opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }} title="Log waste / defect / reject"><AlertTriangle size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openTransfer(product)} disabled={!product.is_active} style={{ padding: 5, color: '#0EA5E9', opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }} title="Transfer stock"><ArrowLeftRight size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleProduct(product.id)} style={{ padding: 5, color: product.is_active ? '#94A3B8' : '#10B981' }} title={product.is_active ? 'Deactivate item' : 'Activate item'}><Power size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(product.id)} disabled={!product.is_active} style={{ padding: 5, opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                 </tr>
              )
            })}
            {table.paginated.length === 0 && (
              <tr>
                <td colSpan={15} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                  <Package size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
                  <p>No items found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={table.page}
        totalPages={table.totalPages}
        onPageChange={table.setPage}
        pageSize={table.pageSize}
        onPageSizeChange={table.setPageSize}
        rangeStart={table.range.start}
        rangeEnd={table.range.end}
        totalItems={table.totalItems}
      />

      <div className="inventory-mobile-list">
        {table.paginated.map((row) => {
          const product = productById.get(String(row.id))!
          const isSelected = table.selected.has(product.id)
          const status = product.quantity_on_hand === 0 ? 'out' : product.quantity_on_hand <= product.reorder_point ? 'low' : 'ok'
          const statusColor = status === 'out' ? '#EF4444' : status === 'low' ? '#F59E0B' : '#10B981'
          const statusLabel = status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'

          return (
            <div key={product.id} className="card" style={{ padding: 14, borderRadius: 16, border: isSelected ? '1px solid #3B82F6' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ paddingTop: 2 }}>
                    <RowCheckbox checked={isSelected} onToggle={() => table.toggleSelect(product.id)} />
                  </div>
                   <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>
                      {product.name}
                      {isProduction && product.is_finished_good && (
                        <span className="badge badge-purple" style={{ fontSize: 9, marginLeft: 6, verticalAlign: 'middle' }}>Finished Good</span>
                      )}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: '#64748B' }}>{product.item_code} · {product.supplier?.name ?? 'No supplier'}</div>
                  </div>
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
                  <div style={{ marginTop: 4, fontWeight: 700, color: '#0F172A' }}>
                    {product.location?.name ?? 'Unassigned'}
                    {(stockByLocation.get(product.id)?.length ?? 0) > 1 && <MultiSiteBadge />}
                  </div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#94A3B8' }}>On hand</div>
                  <div style={{ marginTop: 4, fontWeight: 800, color: statusColor }}>{product.quantity_on_hand}</div>
                  <StockLocationBreakdown items={stockByLocation.get(product.id) ?? []} wasteIds={wasteLocationIdSet} />
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
                <button className="btn btn-ghost btn-sm" onClick={() => setViewId(product.id)} disabled={!product.is_active} style={{ flex: 1, justifyContent: 'center', opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }}>
                  <Eye size={13} /> View
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)} disabled={!product.is_active} style={{ flex: 1, justifyContent: 'center', opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }}>
                  <Edit2 size={13} /> Edit
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openLots(product)} disabled={!product.is_active} style={{ flex: 1, justifyContent: 'center', opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }}>
                  <Package size={13} /> Lots
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openWaste(product)} disabled={!product.is_active} style={{ flex: 1, justifyContent: 'center', color: '#DC2626', opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }}>
                  <AlertTriangle size={13} /> Log Waste
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openTransfer(product)} disabled={!product.is_active} style={{ flex: 1, justifyContent: 'center', color: '#0EA5E9', opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }}>
                  <ArrowLeftRight size={13} /> Transfer
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleProduct(product.id)} style={{ flex: 1, justifyContent: 'center', color: product.is_active ? '#94A3B8' : '#10B981' }}>
                  <Power size={13} /> {product.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(product.id)} disabled={!product.is_active} style={{ flex: 1, justifyContent: 'center', opacity: product.is_active ? 1 : 0.4, cursor: product.is_active ? 'pointer' : 'not-allowed' }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          )
        })}

        {table.paginated.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
            <Package size={28} style={{ marginBottom: 8, opacity: 0.35 }} />
            <p>No items found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{editingId ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {[
                { label: 'Item Code', key: 'item_code', placeholder: 'e.g. COF001' },
                { label: 'Product Name', key: 'name', placeholder: 'e.g. Espresso Beans' },
                { label: 'Barcode', key: 'barcode', placeholder: 'Scan or type barcode' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input className="input" placeholder={placeholder} value={form[key as keyof ProductForm] as string} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                </div>
              ))}

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Category</label>
                {state.categories.length > 0 ? (
                  <SearchableSelect
                    className="input"
                    placeholder="Select category..."
                    searchPlaceholder="Search categories..."
                    value={form.category}
                    onChange={(value) => setForm((current) => ({ ...current, category: value }))}
                    options={state.categories.map((category) => ({ value: category.name, label: category.name }))}
                  />
                ) : (
                  <input className="input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Type a category name" />
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Unit of Measure</label>
                {state.unitsOfMeasure.length > 0 ? (
                  <SearchableSelect
                    className="input"
                    placeholder="Select unit..."
                    searchPlaceholder="Search units..."
                    value={form.uom}
                    onChange={(value) => setForm((current) => ({ ...current, uom: value }))}
                    options={state.unitsOfMeasure.map((unit) => ({ value: unit.abbreviation, label: unit.abbreviation }))}
                  />
                ) : (
                  <input className="input" value={form.uom} onChange={(event) => setForm((current) => ({ ...current, uom: event.target.value }))} placeholder="Type a unit abbreviation" />
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Supplier</label>
                {state.suppliers.length > 0 ? (
                  <SearchableSelect
                    className="input"
                    placeholder="Select supplier..."
                    searchPlaceholder="Search suppliers..."
                    value={form.supplier}
                    onChange={(value) => setForm((current) => ({ ...current, supplier: value }))}
                    options={state.suppliers.map((supplier) => ({ value: supplier.name, label: supplier.name }))}
                  />
                ) : (
                  <input className="input" value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} placeholder="Type a supplier name" />
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Location</label>
                {state.locations.length > 0 ? (
                  <SearchableSelect
                    className="input"
                    placeholder="Select location..."
                    searchPlaceholder="Search locations..."
                    value={form.location}
                    onChange={(value) => setForm((current) => ({ ...current, location: value }))}
                    options={state.locations.map((location) => ({ value: location.id, label: location.name }))}
                  />
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
                  <input className="input" type="number" placeholder={placeholder} value={form[key as keyof ProductForm] as string} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                </div>
              ))}

              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Description (optional)</label>
                <textarea className="input" placeholder="Product description..." value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} style={{ height: 70, resize: 'none' }} />
              </div>

              {isProduction && (
                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#FAF5FF', border: '1px solid #E9D5FF' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Finished Good</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Mark as a product you manufacture and sell. Only finished goods are sellable at the POS; raw materials are for production only.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, finishedGood: !current.finishedGood }))}
                    style={{
                      flexShrink: 0,
                      width: 46,
                      height: 26,
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      padding: 3,
                      background: form.finishedGood ? '#8B5CF6' : '#CBD5E1',
                      display: 'flex',
                      justifyContent: form.finishedGood ? 'flex-end' : 'flex-start',
                      transition: 'background 0.15s',
                    }}
                    aria-pressed={form.finishedGood}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={15} />{editingId ? 'Save Changes' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={24} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Delete {table.selectedCount} items?</h3>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>This action cannot be undone. The selected items will be permanently removed from your inventory.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setBulkConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteSelected}>Delete Items</button>
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
        return (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 460 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Waste / Defect / Reject</h2>
                <button onClick={closeWaste} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{target.name}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{target.item_code} · {target.quantity_on_hand} on hand</div>
                <div style={{ marginTop: 8, fontSize: 11, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #E9D5FF', borderRadius: 8, padding: '6px 8px' }}>
                  Each type is tracked separately and kept in quarantine — separate from sellable stock and not issuable or sellable at POS. Set a value to 0 to clear it.
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
                {([
                  { key: 'waste', label: 'Waste', color: '#EF4444' },
                  { key: 'defect', label: 'Defect', color: '#F59E0B' },
                  { key: 'reject', label: 'Reject', color: '#8B5CF6' },
                ] as const).map((opt) => (
                  <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: opt.color, flexShrink: 0 }} />
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', width: 64, flexShrink: 0 }}>{opt.label}</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step="any"
                      value={wasteDraft[opt.key]}
                      onChange={(event) => setWasteDraft((prev) => ({ ...prev, [opt.key]: event.target.value }))}
                      placeholder="0"
                      style={{ height: 40, fontSize: 14, flex: 1 }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Remarks (optional)</label>
                <textarea
                  className="input"
                  value={wasteRemark}
                  onChange={(event) => setWasteRemark(event.target.value)}
                  placeholder="e.g. expired, damaged in transit..."
                  style={{ height: 64, resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={closeWaste}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveWaste}><Save size={15} /> Save</button>
              </div>
            </div>
          </div>
        )
      })()}

      {warningsFilter && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                {warningsFilter === 'out' ? 'Out of Stock Items' : 'Low Stock Items'}
              </h2>
              <button onClick={() => setWarningsFilter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 12, background: warningsFilter === 'out' ? '#FEF2F2' : '#FFF7ED', border: `1px solid ${warningsFilter === 'out' ? '#FECACA' : '#FED7AA'}`, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: warningsFilter === 'out' ? '#EF4444' : '#F59E0B', lineHeight: 1 }}>
                {warningsFilter === 'out' ? outOfStockCount : lowStockCount}
              </div>
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>
                {warningsFilter === 'out' ? 'Out of stock' : 'Low stock'}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
              {(warningsFilter === 'out' ? outOfStockItems : lowStockItems).length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>No items in this category.</p>
              ) : (warningsFilter === 'out' ? outOfStockItems : lowStockItems).map((product) => {
                const alert = state.alerts.find((a) => a.product_id === product.id && a.status === 'open' && (a.alert_type === 'out_of_stock' || a.alert_type === 'low_stock'))
                const isFinished = product.is_finished_good
                return (
                <div key={product.id} style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: `1px solid ${warningsFilter === 'out' ? '#FECACA' : '#FEF3C7'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{product.name}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{product.item_code}</div>
                    </div>
                    <span className="badge" style={{ background: warningsFilter === 'out' ? '#EF444414' : '#F59E0B14', color: warningsFilter === 'out' ? '#EF4444' : '#F59E0B', fontSize: 10, flexShrink: 0 }}>
                      {warningsFilter === 'out' ? 'Out of stock' : 'Low stock'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                    On hand: {warningsFilter === 'out' ? 0 : product.quantity_on_hand} · Reorder point: {product.reorder_point}
                  </div>
                  {alert && (
                    <div style={{ marginTop: 8 }}>
                      {alert.purchase_order_id ? (
                        <span className="badge" style={{ background: '#10B98114', color: '#059669', fontSize: 10 }}>Ordered — pending receipt</span>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          if (isFinished) router.push('/dashboard/production')
                          else router.push(`/dashboard/orders?restock=${alert.product_id}`)
                        }}>
                          <ShoppingCart size={13} /> {isFinished ? 'Produce' : 'Order'} restock
                        </button>
                      )}
                    </div>
                  )}
                </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setWarningsFilter(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {wasteSummaryModal && (() => {
        const title = wasteSummaryModal === 'all' ? 'Waste / Defect / Reject' : wasteSummaryModal.charAt(0).toUpperCase() + wasteSummaryModal.slice(1)
        const color = wasteSummaryModal === 'waste' ? '#EF4444' : wasteSummaryModal === 'defect' ? '#F59E0B' : wasteSummaryModal === 'reject' ? '#8B5CF6' : '#0F172A'
        const items = wasteSummaryModal === 'all' ? wasteItems : wasteItems.filter((entry) => entry.type === wasteSummaryModal)
        return (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 520 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{title} Items</h2>
                <button onClick={() => { setWasteSummaryModal(null); setWasteReverseConfirm(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #F1D4D4', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Total entries</span>
                <span style={{ fontSize: 14, fontWeight: 800, color }}>{items.length} item{items.length === 1 ? '' : 's'}</span>
              </div>

              <div style={{ display: 'grid', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                {items.length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>No {wasteSummaryModal === 'all' ? 'waste, defect or reject' : wasteSummaryModal} items recorded.</p>
                ) : (
                  items.map((entry) => {
                    const itemColor = entry.type === 'waste' ? '#EF4444' : entry.type === 'defect' ? '#F59E0B' : '#8B5CF6'
                    return (
                      <div key={entry.id} style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{entry.product?.name ?? 'Unknown item'}</div>
                              <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{entry.product?.item_code ?? ''} · {formatTimestamp(entry.created_at)}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              {entry.isReversed ? (
                                <span className="badge" style={{ background: '#ECFDF5', color: '#059669', fontSize: 10 }}>Reversed</span>
                              ) : (
                                <span className="badge" style={{ background: `${itemColor}14`, color: itemColor, fontSize: 10 }}>{entry.type}</span>
                              )}
                              {!entry.isReversed && perms.canDeleteRecords !== false && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  title="Delete / reverse this entry"
                                  onClick={() => setWasteReverseConfirm(entry.id)}
                                  style={{ padding: 5, color: '#DC2626', opacity: 0.9, cursor: 'pointer' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>Qty: {entry.quantity}{entry.notes ? ` · ${entry.notes}` : ''}</div>
                        {wasteReverseConfirm === entry.id && (
                          <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                            <div style={{ fontSize: 11, color: '#B91C1C', marginBottom: 8 }}>Delete this {entry.type} entry? The quarantined stock will be restored to on hand.</div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button className="btn btn-ghost" style={{ height: 30, fontSize: 12 }} onClick={() => setWasteReverseConfirm(null)}>Cancel</button>
                              <button className="btn btn-danger" style={{ height: 30, fontSize: 12 }} onClick={() => handleReverseWaste(entry.id)}>Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button className="btn btn-ghost" onClick={() => { setWasteSummaryModal(null); setWasteReverseConfirm(null) }}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {transferModal && (() => {
        const target = state.products.find((entry) => entry.id === transferModal)
        if (!target) return null
         const requestedSource = transferFrom || (target.location_id ?? target.location?.id ?? null)
         const sourceLocationId = resolveStockSourceLocation(state.inventoryLots, target.id, requestedSource)
         const fromLoc = state.locations.find((loc) => loc.id === sourceLocationId)
        const qty = Number(transferQty) || 0
          const lotsAtSource = state.inventoryLots
            .filter((lot) => lot.product_id === target.id && lot.location_id === sourceLocationId)
            .reduce((sum, lot) => sum + Number(lot.quantity ?? 0), 0)
          const onHandTotal = Number(target.quantity_on_hand ?? 0)
          const hasLocationLots = lotsAtSource > 0
          const availableAtSource = hasLocationLots ? lotsAtSource : onHandTotal
          const maxQty = availableAtSource
        const transferableLocations = state.locations.filter((loc) => !wasteLocationIds.includes(loc.id))
        return (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 460 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Transfer Stock</h2>
                <button onClick={closeTransfer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{target.name}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                  {target.item_code} · {maxQty} available at {fromLoc?.name ?? 'Unassigned'}
                </div>
                {transferableLocations.length <= 1 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 8px' }}>
                    Add another storage location in Settings to transfer stock between sites.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>From Location</label>
                {transferableLocations.length > 0 ? (
                  <SearchableSelect
                    className="input"
                    placeholder="Select source…"
                    searchPlaceholder="Search locations..."
                    style={{ height: 40, fontSize: 14 }}
                    value={transferFrom}
                    onChange={(value) => setTransferFrom(value)}
                    options={transferableLocations.map((loc) => ({ value: loc.id, label: `${loc.name} (${loc.code})` }))}
                  />
                ) : (
                  <input className="input" value={fromLoc?.name ?? 'Unassigned'} disabled style={{ height: 40, fontSize: 14, background: '#F1F5F9' }} />
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>To Location</label>
                <SearchableSelect
                  className="input"
                  placeholder="Select destination…"
                  searchPlaceholder="Search locations..."
                  style={{ height: 40, fontSize: 14 }}
                  value={transferTo}
                  onChange={(value) => setTransferTo(value)}
                  options={transferableLocations.filter((loc) => loc.id !== sourceLocationId).map((loc) => ({ value: loc.id, label: `${loc.name} (${loc.code})` }))}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Quantity</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={maxQty}
                  value={transferQty}
                  onChange={(event) => setTransferQty(event.target.value)}
                  placeholder="0"
                  style={{ height: 40, fontSize: 14, borderColor: qty > maxQty ? '#EF4444' : undefined }}
                />
                {qty > maxQty && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#DC2626' }}>Only {maxQty} units available — reduce the quantity to transfer.</div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Notes (optional)</label>
                <textarea
                  className="input"
                  value={transferNotes}
                  onChange={(event) => setTransferNotes(event.target.value)}
                  placeholder="e.g. restock to cold storage"
                  style={{ height: 64, resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={closeTransfer}>Cancel</button>
                <button className="btn btn-primary" onClick={handleTransfer} disabled={!transferTo || qty <= 0 || !sourceLocationId || transferTo === sourceLocationId}><ArrowLeftRight size={15} /> Transfer</button>
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
                <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Supplier</th><th>Location</th><th>UOM</th><th>Cost</th><th>Price</th><th>Qty</th><th>Reorder</th><th>Type</th></tr></thead>
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
                      <td>
                        {row.is_finished_good
                          ? <span className="badge badge-purple" style={{ fontSize: 9 }}>Finished Good</span>
                          : <span style={{ fontSize: 11, color: '#94A3B8' }}>Raw</span>}
                      </td>
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

      {viewId && (() => {
        const target = state.products.find((entry) => entry.id === viewId)
        if (!target) return null
        const locationStock = stockByLocation.get(target.id) ?? []
        return (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 600 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div>
                  <div className="auth-badge" style={{ marginBottom: 10 }}>
                    <Eye size={14} />
                    Item details
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{target.name}</h2>
                  <p style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Read-only view of this inventory item.</p>
                </div>
                <button onClick={() => setViewId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{target.item_code}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{target.description ?? 'No description'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Category</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{target.category?.name ?? 'Uncategorized'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Supplier</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{target.supplier?.name ?? 'No supplier'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>UoM</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{target.uom?.abbreviation ?? 'pcs'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Location</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{target.location?.name ?? 'Unassigned'}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Barcode</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
                    {target.barcode ? <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{target.barcode}</code> : '—'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>On Hand</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{target.quantity_on_hand}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Reorder Point</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{target.reorder_point}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Unit Cost</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{formatCurrency(Number(target.unit_cost ?? 0))}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Selling Price</div>
                  <div style={{ fontWeight: 800, color: '#10B981', marginTop: 4 }}>{formatCurrency(Number(target.selling_price ?? 0))}</div>
                </div>
                {isProduction && (
                  <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Type</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{target.is_finished_good ? 'Finished Good' : 'Raw Material'}</div>
                  </div>
                )}
              </div>

              {locationStock.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Stock by Location</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {locationStock.map((entry) => (
                      <div key={entry.locationId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #D8E4F2' }}>
                        <span style={{ fontSize: 13, color: '#475569' }}>{entry.name}</span>
                        <span style={{ fontWeight: 800, color: '#0F172A' }}>{entry.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => setViewId(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => { setViewId(null); openEdit(target) }}>Edit Item</button>
              </div>
            </div>
          </div>
        )
      })()}
      {lotsModal && (() => {
        const target = state.products.find((entry) => entry.id === lotsModal)
        if (!target) return null
        const lots = state.inventoryLots
          .filter((lot) => lot.product_id === lotsModal)
          .sort((a, b) => a.received_at.localeCompare(b.received_at) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
        return (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 720 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>FIFO Lots - {target.name}</h2>
                <button onClick={closeLots} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#F8FBFF', border: '1px solid #D8E4F2', marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>TOTAL ON HAND</div>
                  <div style={{ marginTop: 4, fontWeight: 900, color: '#0F172A', fontSize: 18 }}>{target.quantity_on_hand}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>ACTIVE LOTS</div>
                  <div style={{ marginTop: 4, fontWeight: 900, color: '#0F172A', fontSize: 18 }}>{lots.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>REORDER POINT</div>
                  <div style={{ marginTop: 4, fontWeight: 900, color: '#F59E0B', fontSize: 18 }}>{target.reorder_point}</div>
                </div>
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto', borderRadius: 8, border: '1px solid #D8E4F2' }}>
                <table className="data-table">
                  <thead><tr>
                      <th>Lot Ref</th>
                      <th>Received At</th>
                      <th>Qty</th>
                      <th>Unit Cost</th>
                      <th>Source</th>
                      <th>Location</th>
                    </tr></thead>
                  <tbody>
                    {lots.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>
                          No active lots
                        </td>
                      </tr>
                    ) : (
                      lots.map((lot: InventoryLot, index) => (
                        <tr key={lot.id}>
                          <td style={{ fontSize: 11, color: '#64748B' }}>{`#${index + 1}-${new Date(lot.received_at).toLocaleDateString('en-CA')}`}</td>
                           <td style={{ fontSize: 12, color: '#0F172A' }}>{formatTimestamp(lot.received_at)}</td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>{lot.quantity}</td>
                          <td style={{ color: '#0F172A' }}>{formatCurrency(Number(lot.unit_cost))}</td>
                          <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{lot.source}</span></td>
                          <td style={{ fontSize: 12, color: '#475569' }}>{state.locations.find((location) => location.id === lot.location_id)?.name ?? 'Unassigned'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={closeLots}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
