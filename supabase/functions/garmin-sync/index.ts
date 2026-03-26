import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js'

const GARMIN_BASE = Deno.env.get('GARMIN_API_BASE_URL') ?? 'https://healthapi.garmin.com'

serve(async (req) => {
  try {
    // JWT auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    const userId = user.id

    // Get stored Garmin OAuth token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('garmin_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single()

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'No Garmin token found. Please connect your Garmin account first.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch daily summary from Garmin Health API
    const now = Math.floor(Date.now() / 1000)
    const yesterday = now - 86400
    const garminRes = await fetch(
      `${GARMIN_BASE}/wellness-api/rest/dailies?uploadStartTimeInSeconds=${yesterday}&uploadEndTimeInSeconds=${now}`,
      { headers: { Authorization: `Bearer ${tokenRow.access_token}` } }
    )

    if (!garminRes.ok) {
      return new Response(JSON.stringify({ error: `Garmin API error: ${garminRes.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const garminData = await garminRes.json()
    const daily = garminData.dailies?.[0]

    if (!daily) {
      return new Response(JSON.stringify({ synced: false, reason: 'No daily data available yet' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const today = new Date().toISOString().split('T')[0]
    const activeMinutes = (daily.moderateIntensityMinutes ?? 0) + (daily.vigorousIntensityMinutes ?? 0)

    const { error: upsertError } = await supabase.from('garmin_syncs').upsert({
      user_id: userId,
      date: today,
      steps: daily.totalSteps ?? 0,
      heart_rate: daily.averageHeartRateInBeatsPerMinute ?? null,
      calories_burned: daily.activeKilocalories ?? 0,
      active_minutes: activeMinutes,
      sleep_hours: daily.sleepingSeconds != null ? daily.sleepingSeconds / 3600 : null,
      stress: daily.averageStressLevel ?? null,
      body_battery: daily.bodyBatteryHighestValue ?? null,
      raw_json: JSON.stringify(daily),
    }, { onConflict: 'user_id,date' })

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ synced: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
