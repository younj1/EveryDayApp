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

  const { recipientId, imageUrl, caption } = await req.json()
  if (!recipientId || !imageUrl) return new Response('Missing fields', { status: 400 })

  const [userA, userB] = [user.id, recipientId].sort()
  const { data: friendship } = await supabase
    .from('friends').select('id').eq('user_a_id', userA).eq('user_b_id', userB).single()
  if (!friendship) return new Response('Not friends', { status: 403 })

  const { data: post, error: postError } = await supabase
    .from('partner_posts')
    .insert({ sender_id: user.id, recipient_id: recipientId, image_url: imageUrl, caption })
    .select().single()
  if (postError || !post) return new Response('Failed to create post', { status: 500 })

  const { data: recipientProfile } = await supabase.from('profiles').select('push_token').eq('id', recipientId).single()
  const { data: senderProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single()

  if (recipientProfile?.push_token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipientProfile.push_token,
        title: `${senderProfile?.name ?? 'Someone'} sent you a photo`,
        body: caption ?? 'Tap to see it',
        data: { type: 'partner_post', postId: post.id, imageUrl, senderId: user.id },
        'content-available': 1,
      }),
    })
  }

  return new Response(JSON.stringify({ success: true, postId: post.id }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
