import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (userError || !user) return new Response('Unauthorized', { status: 401 })

  const { requestId } = await req.json()
  if (!requestId) return new Response('Missing requestId', { status: 400 })

  const { data: request, error: fetchError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .eq('recipient_id', user.id)
    .eq('status', 'pending')
    .single()
  if (fetchError || !request) return new Response('Request not found', { status: 404 })

  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
  if (updateError) return new Response('Failed to update request', { status: 500 })

  const [userA, userB] = [request.sender_id, request.recipient_id].sort()
  const { error: friendError } = await supabase
    .from('friends')
    .insert({ user_a_id: userA, user_b_id: userB })
  if (friendError) return new Response('Failed to create friendship', { status: 500 })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
