import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js'

const PLAID_BASE = Deno.env.get('PLAID_BASE_URL') ?? 'https://sandbox.plaid.com'

interface PlaidTransaction {
  transaction_id: string
  amount: number
  category?: string[]
  merchant_name?: string
  name: string
  date: string
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    const userId = user.id  // authoritative — do not use body userId

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get stored access token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('plaid_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single()

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'No Plaid token found for user' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch transactions (last 30 days)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const response = await fetch(`${PLAID_BASE}/transactions/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('PLAID_CLIENT_ID'),
        secret: Deno.env.get('PLAID_SECRET'),
        access_token: tokenRow.access_token,
        start_date: startDate,
        end_date: endDate,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const { transactions } = await response.json()

    // Upsert transactions into Supabase
    const rows = (transactions as PlaidTransaction[]).map((t) => ({
      user_id: userId,
      plaid_transaction_id: t.transaction_id,
      type: t.amount > 0 ? 'expense' : 'income',
      amount: Math.abs(t.amount),
      category: t.category?.[0] ?? 'Other',
      merchant: t.merchant_name ?? t.name,
      date: t.date,
      source: 'plaid',
    }))

    await supabase.from('transactions').upsert(rows, { onConflict: 'plaid_transaction_id' })

    return new Response(JSON.stringify({ synced: rows.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
