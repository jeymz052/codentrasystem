import { seedDemoSystem, addOrUpdateProduct, recordSale } from './lib/demo-system'
const state = seedDemoSystem('general')
let s = addOrUpdateProduct({ ...state }, { item_code: 'EMPC', name: 'Empanada with cheese', category: 'Ingredients', uom: 'pcs', unit_cost: 10, selling_price: 20, quantity_on_hand: 10, reorder_point: 5, supplier: '', location: '', description: '' })
const p = s.products.find((x) => x.item_code === 'EMPC')!
const lotId = s.inventoryLots.find((l) => l.product_id === p.id)!.id
console.log('original lot id:', lotId)
const res = recordSale(s, { payment_method: 'cash', amount_tendered: 100, location_id: null, notes: 'sale', items: [{ product_id: p.id, quantity: 1, unit_price: 20, unit_cost: 10, discount: 0 }] })
for (const l of res.state.inventoryLots.filter((l) => l.product_id === p.id)) console.log('lot id', l.id, 'qty', l.quantity, 'orig?', l.id === lotId)
