import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const PLAID_BASE = 'https://sandbox.plaid.com' // change to production.plaid.com when ready

serve(async (req) => {
  try {
    const { userId } = await req.json()

    const response = await fetch(`${PLAID_BASE}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('PLAID_CLIENT_ID'),
        secret: Deno.env.get('PLAID_SECRET'),
        client_name: 'EveryDayApp',
        user: { client_user_id: userId },
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const data = await response.json()
    return new Response(JSON.stringify({ link_token: data.link_token }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
