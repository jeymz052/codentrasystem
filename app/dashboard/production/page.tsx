'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bookmark, Copy, Factory, Layers, Package, Plus, Save, Trash2, X, Zap } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { canPerformMutation } from '@/lib/access-control'
import type { Product, ProductRecipe, UnitOfMeasure } from '@/types/database'
import { useTableState } from '@/lib/use-table-state'
import { TableToolbar, type ToolbarFilter } from '@/components/ui/table/TableToolbar'
import { SortHeader } from '@/components/ui/table/SortHeader'
import { Pagination } from '@/components/ui/table/Pagination'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

export default function ProductionPage() {
  const { state, availableTenants, activeTenantId, createRecipe, updateRecipe, deleteRecipe, produceFinishedGood, createProductionTemplate, deleteProductionTemplate, notifySuccess, notifyError, formatCurrency } = useDemoSystem()
  const role = availableTenants.find((t) => t.id === (activeTenantId || state.tenant.id))?.role ?? 'admin'
  const canEdit = canPerformMutation(role, 'createRecipe')
  const canProduce = canPerformMutation(role, 'produceFinishedGood')

  const [modalOpen, setModalOpen] = useState(false)
  const [activeFinishedGoodId, setActiveFinishedGoodId] = useState<string | null>(null)

  const [recipeForm, setRecipeForm] = useState({ ingredientId: '', quantityPerUnit: '', uomId: '' })
  const [editingRecipe, setEditingRecipe] = useState<ProductRecipe | null>(null)
  const [produceQty, setProduceQty] = useState('')
  const [produceLocation, setProduceLocation] = useState<string>('')

  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateNotes, setTemplateNotes] = useState('')
  const [confirmProduceId, setConfirmProduceId] = useState<string | null>(null)

  const uoms = useMemo(() => state.unitsOfMeasure.filter((u) => u.is_active), [state.unitsOfMeasure])
  const templates = useMemo(() => state.productionTemplates.slice().sort((a, b) => a.name.localeCompare(b.name)), [state.productionTemplates])

  const recentProduction = useMemo(() => {
    return state.stockMovements
      .filter((m) => m.movement_type === 'production' && Number(m.quantity) > 0)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8)
      .map((m) => ({
        id: m.id,
        productName: m.product?.name ?? state.products.find((p) => p.id === m.product_id)?.name ?? 'Unknown',
        quantity: m.quantity,
        uom: m.product?.uom?.abbreviation ?? state.products.find((p) => p.id === m.product_id)?.uom?.abbreviation ?? 'pcs',
        date: new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      }))
  }, [state.stockMovements, state.products])

  const recipesByFinishedGood = useMemo(() => {
    const map = new Map<string, ProductRecipe[]>()
    for (const recipe of state.productRecipes) {
      const list = map.get(recipe.finished_good_id) ?? []
      list.push(recipe)
      map.set(recipe.finished_good_id, list)
    }
    return map
  }, [state.productRecipes])

  const categoryNames = useMemo(() => ['all', ...state.categories.map((c) => c.name)], [state.categories])

  const rows = useMemo(() => {
    return state.products
      .filter((p) => p.is_active && (recipesByFinishedGood.get(p.id)?.length || p.is_finished_good))
      .map((product) => {
        const ingredientCount = recipesByFinishedGood.get(product.id)?.length ?? 0
        return {
          id: product.id,
          item_code: product.item_code,
          name: product.name,
          categoryName: product.category?.name ?? 'Uncategorized',
          ingredientCount,
          onHand: product.quantity_on_hand,
          price: Number(product.selling_price ?? 0),
        }
      })
  }, [state.products, recipesByFinishedGood])

  const table = useTableState({
    data: rows,
    initialPageSize: 10,
    searchKeys: (row) => [String(row.name), String(row.item_code), String(row.categoryName)],
    filterFields: [
      {
        key: 'category',
        label: 'Category',
        options: categoryNames.map((name) => ({ value: name, label: name === 'all' ? 'All Categories' : name })),
        getValue: (row) => String(row.categoryName),
      },
    ],
  })

  const finishedGoodsCount = rows.length
  const rawCount = state.products.filter((p) => p.is_active && !(recipesByFinishedGood.get(p.id)?.length || p.is_finished_good)).length

  const filters: ToolbarFilter[] = [
    {
      key: 'category',
      label: 'Category',
      value: table.filters.category ?? 'all',
      onChange: (value) => table.setFilter('category', value),
      options: categoryNames.map((name) => ({ value: name, label: name === 'all' ? 'All Categories' : name })),
    },
  ]

  const activeProduct = activeFinishedGoodId ? state.products.find((p) => p.id === activeFinishedGoodId) ?? null : null
  const activeRecipes = activeFinishedGoodId ? (recipesByFinishedGood.get(activeFinishedGoodId) ?? []) : []

  const uomById = useMemo(() => new Map(uoms.map((u) => [u.id, u])), [uoms])

  const effectiveUom = (recipe: ProductRecipe): UnitOfMeasure | undefined => {
    if (recipe.uom_id) return uomById.get(recipe.uom_id)
    const ingredient = state.products.find((p) => p.id === recipe.ingredient_id)
    return ingredient?.uom
  }

  const ingredients = useMemo(() => state.products.filter((p) => p.is_active), [state.products])
  const finishedGoodOptions = useMemo(
    () => state.products.filter((p) => p.is_active && (recipesByFinishedGood.get(p.id)?.length || p.is_finished_good)),
    [state.products, recipesByFinishedGood]
  )
  const selectedIngredient = state.products.find((p) => p.id === recipeForm.ingredientId)
  const projectedStock = activeProduct && produceQty ? Number(activeProduct.quantity_on_hand) + Number(produceQty) : null

  function resetRecipeForm() {
    setEditingRecipe(null)
    setRecipeForm({ ingredientId: '', quantityPerUnit: '', uomId: '' })
  }

  function openModal(finishedGoodId: string | null) {
    setActiveFinishedGoodId(finishedGoodId)
    resetRecipeForm()
    setProduceQty('')
    setProduceLocation('')
    setSavingTemplate(false)
    setTemplateName('')
    setTemplateNotes('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setActiveFinishedGoodId(null)
  }

  function handleIngredientChange(value: string) {
    const ingredient = state.products.find((p) => p.id === value)
    setRecipeForm((f) => ({ ...f, ingredientId: value, uomId: ingredient?.uom_id ?? '' }))
  }

  function handleSaveRecipe() {
    if (!activeFinishedGoodId || !recipeForm.ingredientId || !recipeForm.quantityPerUnit) return
    const qty = Number(recipeForm.quantityPerUnit)
    if (Number.isNaN(qty) || qty <= 0) {
      notifyError('Quantity per unit must be greater than 0.')
      return
    }

    if (editingRecipe) {
      updateRecipe(editingRecipe.id, qty, recipeForm.uomId || null)
      notifySuccess('Ingredient updated successfully.')
    } else {
      createRecipe(activeFinishedGoodId, recipeForm.ingredientId, qty, recipeForm.uomId || null)
      notifySuccess('Ingredient added to recipe.')
    }
    resetRecipeForm()
  }

  function handleEditRecipe(recipe: ProductRecipe) {
    const ingredient = state.products.find((p) => p.id === recipe.ingredient_id)
    setEditingRecipe(recipe)
    setRecipeForm({
      ingredientId: recipe.ingredient_id,
      quantityPerUnit: String(recipe.quantity_per_unit),
      uomId: recipe.uom_id ?? ingredient?.uom_id ?? '',
    })
  }

  function handleDeleteRecipe(recipeId: string) {
    deleteRecipe(recipeId)
    notifySuccess('Ingredient removed from recipe.')
    if (editingRecipe?.id === recipeId) resetRecipeForm()
  }

  function handleProduce() {
    if (!activeFinishedGoodId || !produceQty) return
    const qty = Number(produceQty)
    if (Number.isNaN(qty) || qty <= 0) {
      notifyError('Produce quantity must be greater than 0.')
      return
    }
    produceFinishedGood(activeFinishedGoodId, qty, produceLocation || null)
    notifySuccess(`Produced ${qty} x ${activeProduct?.name ?? 'item'}.`)
    setProduceQty('')
    setProduceLocation('')
    closeModal()
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
    setActiveFinishedGoodId(template.finished_good_id)
    resetRecipeForm()
    setProduceQty(String(template.quantity))
    setProduceLocation(template.location_id ?? '')
    setSavingTemplate(false)
    setTemplateName('')
    setTemplateNotes('')
    setModalOpen(true)
    notifySuccess(`Loaded "${template.name}" template.`)
  }

  function duplicateTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
    createProductionTemplate({
      name: `${template.name} (copy)`,
      finishedGoodId: template.finished_good_id,
      quantity: template.quantity,
      locationId: template.location_id ?? null,
      notes: template.notes,
    })
    notifySuccess(`Template duplicated as "${template.name} (copy)".`)
  }

  function handleProduceTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
    const hasBom = state.productRecipes.some((r) => r.finished_good_id === template.finished_good_id)
    if (!hasBom) {
      notifyError('This template’s finished good has no recipe yet. Open it and add ingredients first.')
      return
    }
    setConfirmProduceId(templateId)
  }

  function confirmProduceTemplate() {
    const template = templates.find((t) => t.id === confirmProduceId)
    if (!template) return
    produceFinishedGood(template.finished_good_id, template.quantity, template.location_id ?? null)
    notifySuccess(`Produced ${template.quantity} x ${state.products.find((p) => p.id === template.finished_good_id)?.name ?? 'item'} from "${template.name}".`)
    setConfirmProduceId(null)
  }

  function handleSaveTemplate() {
    const name = templateName.trim()
    if (!name) {
      notifyError('Enter a template name.')
      return
    }
    if (!activeFinishedGoodId || !produceQty || Number(produceQty) <= 0) {
      notifyError('Set a finished good and quantity before saving a template.')
      return
    }
    createProductionTemplate({ name, finishedGoodId: activeFinishedGoodId, quantity: Number(produceQty), locationId: produceLocation || null, notes: templateNotes.trim() || null })
    notifySuccess(`Template "${name}" saved.`)
    setSavingTemplate(false)
    setTemplateName('')
    setTemplateNotes('')
    closeModal()
  }

  useEffect(() => {
    if (!activeFinishedGoodId && modalOpen) return
    if (activeFinishedGoodId && !state.products.some((p) => p.id === activeFinishedGoodId)) {
      setActiveFinishedGoodId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, activeFinishedGoodId])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(59,130,246,0.35)' }}>
            <Factory size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Production</h2>
            <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
              Build Bills of Materials (BOM) for finished goods, then produce and reuse templates.
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal(null)}>
          <Plus size={15} /> New Production Run
        </button>
      </div>

      <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 16, border: '1px solid #DBEAFE', background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#3B82F614', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={16} color="#3B82F6" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Finished Goods</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Only finished goods (products with a BOM) can be sold at the POS.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {[
              { label: 'Finished Goods', value: finishedGoodsCount, color: '#10B981' },
              { label: 'Raw Materials', value: rawCount, color: '#F59E0B' },
              { label: 'Templates', value: templates.length, color: '#8B5CF6' },
            ].map((stat) => (
              <div key={stat.label} style={{ padding: '8px 14px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center', minWidth: 92 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Bookmark size={18} color="#8B5CF6" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Production Templates</h3>
            <span className="badge badge-purple" style={{ marginLeft: 2 }}>{templates.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {templates.map((template) => {
              const fg = state.products.find((p) => p.id === template.finished_good_id)
              const loc = state.locations.find((l) => l.id === template.location_id)
              return (
                <div key={template.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FAF5FF' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{template.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {fg?.name ?? 'Unknown'} · {template.quantity} {fg?.uom?.abbreviation ?? ''}
                      {loc ? ` · ${loc.name}` : ''}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ width: '100%' }} disabled={!canProduce} onClick={() => handleProduceTemplate(template.id)}>
                    <Zap size={13} /> Produce {template.quantity} {fg?.uom?.abbreviation ?? ''}
                  </button>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => applyTemplate(template.id)} title="Open in editor">
                      <Package size={13} /> Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => duplicateTemplate(template.id)} aria-label="Duplicate template" title="Duplicate">
                      <Copy size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteProductionTemplate(template.id)} aria-label="Delete template" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {recentProduction.length > 0 && (
        <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Package size={18} color="#0F766E" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Recent Production</h3>
            <span className="badge badge-teal" style={{ marginLeft: 2 }}>{recentProduction.length}</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {recentProduction.map((log) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{log.productName}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{log.date}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F766E', flexShrink: 0 }}>
                  +{log.quantity} {log.uom}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TableToolbar
        search={table.search}
        onSearch={table.setSearch}
        searchPlaceholder="Search by name, item code, or category..."
        filters={filters}
        showReset={table.totalItems !== rows.length || Boolean(table.search)}
        onReset={table.resetFilters}
      />

      <div className="card table-scroll production-desktop-table" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <SortHeader label="Item Code" column="item_code" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
              <SortHeader label="Finished Good" column="name" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} />
              <SortHeader label="BOM" column="ingredientCount" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} align="right" />
              <SortHeader label="Stock" column="onHand" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} align="right" />
              <SortHeader label="Selling Price" column="price" sortKey={table.sort.key as string} direction={table.sort.direction} onToggle={table.toggleSort} align="right" />
              <th style={{ width: 110, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {table.paginated.map((row) => {
              const product = state.products.find((p) => p.id === row.id)
              if (!product) return null
              return (
                <tr key={product.id} style={{ cursor: 'pointer' }} onClick={() => openModal(product.id)}>
                  <td>
                    <code style={{ fontSize: 11, background: '#EFF6FF', padding: '2px 6px', borderRadius: 4, color: '#3B82F6' }}>{product.item_code}</code>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{product.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{product.category?.name ?? 'Uncategorized'}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {row.ingredientCount > 0 ? (
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{row.ingredientCount}</span>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                    {product.quantity_on_hand} <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{product.uom?.abbreviation ?? 'pcs'}</span>
                  </td>
                  <td style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>{formatCurrency(row.price)}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-primary btn-sm" onClick={() => openModal(product.id)}>
                        <Layers size={13} /> Manage
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {table.paginated.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                  <Factory size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
                  <p>No finished goods yet.</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Click “New Production Run” to build a Bill of Materials for a product.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="production-mobile-list">
        {table.paginated.map((row) => {
          const product = state.products.find((p) => p.id === row.id)
          if (!product) return null
          return (
            <div key={product.id} className="card" style={{ padding: 14, borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{product.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    <code style={{ background: '#EFF6FF', padding: '1px 6px', borderRadius: 4, color: '#3B82F6' }}>{product.item_code}</code>
                    {' '}{product.category?.name ?? 'Uncategorized'}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => openModal(product.id)}>
                  <Layers size={13} /> Manage
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                <div style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 10, color: '#64748B' }}>BOM</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{row.ingredientCount || '—'}</div>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Stock</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{product.quantity_on_hand}</div>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Price</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{formatCurrency(row.price)}</div>
                </div>
              </div>
            </div>
          )
        })}
        {table.paginated.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
            <Factory size={28} style={{ marginBottom: 8, opacity: 0.35 }} />
            <p>No finished goods yet.</p>
          </div>
        )}
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

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                  {activeProduct ? `Bill of Materials — ${activeProduct.name}` : 'New Production Run'}
                </h2>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  {activeProduct ? `${activeProduct.item_code} · ${activeProduct.category?.name ?? 'Uncategorized'}` : 'Pick a product to define its Bill of Materials and turn it into a finished good.'}
                </p>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', flexShrink: 0 }} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {!activeProduct ? (
              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Select a finished good</label>
                <SearchableSelect
                  className="input"
                  placeholder="Select a finished good..."
                  searchPlaceholder="Search finished goods..."
                  value={activeFinishedGoodId ?? ''}
                  onChange={(value) => openModal(value || null)}
                  options={finishedGoodOptions.map((product) => ({ value: product.id, label: `${product.name} (${product.item_code})` }))}
                />
                <p style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                  Finished goods are defined in Inventory (toggle “Finished Good”). Pick one to build its recipe (BOM) or produce a batch. Raw materials are not listed here.
                </p>
                {finishedGoodOptions.length === 0 && (
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>No finished goods yet. In Inventory, open a product and turn on “Finished Good”, then build its BOM here.</p>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Current stock</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{activeProduct.quantity_on_hand} {activeProduct.uom?.abbreviation ?? 'pcs'}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Selling price</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{formatCurrency(activeProduct.selling_price ?? 0)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>BOM ingredients</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{activeRecipes.length}</div>
                  </div>
                </div>

                <section style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Layers size={16} color="#3B82F6" />
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Recipe (BOM)</h3>
                    <span className="badge badge-blue" style={{ marginLeft: 2 }}>{activeRecipes.length}</span>
                  </div>

                  {activeRecipes.length === 0 ? (
                    <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 10 }}>No ingredients defined yet. Add the components required to produce this item.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                      {activeRecipes.map((recipe) => {
                        const ingredient = state.products.find((p) => p.id === recipe.ingredient_id)
                        const uom = effectiveUom(recipe)
                        return (
                          <div key={recipe.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{ingredient?.name ?? 'Unknown ingredient'}</div>
                              <div style={{ fontSize: 10, color: '#94A3B8' }}>{recipe.quantity_per_unit} {uom?.abbreviation ?? ''} per unit</div>
                            </div>
                            {canEdit && (
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleEditRecipe(recipe)}><Save size={12} /></button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteRecipe(recipe.id)}><X size={12} /></button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {canEdit && (
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{editingRecipe ? 'Edit Ingredient' : 'Add Ingredient'}</h4>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <SearchableSelect
                          className="input"
                          placeholder="Select ingredient"
                          searchPlaceholder="Search ingredients..."
                          disabled={!!editingRecipe}
                          value={recipeForm.ingredientId}
                          onChange={(value) => handleIngredientChange(value)}
                          options={ingredients.filter((p) => p.id !== activeFinishedGoodId).map((product) => ({ value: product.id, label: `${product.name} (${product.item_code})` }))}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <input
                              className="input"
                              type="number"
                              step="any"
                              placeholder="Qty per unit"
                              value={recipeForm.quantityPerUnit}
                              onChange={(e) => setRecipeForm((f) => ({ ...f, quantityPerUnit: e.target.value }))}
                            />
                            {selectedIngredient && (
                              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                                Stock: {selectedIngredient.quantity_on_hand} {selectedIngredient.uom?.abbreviation ?? ''}
                              </div>
                            )}
                          </div>
                          <SearchableSelect
                            className="input"
                            placeholder="UOM"
                            searchPlaceholder="Search units..."
                            value={recipeForm.uomId}
                            onChange={(value) => setRecipeForm((f) => ({ ...f, uomId: value }))}
                            options={uoms.map((uom) => ({ value: uom.id, label: `${uom.name} (${uom.abbreviation})` }))}
                          />
                        </div>
                        <button className="btn btn-primary" onClick={handleSaveRecipe} style={{ width: '100%' }}>
                          {editingRecipe ? <><Save size={15} /> Update Ingredient</> : <><Plus size={15} /> Add Ingredient</>}
                        </button>
                        {editingRecipe && (
                          <button className="btn btn-ghost" onClick={resetRecipeForm} style={{ width: '100%' }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Package size={16} color="#10B981" />
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Produce</h3>
                  </div>

                  {activeRecipes.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 16, color: '#D97706', flexShrink: 0, lineHeight: 1.2 }}>⚠</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>No recipe defined</div>
                          <div style={{ fontSize: 12, color: '#A16207', marginTop: 2 }}>Add ingredients to the recipe before producing.</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                        <div style={{ fontSize: 12, color: '#64748B' }}>Producing</div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{activeProduct.name}</div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, color: '#64748B', marginBottom: 4, display: 'block' }}>Quantity to Produce ({activeProduct.uom?.abbreviation ?? 'pcs'})</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setProduceQty((q) => String(Math.max(1, (Number(q) || 0) - 1)))} type="button">−</button>
                          <input
                            className="input"
                            type="number"
                            step="any"
                            min="1"
                            placeholder="Enter quantity"
                            value={produceQty}
                            onChange={(e) => setProduceQty(e.target.value)}
                            style={{ textAlign: 'center', flex: 1 }}
                          />
                          <button className="btn btn-ghost btn-sm" onClick={() => setProduceQty((q) => String((Number(q) || 0) + 1))} type="button">+</button>
                        </div>
                        {projectedStock !== null && (
                          <div style={{ fontSize: 11, color: '#10B981', marginTop: 6 }}>
                            Stock after: {projectedStock} {activeProduct.uom?.abbreviation ?? 'pcs'}{' '}
                            <span style={{ color: '#64748B' }}>(+{Number(produceQty)})</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: 12, color: '#64748B', marginBottom: 4, display: 'block' }}>Production Location (optional)</label>
                        <SearchableSelect
                          className="input"
                          placeholder="Default location"
                          searchPlaceholder="Search locations..."
                          value={produceLocation}
                          onChange={(value) => setProduceLocation(value)}
                          options={state.locations.map((loc) => ({ value: loc.id, label: `${loc.name} (${loc.code})` }))}
                        />
                      </div>

                      <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0', fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Ingredients required:</div>
                        {activeRecipes.map((recipe) => {
                          const ingredient = state.products.find((p) => p.id === recipe.ingredient_id)
                          const uom = effectiveUom(recipe)
                          const totalNeeded = Number((recipe.quantity_per_unit * (produceQty ? Number(produceQty) : 1)).toFixed(4))
                          const hasEnough = ingredient ? ingredient.quantity_on_hand >= totalNeeded : false
                          return (
                            <div key={recipe.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E2E8F0' }}>
                              <span style={{ color: '#475569' }}>{ingredient?.name ?? 'Unknown'}</span>
                              <span style={{ color: hasEnough ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                                {totalNeeded} {uom?.abbreviation ?? ''} {!hasEnough && <span style={{ color: '#EF4444' }}>(insufficient)</span>}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {(() => {
                        const insufficient = activeRecipes
                          .map((recipe) => {
                            const ingredient = state.products.find((p) => p.id === recipe.ingredient_id)
                            const totalNeeded = Number((recipe.quantity_per_unit * (produceQty ? Number(produceQty) : 1)).toFixed(4))
                            return { name: ingredient?.name ?? 'Unknown', hasEnough: ingredient ? ingredient.quantity_on_hand >= totalNeeded : false }
                          })
                          .filter((item) => !item.hasEnough)
                        if (insufficient.length > 0) {
                          return (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C' }}>Not enough ingredients</div>
                                <div style={{ fontSize: 11, color: '#7F1D1D' }}>
                                  {insufficient.map((item) => item.name).join(', ')} — production may go negative.
                                </div>
                              </div>
                              <button className="btn btn-primary" onClick={handleProduce} disabled={!canProduce} style={{ width: '100%' }}>
                                <Package size={15} /> Produce anyway
                              </button>
                            </>
                          )
                        }
                        return (
                          <button className="btn btn-primary" onClick={handleProduce} disabled={!canProduce} style={{ width: '100%' }}>
                            <Package size={15} /> Produce
                          </button>
                        )
                      })()}
                      {!canProduce && (
                        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>You do not have permission to produce.</p>
                      )}

                      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
                        {!savingTemplate ? (
                          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setSavingTemplate(true)}>
                            <Bookmark size={14} /> Save this run as a template
                          </button>
                        ) : (
                          <div style={{ display: 'grid', gap: 8 }}>
                            <input
                              className="input"
                              placeholder="Template name (e.g. Morning Batch)"
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                            />
                            <textarea
                              className="input"
                              placeholder="Notes (optional)"
                              value={templateNotes}
                              onChange={(e) => setTemplateNotes(e.target.value)}
                              style={{ height: 56, resize: 'none' }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveTemplate}><Save size={14} /> Save Template</button>
                              <button className="btn btn-ghost" onClick={() => { setSavingTemplate(false); setTemplateName(''); setTemplateNotes('') }}><X size={14} /> Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}

      {confirmProduceId && (() => {
        const template = templates.find((t) => t.id === confirmProduceId)
        if (!template) return null
        const fg = state.products.find((p) => p.id === template.finished_good_id)
        const loc = state.locations.find((l) => l.id === template.location_id)
        return (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Zap size={24} color="#16A34A" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Produce from template?</h3>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
                This will produce <strong>{template.quantity} × {fg?.name ?? 'item'}</strong>
                {loc ? ` at ${loc.name}` : ''} and consume the recipe ingredients.
              </p>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 24 }}>Template: {template.name}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setConfirmProduceId(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmProduceTemplate}><Zap size={15} /> Produce Now</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
