import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js'

const PLAID_BASE = 'https://sandbox.plaid.com'

serve(async (req) => {
  try {
    const { userId } = await req.json()

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
    const rows = transactions.map((t: Record<string, unknown>) => ({
      user_id: userId,
      plaid_transaction_id: t.transaction_id,
      type: (t.amount as number) > 0 ? 'expense' : 'income',
      amount: Math.abs(t.amount as number),
      category: (t.category as string[])?.[0] ?? 'Other',
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
