'use client'

import { useEffect, useMemo, useState } from 'react'
import { Factory, Plus, Save, X, Package, AlertTriangle } from 'lucide-react'
import { useDemoSystem } from '@/components/demo-system-provider'
import { canPerformMutation } from '@/lib/access-control'
import type { Product, ProductRecipe, UnitOfMeasure } from '@/types/database'

export default function ProductionPage() {
  const { state, availableTenants, activeTenantId, createRecipe, updateRecipe, deleteRecipe, produceFinishedGood, notifySuccess, notifyError, formatCurrency } = useDemoSystem()
  const role = availableTenants.find((t) => t.id === (activeTenantId || state.tenant.id))?.role ?? 'admin'
  const canEdit = canPerformMutation(role, 'createRecipe')
  const canProduce = canPerformMutation(role, 'produceFinishedGood')

  const [selectedFinishedGood, setSelectedFinishedGood] = useState<string>('')
  const [recipeForm, setRecipeForm] = useState({ ingredientId: '', quantityPerUnit: '', uomId: '' })
  const [editingRecipe, setEditingRecipe] = useState<ProductRecipe | null>(null)
  const [produceQty, setProduceQty] = useState('')
  const [produceLocation, setProduceLocation] = useState<string>('')

  const finishedGoods = useMemo(() => state.products.filter((p) => p.is_active), [state.products])
  const ingredients = useMemo(() => state.products.filter((p) => p.is_active && p.quantity_on_hand > 0), [state.products])
  const uoms = useMemo(() => state.unitsOfMeasure.filter((u) => u.is_active), [state.unitsOfMeasure])

  const recipesByFinishedGood = useMemo(() => {
    const map = new Map<string, ProductRecipe[]>()
    for (const recipe of state.productRecipes) {
      const list = map.get(recipe.finished_good_id) ?? []
      list.push(recipe)
      map.set(recipe.finished_good_id, list)
    }
    return map
  }, [state.productRecipes])

  const selectedRecipes = useMemo(() => selectedFinishedGood ? (recipesByFinishedGood.get(selectedFinishedGood) ?? []) : [], [selectedFinishedGood, recipesByFinishedGood])

  const selectedProduct = useMemo(() => state.products.find((p) => p.id === selectedFinishedGood), [state.products, selectedFinishedGood])

  useEffect(() => {
    if (!selectedFinishedGood && finishedGoods.length) {
      setSelectedFinishedGood(finishedGoods[0].id)
    }
  }, [finishedGoods, selectedFinishedGood])

  function handleSaveRecipe() {
    if (!selectedFinishedGood || !recipeForm.ingredientId || !recipeForm.quantityPerUnit) return
    const qty = Number(recipeForm.quantityPerUnit)
    if (Number.isNaN(qty) || qty <= 0) {
      notifyError('Quantity per unit must be greater than 0.')
      return
    }

    if (editingRecipe) {
      updateRecipe(editingRecipe.id, qty, recipeForm.uomId || null)
      notifySuccess('Recipe updated successfully.')
      setEditingRecipe(null)
    } else {
      createRecipe(selectedFinishedGood, recipeForm.ingredientId, qty, recipeForm.uomId || null)
      notifySuccess('Ingredient added to recipe.')
    }
    setRecipeForm({ ingredientId: '', quantityPerUnit: '', uomId: '' })
  }

  function handleProduce() {
    if (!selectedFinishedGood || !produceQty) return
    const qty = Number(produceQty)
    if (Number.isNaN(qty) || qty <= 0) {
      notifyError('Produce quantity must be greater than 0.')
      return
    }
    produceFinishedGood(selectedFinishedGood, qty, produceLocation || null)
    notifySuccess(`Produced ${qty} x ${selectedProduct?.name ?? 'item'}.`)
    setProduceQty('')
    setProduceLocation('')
  }

  function handleEditRecipe(recipe: ProductRecipe) {
    setEditingRecipe(recipe)
    setRecipeForm({
      ingredientId: recipe.ingredient_id,
      quantityPerUnit: String(recipe.quantity_per_unit),
      uomId: recipe.uom_id ?? '',
    })
  }

  function handleDeleteRecipe(recipeId: string) {
    deleteRecipe(recipeId)
    notifySuccess('Ingredient removed from recipe.')
    if (editingRecipe?.id === recipeId) {
      setEditingRecipe(null)
      setRecipeForm({ ingredientId: '', quantityPerUnit: '', uomId: '' })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Production</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Manage recipes and produce finished goods from raw materials.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <div className="card" style={{ padding: 18, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Factory size={18} color="#3B82F6" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Finished Goods</h3>
          </div>
          <select
            className="input"
            value={selectedFinishedGood}
            onChange={(e) => {
              setSelectedFinishedGood(e.target.value)
              setEditingRecipe(null)
              setRecipeForm({ ingredientId: '', quantityPerUnit: '', uomId: '' })
            }}
            style={{ width: '100%', marginBottom: 12 }}
          >
            <option value="">Select finished good</option>
            {finishedGoods.map((product) => (
              <option key={product.id} value={product.id}>{product.name} ({product.item_code})</option>
            ))}
          </select>

          {selectedProduct && (
            <div style={{ display: 'grid', gap: 8, marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Current stock</span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{selectedProduct.quantity_on_hand} {selectedProduct.uom?.abbreviation ?? 'pcs'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Selling price</span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{formatCurrency(selectedProduct.selling_price ?? 0)}</span>
              </div>
            </div>
          )}

          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Recipe (BOM)</h4>
          {selectedRecipes.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 12 }}>No ingredients defined yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              {selectedRecipes.map((recipe) => {
                const ingredient = state.products.find((p) => p.id === recipe.ingredient_id)
                const uom = state.unitsOfMeasure.find((u) => u.id === recipe.uom_id)
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
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, marginTop: 4 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{editingRecipe ? 'Edit Ingredient' : 'Add Ingredient'}</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                <select
                  className="input"
                  value={recipeForm.ingredientId}
                  onChange={(e) => setRecipeForm((f) => ({ ...f, ingredientId: e.target.value }))}
                  disabled={!!editingRecipe}
                >
                  <option value="">Select ingredient</option>
                  {ingredients.filter((p) => p.id !== selectedFinishedGood).map((product) => (
                    <option key={product.id} value={product.id}>{product.name} ({product.item_code})</option>
                  ))}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder="Qty per unit"
                    value={recipeForm.quantityPerUnit}
                    onChange={(e) => setRecipeForm((f) => ({ ...f, quantityPerUnit: e.target.value }))}
                  />
                  <select
                    className="input"
                    value={recipeForm.uomId}
                    onChange={(e) => setRecipeForm((f) => ({ ...f, uomId: e.target.value }))}
                  >
                    <option value="">UOM</option>
                    {uoms.map((uom) => (
                      <option key={uom.id} value={uom.id}>{uom.name} ({uom.abbreviation})</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handleSaveRecipe} style={{ width: '100%' }}>
                  {editingRecipe ? <><Save size={15} /> Update Ingredient</> : <><Plus size={15} /> Add Ingredient</>}
                </button>
                {editingRecipe && (
                  <button className="btn btn-ghost" onClick={() => { setEditingRecipe(null); setRecipeForm({ ingredientId: '', quantityPerUnit: '', uomId: '' }) }} style={{ width: '100%' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 18, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Package size={18} color="#10B981" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Produce Finished Goods</h3>
          </div>

          {!selectedFinishedGood ? (
            <p style={{ color: '#94A3B8', fontSize: 13 }}>Select a finished good to start production.</p>
          ) : selectedRecipes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>No recipe defined</div>
                  <div style={{ fontSize: 12, color: '#A16207', marginTop: 2 }}>Add ingredients to the recipe before producing.</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748B', marginBottom: 4, display: 'block' }}>Finished Good</label>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{selectedProduct?.name ?? 'Unknown'}</div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#64748B', marginBottom: 4, display: 'block' }}>Quantity to Produce</label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  min="1"
                  placeholder="Enter quantity"
                  value={produceQty}
                  onChange={(e) => setProduceQty(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#64748B', marginBottom: 4, display: 'block' }}>Production Location (optional)</label>
                <select
                  className="input"
                  value={produceLocation}
                  onChange={(e) => setProduceLocation(e.target.value)}
                >
                  <option value="">Default location</option>
                  {state.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                  ))}
                </select>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F8FBFF', border: '1px solid #E2E8F0', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Ingredients required:</div>
                {selectedRecipes.map((recipe) => {
                  const ingredient = state.products.find((p) => p.id === recipe.ingredient_id)
                  const uom = state.unitsOfMeasure.find((u) => u.id === recipe.uom_id)
                  const totalNeeded = Number((recipe.quantity_per_unit * (produceQty ? Number(produceQty) : 1)).toFixed(4))
                  const hasEnough = ingredient ? ingredient.quantity_on_hand >= totalNeeded : false
                  return (
                    <div key={recipe.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#475569' }}>{ingredient?.name ?? 'Unknown'}</span>
                      <span style={{ color: hasEnough ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                        {totalNeeded} {uom?.abbreviation ?? ''} {!hasEnough && '(insufficient)'}
                      </span>
                    </div>
                  )
                })}
              </div>

              <button className="btn btn-primary" onClick={handleProduce} disabled={!canProduce} style={{ width: '100%' }}>
                <Package size={15} /> Produce
              </button>
              {!canProduce && (
                <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>You do not have permission to produce.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
