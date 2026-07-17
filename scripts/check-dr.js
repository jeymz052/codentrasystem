const { createClient } = require('@supabase/supabase-js')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tgljhyaczovhxbuziank.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const client = createClient(url, key, { auth: { persistSession: false } })

;(async () => {
  const { data, error } = await client
    .from('deletion_requests')
    .select('id, tenant_id, action, target_type, target_id, status, requested_by, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) { console.error('ERR', error); return }
  console.log('COUNT', data.length)
  for (const r of data) {
    console.log(JSON.stringify({ id: r.id.slice(0,8), tenant: r.tenant_id.slice(0,8), action: r.action, status: r.status, requested_by: (r.requested_by||'').slice(0,8), created: r.created_at }))
  }
})()
