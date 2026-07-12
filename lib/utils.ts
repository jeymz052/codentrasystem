export const formatCurrency = (v: number, currency = 'PHP') =>
  new Intl.NumberFormat('en-PH', { style:'currency', currency, minimumFractionDigits:2 }).format(v)
export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric', timeZone: 'Asia/Manila' })
export const formatTimestamp = (d: string | Date) => {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}
export const stockStatus = (qty: number, reorder: number) =>
  qty === 0 ? 'out' : qty <= reorder ? 'low' : 'ok'
export const stockColor = (s: string) =>
  s === 'out' ? '#EF4444' : s === 'low' ? '#F59E0B' : '#10B981'
