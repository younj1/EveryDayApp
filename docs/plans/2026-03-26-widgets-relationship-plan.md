# Widgets & Relationship Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add home screen widgets for all app features and a friend/partner system where users can send photos to up to 5 friends that appear on a Partner widget.

**Architecture:** Android widgets via `react-native-android-widget`; iOS widgets via a custom EAS config plugin adding a WidgetKit Swift extension. Widget data written to shared storage (App Group on iOS, SharedPreferences on Android) by `lib/widgetSync.ts` on app foreground. Friend/partner system backed by Supabase with RLS, images in Supabase Storage, push notifications via `expo-notifications`.

**Tech Stack:** React Native, Expo SDK 55, TypeScript, Zustand, Supabase JS v2, `react-native-android-widget`, `react-native-shared-group-preferences`, SwiftUI WidgetKit (via EAS config plugin), `expo-notifications`, `expo-image-picker`

---

## Phase 1: Database & Backend

### Task 1: Supabase Migration — Friends & Partner Posts

**Files:**
- Create: `supabase/migrations/20260326000001_friends.sql`

**Step 1: Write the migration**

```sql
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique(sender_id, recipient_id)
);
alter table public.friend_requests enable row level security;
create policy "Users can see their own requests" on public.friend_requests for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send friend requests" on public.friend_requests for insert with check (auth.uid() = sender_id);
create policy "Recipient can update status" on public.friend_requests for update using (auth.uid() = recipient_id);

create table public.friends (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_a_id, user_b_id),
  check (user_a_id < user_b_id)
);
alter table public.friends enable row level security;
create policy "Users can see their own friendships" on public.friends for select using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create table public.partner_posts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
alter table public.partner_posts enable row level security;
create policy "Sender and recipient can see posts" on public.partner_posts for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send posts" on public.partner_posts for insert with check (auth.uid() = sender_id);
create policy "Recipient can mark seen" on public.partner_posts for update using (auth.uid() = recipient_id);

alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists push_token text;
create index if not exists profiles_username_idx on public.profiles(username);
```

**Step 2: Apply migration**

```bash
supabase db push
```

Expected: Migration applied, tables visible in Supabase dashboard.

**Step 3: Create Supabase Storage bucket**

In Supabase dashboard → Storage → New bucket: `partner-images`, Public: false. Then in SQL editor:

```sql
create policy "Users can upload partner images" on storage.objects for insert with check (bucket_id = 'partner-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Sender and recipient can view partner images" on storage.objects for select using (bucket_id = 'partner-images');
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260326000001_friends.sql
git commit -m "feat: add friends and partner_posts migration"
```

---

### Task 2: Edge Function — accept-friend-request

**Files:**
- Create: `supabase/functions/accept-friend-request/index.ts`

**Step 1: Write the function**

```typescript
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
```

**Step 2: Deploy**

```bash
supabase functions deploy accept-friend-request
```

**Step 3: Commit**

```bash
git add supabase/functions/accept-friend-request/
git commit -m "feat: add accept-friend-request edge function"
```

---

### Task 3: Edge Function — send-partner-post

**Files:**
- Create: `supabase/functions/send-partner-post/index.ts`

**Step 1: Write the function**

```typescript
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
```

**Step 2: Deploy**

```bash
supabase functions deploy send-partner-post
```

**Step 3: Commit**

```bash
git add supabase/functions/send-partner-post/
git commit -m "feat: add send-partner-post edge function"
```

---

## Phase 2: Friend Store

### Task 4: Zustand friendStore

**Files:**
- Create: `stores/friendStore.ts`
- Create: `stores/__tests__/friendStore.test.ts`

**Step 1: Write the failing test**

```typescript
// stores/__tests__/friendStore.test.ts
import { useFriendStore } from '../friendStore'

describe('friendStore', () => {
  beforeEach(() => {
    useFriendStore.setState({ friends: [], pendingRequests: [], partnerPosts: [] })
  })

  it('sets pending requests', () => {
    const req = { id: '1', senderId: 'a', recipientId: 'b', status: 'pending' as const, createdAt: new Date().toISOString() }
    useFriendStore.getState().setPendingRequests([req])
    expect(useFriendStore.getState().pendingRequests).toHaveLength(1)
  })

  it('adds a partner post', () => {
    useFriendStore.getState().addPartnerPost({ id: '1', senderId: 'a', recipientId: 'b', imageUrl: 'https://x.com/img.jpg', caption: 'hi', createdAt: new Date().toISOString(), seenAt: null })
    expect(useFriendStore.getState().partnerPosts).toHaveLength(1)
  })

  it('getLatestPostFromFriend returns most recent', () => {
    const { addPartnerPost, getLatestPostFromFriend } = useFriendStore.getState()
    addPartnerPost({ id: '1', senderId: 'f1', recipientId: 'me', imageUrl: 'url1', caption: null, createdAt: '2026-01-01T10:00:00Z', seenAt: null })
    addPartnerPost({ id: '2', senderId: 'f1', recipientId: 'me', imageUrl: 'url2', caption: null, createdAt: '2026-01-02T10:00:00Z', seenAt: null })
    expect(getLatestPostFromFriend('f1')?.id).toBe('2')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest stores/__tests__/friendStore.test.ts --no-coverage
```

Expected: FAIL — module not found.

**Step 3: Implement the store**

```typescript
// stores/friendStore.ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface FriendRequest {
  id: string
  senderId: string
  recipientId: string
  senderName?: string
  senderAvatarUrl?: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export interface Friend {
  id: string
  userId: string
  name: string
  avatarUrl?: string
  createdAt: string
}

export interface PartnerPost {
  id: string
  senderId: string
  recipientId: string
  imageUrl: string
  caption: string | null
  senderName?: string
  senderAvatarUrl?: string
  createdAt: string
  seenAt: string | null
}

interface FriendState {
  friends: Friend[]
  pendingRequests: FriendRequest[]
  partnerPosts: PartnerPost[]
  isLoading: boolean
  error: string | null
  setFriends: (friends: Friend[]) => void
  setPendingRequests: (requests: FriendRequest[]) => void
  addPartnerPost: (post: PartnerPost) => void
  markPostSeen: (postId: string) => void
  getLatestPostFromFriend: (senderId: string) => PartnerPost | undefined
  getUnseenCount: () => number
  loadFriends: () => Promise<void>
  loadPendingRequests: () => Promise<void>
  loadPartnerPosts: () => Promise<void>
  sendFriendRequest: (emailOrUsername: string) => Promise<void>
  acceptRequest: (requestId: string) => Promise<void>
  declineRequest: (requestId: string) => Promise<void>
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  pendingRequests: [],
  partnerPosts: [],
  isLoading: false,
  error: null,

  setFriends: (friends) => set({ friends }),
  setPendingRequests: (requests) => set({ pendingRequests: requests }),

  addPartnerPost: (post) =>
    set((state) => ({ partnerPosts: [post, ...state.partnerPosts] })),

  markPostSeen: (postId) => {
    set((state) => ({
      partnerPosts: state.partnerPosts.map((p) =>
        p.id === postId ? { ...p, seenAt: new Date().toISOString() } : p
      ),
    }))
    supabase.from('partner_posts').update({ seen_at: new Date().toISOString() }).eq('id', postId)
  },

  getLatestPostFromFriend: (senderId) => {
    const posts = get().partnerPosts.filter((p) => p.senderId === senderId)
    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  },

  getUnseenCount: () => get().partnerPosts.filter((p) => !p.seenAt).length,

  loadFriends: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('friends')
      .select('id, created_at, user_a_id, user_b_id, profiles!friends_user_a_id_fkey(id, name, avatar_url), profiles!friends_user_b_id_fkey(id, name, avatar_url)')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    if (!data) return
    const friends: Friend[] = data.map((row: any) => {
      const other = row.user_a_id === user.id
        ? row['profiles!friends_user_b_id_fkey']
        : row['profiles!friends_user_a_id_fkey']
      return { id: row.id, userId: other.id, name: other.name, avatarUrl: other.avatar_url, createdAt: row.created_at }
    })
    set({ friends })
  },

  loadPendingRequests: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('friend_requests')
      .select('id, sender_id, recipient_id, status, created_at, profiles!friend_requests_sender_id_fkey(name, avatar_url)')
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
    if (!data) return
    set({
      pendingRequests: data.map((row: any) => ({
        id: row.id, senderId: row.sender_id, recipientId: row.recipient_id,
        senderName: row.profiles?.name, senderAvatarUrl: row.profiles?.avatar_url,
        status: row.status, createdAt: row.created_at,
      })),
    })
  },

  loadPartnerPosts: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('partner_posts')
      .select('id, sender_id, recipient_id, image_url, caption, created_at, seen_at, profiles!partner_posts_sender_id_fkey(name, avatar_url)')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!data) return
    set({
      partnerPosts: data.map((row: any) => ({
        id: row.id, senderId: row.sender_id, recipientId: row.recipient_id,
        imageUrl: row.image_url, caption: row.caption,
        senderName: row.profiles?.name, senderAvatarUrl: row.profiles?.avatar_url,
        createdAt: row.created_at, seenAt: row.seen_at,
      })),
    })
  },

  sendFriendRequest: async (emailOrUsername) => {
    set({ isLoading: true, error: null })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ isLoading: false, error: 'Not signed in' }); return }
    if (get().friends.length >= 5) { set({ isLoading: false, error: 'Friend limit is 5' }); return }

    const { data: recipient } = await supabase
      .from('profiles').select('id')
      .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
      .single()
    if (!recipient) { set({ isLoading: false, error: 'User not found' }); return }
    if (recipient.id === user.id) { set({ isLoading: false, error: "Can't add yourself" }); return }

    const { error } = await supabase
      .from('friend_requests').insert({ sender_id: user.id, recipient_id: recipient.id })
    set({ isLoading: false, error: error?.message ?? null })
  },

  acceptRequest: async (requestId) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/accept-friend-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ requestId }),
    })
    set((state) => ({ pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId) }))
    get().loadFriends()
  },

  declineRequest: async (requestId) => {
    await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', requestId)
    set((state) => ({ pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId) }))
  },
}))
```

**Step 4: Run tests**

```bash
npx jest stores/__tests__/friendStore.test.ts --no-coverage
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add stores/friendStore.ts stores/__tests__/friendStore.test.ts
git commit -m "feat: add friendStore with friend requests and partner posts"
```

---

## Phase 3: Friend System UI

### Task 5: Add Friend Screen

**Files:**
- Create: `app/add-friend.tsx`

**Step 1: Write the screen**

```typescript
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useFriendStore } from '@/stores/friendStore'
import { ChevronLeft } from 'lucide-react-native'

export default function AddFriendScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sent, setSent] = useState(false)
  const { sendFriendRequest, isLoading, error } = useFriendStore()

  const handleSend = async () => {
    if (!query.trim()) return
    await sendFriendRequest(query.trim())
    if (!useFriendStore.getState().error) setSent(true)
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-6">
          <ChevronLeft size={20} color="#6b7280" />
          <Text className="text-gray-500 ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900 mb-2">Add Friend</Text>
        <Text className="text-gray-500 mb-6">Search by username or email</Text>
        {sent ? (
          <View className="bg-green-50 rounded-2xl p-6 items-center">
            <Text className="text-green-700 font-semibold text-lg">Request sent!</Text>
            <TouchableOpacity onPress={() => router.back()} className="mt-4">
              <Text className="text-indigo-600 font-medium">Go back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-3"
              placeholder="username or email"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {error ? <Text className="text-red-500 text-sm mb-3">{error}</Text> : null}
            <TouchableOpacity
              onPress={handleSend}
              disabled={isLoading || !query.trim()}
              className="bg-indigo-600 rounded-xl py-3 items-center"
            >
              {isLoading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-semibold">Send Request</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
```

**Step 2: Commit**

```bash
git add app/add-friend.tsx
git commit -m "feat: add add-friend screen"
```

---

### Task 6: Friends List Screen

**Files:**
- Create: `app/friends.tsx`

**Step 1: Write the screen**

```typescript
import { View, Text, ScrollView, TouchableOpacity, Image, useEffect } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { useFriendStore } from '@/stores/friendStore'
import { ChevronLeft, UserPlus, Check, X } from 'lucide-react-native'

export default function FriendsScreen() {
  const router = useRouter()
  const { friends, pendingRequests, loadFriends, loadPendingRequests, acceptRequest, declineRequest } = useFriendStore()

  useEffect(() => {
    loadFriends()
    loadPendingRequests()
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-6">
          <ChevronLeft size={20} color="#6b7280" />
          <Text className="text-gray-500 ml-1">Back</Text>
        </TouchableOpacity>
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900">Friends</Text>
          {friends.length < 5 && (
            <TouchableOpacity onPress={() => router.push('/add-friend')} className="flex-row items-center bg-indigo-600 rounded-xl px-3 py-2">
              <UserPlus size={16} color="white" />
              <Text className="text-white font-medium ml-1">Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {pendingRequests.length > 0 && (
          <View className="bg-white rounded-2xl mb-4 overflow-hidden">
            <Text className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Requests ({pendingRequests.length})</Text>
            {pendingRequests.map((req) => (
              <View key={req.id} className="flex-row items-center px-4 py-3 border-t border-gray-100">
                <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-indigo-600 font-bold">{req.senderName?.[0] ?? '?'}</Text>
                </View>
                <Text className="flex-1 font-medium text-gray-800">{req.senderName ?? 'Someone'}</Text>
                <TouchableOpacity onPress={() => acceptRequest(req.id)} className="bg-green-100 rounded-full p-2 mr-2">
                  <Check size={16} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => declineRequest(req.id)} className="bg-red-100 rounded-full p-2">
                  <X size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View className="bg-white rounded-2xl overflow-hidden">
          <Text className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Friends ({friends.length}/5)</Text>
          {friends.length === 0 ? (
            <View className="px-4 py-6 items-center">
              <Text className="text-gray-400 text-sm">No friends yet. Add someone!</Text>
            </View>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} className="flex-row items-center px-4 py-3 border-t border-gray-100">
                <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-indigo-600 font-bold">{friend.name[0]}</Text>
                </View>
                <Text className="flex-1 font-medium text-gray-800">{friend.name}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

**Step 2: Commit**

```bash
git add app/friends.tsx
git commit -m "feat: add friends list screen"
```

---

### Task 7: Wire Friends into Settings + Me Tab Badge

**Files:**
- Create: `components/friends/FriendRequestBadge.tsx`
- Modify: `app/settings.tsx`
- Modify: `app/(tabs)/me.tsx`

**Step 1: Create FriendRequestBadge**

```typescript
// components/friends/FriendRequestBadge.tsx
import { View, Text } from 'react-native'
import { useFriendStore } from '@/stores/friendStore'

export function FriendRequestBadge() {
  const { pendingRequests } = useFriendStore()
  if (pendingRequests.length === 0) return null
  return (
    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
      <Text className="text-white text-xs font-bold">{pendingRequests.length}</Text>
    </View>
  )
}
```

**Step 2: Add Friends row to settings.tsx**

Add to imports:
```typescript
import { useRouter } from 'expo-router'
import { Users } from 'lucide-react-native'
```

Add after the Connected Services section:
```typescript
<View className="bg-white rounded-2xl mb-4 overflow-hidden">
  <Text className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Friends</Text>
  <TouchableOpacity onPress={() => router.push('/friends')} className="flex-row items-center px-4 py-3">
    <Users size={18} color="#6366f1" />
    <Text className="font-medium text-gray-800 ml-3 flex-1">Manage Friends</Text>
    <Text className="text-gray-400">›</Text>
  </TouchableOpacity>
</View>
```

**Step 3: Add badge + load requests in me.tsx**

Add to imports:
```typescript
import { FriendRequestBadge } from '@/components/friends/FriendRequestBadge'
import { useFriendStore } from '@/stores/friendStore'
```

Add inside component after existing hooks:
```typescript
const { loadPendingRequests } = useFriendStore()
useEffect(() => { loadPendingRequests() }, [])
```

Wrap the existing settings gear icon:
```typescript
<View className="relative">
  <TouchableOpacity onPress={() => router.push('/settings')}>
    <Settings size={22} color="#6b7280" />
  </TouchableOpacity>
  <FriendRequestBadge />
</View>
```

**Step 4: Commit**

```bash
git add components/friends/FriendRequestBadge.tsx app/settings.tsx app/(tabs)/me.tsx
git commit -m "feat: wire friends into settings and Me tab badge"
```

---

## Phase 4: Partner Post Feature

### Task 8: Send Partner Image Modal + Me Tab FAB

**Files:**
- Create: `components/friends/SendPartnerImageModal.tsx`
- Modify: `app/(tabs)/me.tsx`

**Step 1: Write the modal**

```typescript
// components/friends/SendPartnerImageModal.tsx
import { View, Text, Modal, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { X, Image as ImageIcon, Send } from 'lucide-react-native'
import { useFriendStore, Friend } from '@/stores/friendStore'
import { supabase } from '@/lib/supabase'

interface Props { visible: boolean; onClose: () => void }

function decode(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function SendPartnerImageModal({ visible, onClose }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [sending, setSending] = useState(false)
  const { friends } = useFriendStore()

  const handleClose = () => {
    setImageUri(null)
    setCaption('')
    setSelectedFriend(null)
    onClose()
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
    if (!result.canceled) setImageUri(result.assets[0].uri)
  }

  const handleSend = async () => {
    if (!imageUri || !selectedFriend) return
    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const fileName = `${user.id}/${Date.now()}.jpg`
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' })
      const { error: uploadError } = await supabase.storage
        .from('partner-images')
        .upload(fileName, decode(base64), { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('partner-images').getPublicUrl(fileName)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-partner-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ recipientId: selectedFriend.userId, imageUrl: publicUrl, caption: caption.trim() || null }),
      })
      if (!res.ok) throw new Error('Failed to send')
      handleClose()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-gray-50">
        <View className="flex-row justify-between items-center px-4 pt-6 pb-4 bg-white border-b border-gray-100">
          <Text className="text-lg font-bold text-gray-900">Send Photo</Text>
          <TouchableOpacity onPress={handleClose}><X size={22} color="#6b7280" /></TouchableOpacity>
        </View>
        <ScrollView className="flex-1 px-4 pt-4">
          <TouchableOpacity onPress={pickImage} className="bg-white rounded-2xl h-48 items-center justify-center mb-4 border-2 border-dashed border-gray-200 overflow-hidden">
            {imageUri
              ? <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
              : <View className="items-center"><ImageIcon size={32} color="#9ca3af" /><Text className="text-gray-400 mt-2">Tap to pick a photo</Text></View>}
          </TouchableOpacity>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 mb-4 border border-gray-200"
            placeholder="Add a caption..."
            value={caption}
            onChangeText={setCaption}
            maxLength={120}
          />
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Send to</Text>
          {friends.length === 0
            ? <Text className="text-gray-400 text-sm mb-4">Add friends first in Settings.</Text>
            : (
              <View className="bg-white rounded-2xl overflow-hidden mb-4">
                {friends.map((friend) => (
                  <TouchableOpacity key={friend.id} onPress={() => setSelectedFriend(friend)}
                    className={`flex-row items-center px-4 py-3 border-b border-gray-100 ${selectedFriend?.id === friend.id ? 'bg-indigo-50' : ''}`}>
                    <View className="w-8 h-8 bg-indigo-100 rounded-full items-center justify-center mr-3">
                      <Text className="text-indigo-600 font-bold">{friend.name[0]}</Text>
                    </View>
                    <Text className="flex-1 font-medium text-gray-800">{friend.name}</Text>
                    {selectedFriend?.id === friend.id && (
                      <View className="w-5 h-5 bg-indigo-600 rounded-full items-center justify-center">
                        <Text className="text-white text-xs">✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
        </ScrollView>
        <View className="px-4 pb-8">
          <TouchableOpacity onPress={handleSend} disabled={!imageUri || !selectedFriend || sending}
            className="bg-indigo-600 rounded-xl py-4 items-center flex-row justify-center disabled:opacity-50">
            {sending ? <ActivityIndicator color="white" /> : <><Send size={18} color="white" /><Text className="text-white font-semibold ml-2">Send Photo</Text></>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
```

**Step 2: Add FAB and modal to me.tsx**

Add to imports:
```typescript
import { SendPartnerImageModal } from '@/components/friends/SendPartnerImageModal'
import { Heart } from 'lucide-react-native'
```

Add state:
```typescript
const [showSendPhoto, setShowSendPhoto] = useState(false)
```

Add before closing `</SafeAreaView>`:
```typescript
<TouchableOpacity
  onPress={() => setShowSendPhoto(true)}
  className="absolute bottom-6 right-4 bg-pink-500 rounded-full w-14 h-14 items-center justify-center shadow-lg"
>
  <Heart size={24} color="white" fill="white" />
</TouchableOpacity>
<SendPartnerImageModal visible={showSendPhoto} onClose={() => setShowSendPhoto(false)} />
```

**Step 3: Commit**

```bash
git add components/friends/SendPartnerImageModal.tsx app/(tabs)/me.tsx
git commit -m "feat: add send partner image modal and Me tab FAB"
```

---

### Task 9: Partner Post Screen + Notification Deep Link

**Files:**
- Create: `app/partner-post.tsx`
- Modify: `app/_layout.tsx`

**Step 1: Write the screen**

```typescript
// app/partner-post.tsx
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useFriendStore, PartnerPost } from '@/stores/friendStore'
import { ChevronLeft } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'

export default function PartnerPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>()
  const router = useRouter()
  const { markPostSeen } = useFriendStore()
  const [post, setPost] = useState<PartnerPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('partner_posts')
        .select('id, sender_id, recipient_id, image_url, caption, created_at, seen_at, profiles!partner_posts_sender_id_fkey(name, avatar_url)')
        .eq('id', postId)
        .single()
      if (data) {
        const p: PartnerPost = {
          id: data.id, senderId: data.sender_id, recipientId: data.recipient_id,
          imageUrl: data.image_url, caption: data.caption,
          senderName: (data as any).profiles?.name,
          senderAvatarUrl: (data as any).profiles?.avatar_url,
          createdAt: data.created_at, seenAt: data.seen_at,
        }
        setPost(p)
        if (!data.seen_at) markPostSeen(data.id)
      }
      setLoading(false)
    }
    if (postId) load()
  }, [postId])

  if (loading) return <SafeAreaView className="flex-1 bg-black items-center justify-center"><ActivityIndicator color="white" /></SafeAreaView>
  if (!post) return <SafeAreaView className="flex-1 bg-black items-center justify-center"><Text className="text-white">Post not found</Text></SafeAreaView>

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
        <View className="w-8 h-8 bg-indigo-400 rounded-full items-center justify-center mr-2">
          <Text className="text-white font-bold text-sm">{post.senderName?.[0] ?? '?'}</Text>
        </View>
        <View>
          <Text className="text-white font-semibold">{post.senderName ?? 'Friend'}</Text>
          <Text className="text-gray-400 text-xs">{new Date(post.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      <Image source={{ uri: post.imageUrl }} className="w-full flex-1" resizeMode="contain" />
      {post.caption ? <View className="px-4 py-4"><Text className="text-white text-base">{post.caption}</Text></View> : null}
    </SafeAreaView>
  )
}
```

**Step 2: Add notification response handler to _layout.tsx**

Add to imports:
```typescript
import * as Notifications from 'expo-notifications'
import { useRef } from 'react'
```

Add inside root layout component:
```typescript
const responseListener = useRef<Notifications.EventSubscription>()
useEffect(() => {
  responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as any
    if (data?.type === 'partner_post' && data?.postId) {
      router.push(`/partner-post?postId=${data.postId}`)
    }
  })
  return () => responseListener.current?.remove()
}, [])
```

**Step 3: Commit**

```bash
git add app/partner-post.tsx app/_layout.tsx
git commit -m "feat: add partner post screen and notification deep link"
```

---

## Phase 5: Widget Data Layer

### Task 10: Install Widget Dependencies

**Step 1: Install packages**

```bash
npm install react-native-android-widget react-native-shared-group-preferences --legacy-peer-deps
```

**Step 2: Add App Group entitlement to app.json**

In `app.json` under `expo.ios.entitlements`, add:

```json
"com.apple.security.application-groups": ["group.com.yourname.everydayapp"]
```

Replace `com.yourname.everydayapp` with your actual bundle ID.

**Step 3: Commit**

```bash
git add app.json package.json package-lock.json
git commit -m "feat: install widget dependencies and configure App Group"
```

---

### Task 11: lib/widgetSync.ts

**Files:**
- Create: `lib/widgetSync.ts`
- Create: `lib/__tests__/widgetSync.test.ts`

**Step 1: Write the failing test**

```typescript
// lib/__tests__/widgetSync.test.ts
import { buildWidgetPayload } from '../widgetSync'

describe('buildWidgetPayload', () => {
  it('builds fitness payload', () => {
    const p = buildWidgetPayload('fitness', { steps: 8432, caloriesBurned: 412, activeMinutes: 38 })
    expect(p.type).toBe('fitness')
    expect(p.data.steps).toBe(8432)
  })

  it('builds nutrition payload', () => {
    const p = buildWidgetPayload('nutrition', { caloriesConsumed: 1400, caloriesGoal: 2000, waterMl: 1200, waterGoalMl: 2000 })
    expect(p.type).toBe('nutrition')
    expect(p.data.caloriesConsumed).toBe(1400)
  })

  it('includes updatedAt timestamp', () => {
    const p = buildWidgetPayload('fitness', { steps: 0, caloriesBurned: 0, activeMinutes: 0 })
    expect(typeof p.updatedAt).toBe('string')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/widgetSync.test.ts --no-coverage
```

Expected: FAIL — module not found.

**Step 3: Implement widgetSync.ts**

```typescript
// lib/widgetSync.ts
import { Platform } from 'react-native'

export type WidgetType = 'fitness' | 'nutrition' | 'finance' | 'habits' | 'mood' | 'partner'

export interface WidgetPayload {
  type: WidgetType
  data: Record<string, unknown>
  updatedAt: string
}

export function buildWidgetPayload(type: WidgetType, data: Record<string, unknown>): WidgetPayload {
  return { type, data, updatedAt: new Date().toISOString() }
}

export let latestWidgetData: WidgetPayload[] = []

export async function writeWidgetData(payloads: WidgetPayload[]): Promise<void> {
  latestWidgetData = payloads
  if (Platform.OS === 'ios') {
    try {
      const SharedGroupPreferences = require('react-native-shared-group-preferences').default
      const APP_GROUP = 'group.com.yourname.everydayapp' // replace with your bundle ID
      await SharedGroupPreferences.setItem('widgetData', JSON.stringify(payloads), APP_GROUP)
    } catch {
      // silently fail — widget shows stale data
    }
  }
}
```

**Step 4: Run tests**

```bash
npx jest lib/__tests__/widgetSync.test.ts --no-coverage
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add lib/widgetSync.ts lib/__tests__/widgetSync.test.ts
git commit -m "feat: add widgetSync data layer"
```

---

### Task 12: Hook widgetSync into App Lifecycle

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Add AppState listener**

Add to imports in `app/_layout.tsx`:
```typescript
import { AppState } from 'react-native'
import { writeWidgetData, buildWidgetPayload } from '@/lib/widgetSync'
import { useFitnessStore } from '@/stores/fitnessStore'
import { useNutritionStore } from '@/stores/nutritionStore'
import { useFinanceStore } from '@/stores/financeStore'
import { useHabitStore } from '@/stores/habitStore'
import { useMoodStore } from '@/stores/moodStore'
import { useFriendStore } from '@/stores/friendStore'
```

Add inside root layout component:
```typescript
useEffect(() => {
  const syncWidgets = () => {
    const today = new Date().toISOString().split('T')[0]
    const { todayStats } = useFitnessStore.getState()
    const nutrition = useNutritionStore.getState()
    const { transactions } = useFinanceStore.getState()
    const { habits, logs } = useHabitStore.getState()
    const { getTodayMood } = useMoodStore.getState()
    const { partnerPosts } = useFriendStore.getState()

    const todaySpend = transactions
      .filter((t) => t.date === today && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    const completedHabits = habits.filter((h) => logs.some((l) => l.habitId === h.id && l.date === today)).length
    const latestPost = partnerPosts[0]

    writeWidgetData([
      buildWidgetPayload('fitness', { steps: todayStats.steps, caloriesBurned: todayStats.caloriesBurned, activeMinutes: todayStats.activeMinutes }),
      buildWidgetPayload('nutrition', { caloriesConsumed: nutrition.getTotalCalories(today), caloriesGoal: nutrition.goals.dailyCalories, waterMl: nutrition.getTotalWater(today), waterGoalMl: nutrition.goals.dailyWaterMl }),
      buildWidgetPayload('finance', { netSpend: todaySpend, budgetStatus: 'green' }),
      buildWidgetPayload('habits', { activeCount: habits.length, completedCount: completedHabits }),
      buildWidgetPayload('mood', { emoji: getTodayMood()?.mood?.toString() ?? null }),
      buildWidgetPayload('partner', { imageUrl: latestPost?.imageUrl ?? null, caption: latestPost?.caption ?? null, senderName: latestPost?.senderName ?? null, createdAt: latestPost?.createdAt ?? null }),
    ])
  }

  syncWidgets()
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') syncWidgets()
  })
  return () => sub.remove()
}, [])
```

**Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: sync widget data on app foreground"
```

---

## Phase 6: Android Widgets

### Task 13: Android Widget Components + Registration

**Files:**
- Create: `widgets/FitnessWidget.tsx`
- Create: `widgets/NutritionWidget.tsx`
- Create: `widgets/FinanceWidget.tsx`
- Create: `widgets/HabitsWidget.tsx`
- Create: `widgets/MoodWidget.tsx`
- Create: `widgets/PartnerWidget.tsx`
- Create: `widgets/widgetTaskHandler.ts`
- Modify: `app.json`

**Step 1: Write widget components**

```typescript
// widgets/FitnessWidget.tsx
import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function FitnessWidget() {
  const d = latestWidgetData.find((p) => p.type === 'fitness')?.data ?? {}
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Fitness" style={{ fontSize: 11, color: '#6366f1', fontWeight: '600' }} />
      <TextWidget text={`${(d.steps as number ?? 0).toLocaleString()}`} style={{ fontSize: 28, color: '#1e1b4b', fontWeight: '700', marginTop: 4 }} />
      <TextWidget text="steps" style={{ fontSize: 11, color: '#6b7280' }} />
      <TextWidget text={`${d.caloriesBurned ?? 0} cal burned`} style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }} />
    </FlexWidget>
  )
}
```

```typescript
// widgets/NutritionWidget.tsx
import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function NutritionWidget() {
  const d = latestWidgetData.find((p) => p.type === 'nutrition')?.data ?? {}
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Nutrition" style={{ fontSize: 11, color: '#16a34a', fontWeight: '600' }} />
      <TextWidget text={`${d.caloriesConsumed ?? 0} / ${d.caloriesGoal ?? 2000}`} style={{ fontSize: 20, color: '#14532d', fontWeight: '700', marginTop: 4 }} />
      <TextWidget text="kcal" style={{ fontSize: 11, color: '#6b7280' }} />
      <TextWidget text={`💧 ${d.waterMl ?? 0}ml / ${d.waterGoalMl ?? 2000}ml`} style={{ fontSize: 11, color: '#0369a1', marginTop: 4 }} />
    </FlexWidget>
  )
}
```

```typescript
// widgets/FinanceWidget.tsx
import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function FinanceWidget() {
  const d = latestWidgetData.find((p) => p.type === 'finance')?.data ?? {}
  const spend = d.netSpend as number ?? 0
  const status = d.budgetStatus as string ?? 'green'
  const dot = status === 'red' ? '🔴' : status === 'yellow' ? '🟡' : '🟢'
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#fefce8', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Finance" style={{ fontSize: 11, color: '#ca8a04', fontWeight: '600' }} />
      <TextWidget text={`$${spend.toFixed(2)}`} style={{ fontSize: 24, color: '#713f12', fontWeight: '700', marginTop: 4 }} />
      <TextWidget text="spent today" style={{ fontSize: 11, color: '#6b7280' }} />
      <TextWidget text={dot} style={{ fontSize: 14, marginTop: 4 }} />
    </FlexWidget>
  )
}
```

```typescript
// widgets/HabitsWidget.tsx
import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function HabitsWidget() {
  const d = latestWidgetData.find((p) => p.type === 'habits')?.data ?? {}
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#fdf4ff', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Habits" style={{ fontSize: 11, color: '#9333ea', fontWeight: '600' }} />
      <TextWidget text={`${d.completedCount ?? 0}/${d.activeCount ?? 0}`} style={{ fontSize: 28, color: '#581c87', fontWeight: '700', marginTop: 4 }} />
      <TextWidget text="done today" style={{ fontSize: 11, color: '#6b7280' }} />
    </FlexWidget>
  )
}
```

```typescript
// widgets/MoodWidget.tsx
import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

const MOOD_MAP: Record<string, string> = { '1': '😞', '2': '😕', '3': '😐', '4': '🙂', '5': '😄' }

export function MoodWidget() {
  const d = latestWidgetData.find((p) => p.type === 'mood')?.data ?? {}
  const emoji = d.emoji ? MOOD_MAP[d.emoji as string] : null
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <TextWidget text="Mood" style={{ fontSize: 11, color: '#ea580c', fontWeight: '600' }} />
      {emoji
        ? <TextWidget text={emoji} style={{ fontSize: 36, marginTop: 4 }} />
        : <TextWidget text="Tap to log" style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }} />}
    </FlexWidget>
  )
}
```

```typescript
// widgets/PartnerWidget.tsx
import React from 'react'
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget'
import { latestWidgetData } from '@/lib/widgetSync'

export function PartnerWidget() {
  const d = latestWidgetData.find((p) => p.type === 'partner')?.data ?? {}
  const imageUrl = d.imageUrl as string | null
  const caption = d.caption as string | null
  const senderName = d.senderName as string | null

  if (!imageUrl) {
    return (
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#fff1f2', justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget text="💕" style={{ fontSize: 32 }} />
        <TextWidget text="No photos yet" style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }} />
      </FlexWidget>
    )
  }

  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: '#000', overflow: 'hidden' }}>
      <ImageWidget image={{ uri: imageUrl }} imageWidth={160} imageHeight={160} style={{ width: 'match_parent', height: 'match_parent' }} />
      <FlexWidget style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8 }}>
        {senderName ? <TextWidget text={senderName} style={{ fontSize: 11, color: '#fff', fontWeight: '600' }} /> : null}
        {caption ? <TextWidget text={caption} style={{ fontSize: 11, color: '#e5e7eb' }} /> : null}
      </FlexWidget>
    </FlexWidget>
  )
}
```

**Step 2: Write the task handler**

```typescript
// widgets/widgetTaskHandler.ts
import React from 'react'
import { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { FitnessWidget } from './FitnessWidget'
import { NutritionWidget } from './NutritionWidget'
import { FinanceWidget } from './FinanceWidget'
import { HabitsWidget } from './HabitsWidget'
import { MoodWidget } from './MoodWidget'
import { PartnerWidget } from './PartnerWidget'

const nameToWidget: Record<string, React.FC> = {
  FitnessWidget, NutritionWidget, FinanceWidget, HabitsWidget, MoodWidget, PartnerWidget,
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const Widget = nameToWidget[props.widgetName]
  if (!Widget) return
  if (props.widgetAction === 'WIDGET_ADDED' || props.widgetAction === 'WIDGET_UPDATE') {
    props.renderWidget(<Widget />)
  }
}
```

**Step 3: Register handler in index.js**

Create or update root `index.js`:
```javascript
import { registerWidgetTaskHandler } from 'react-native-android-widget'
import { widgetTaskHandler } from './widgets/widgetTaskHandler'
registerWidgetTaskHandler(widgetTaskHandler)
```

**Step 4: Add plugin config to app.json**

In `app.json` `plugins` array, add:
```json
[
  "react-native-android-widget",
  {
    "widgets": [
      { "name": "FitnessWidget", "label": "Fitness", "description": "Today's steps and calories" },
      { "name": "NutritionWidget", "label": "Nutrition", "description": "Calories and water" },
      { "name": "FinanceWidget", "label": "Finance", "description": "Today's spending" },
      { "name": "HabitsWidget", "label": "Habits", "description": "Daily habit progress" },
      { "name": "MoodWidget", "label": "Mood", "description": "Today's mood" },
      { "name": "PartnerWidget", "label": "Partner", "description": "Photo from a friend" }
    ]
  }
]
```

**Step 5: Commit**

```bash
git add widgets/ index.js app.json
git commit -m "feat: add Android widget components and registration"
```

---

## Phase 7: iOS WidgetKit Extension

### Task 14: iOS Config Plugin + Swift Widget Bundle

**Files:**
- Create: `plugins/withWidgetExtension.js`
- Create: `widgets/ios/EveryDayWidgets.swift`
- Create: `widgets/ios/Info.plist`

**Step 1: Create the EAS config plugin**

```javascript
// plugins/withWidgetExtension.js
const { withXcodeProject, IOSConfig } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

const EXT_NAME = 'EveryDayWidgets'

module.exports = function withWidgetExtension(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults
    const projectRoot = config.modRequest.projectRoot
    const iosDir = path.join(projectRoot, 'ios')
    const extDir = path.join(iosDir, EXT_NAME)

    if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true })

    const swiftSrc = path.join(projectRoot, `widgets/ios/${EXT_NAME}.swift`)
    const plistSrc = path.join(projectRoot, 'widgets/ios/Info.plist')
    if (fs.existsSync(swiftSrc)) fs.copyFileSync(swiftSrc, path.join(extDir, `${EXT_NAME}.swift`))
    if (fs.existsSync(plistSrc)) fs.copyFileSync(plistSrc, path.join(extDir, 'Info.plist'))

    const bundleId = IOSConfig.BundleIdentifier.getBundleIdentifier(config)
    const target = xcodeProject.addTarget(EXT_NAME, 'app_extension', EXT_NAME, `${bundleId}.widgets`)

    if (target) {
      const uuid = target.uuid
      xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', uuid)
      xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', uuid)
      xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', uuid)

      const groupKey = xcodeProject.findPBXGroupKey({ name: EXT_NAME })
      xcodeProject.addSourceFile(`${EXT_NAME}/${EXT_NAME}.swift`, { target: uuid }, groupKey)

      const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection()
      Object.values(buildConfigs).forEach((cfg: any) => {
        if (cfg.buildSettings?.PRODUCT_NAME === `"${EXT_NAME}"`) {
          cfg.buildSettings.SWIFT_VERSION = '5.0'
          cfg.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"'
        }
      })
    }

    return config
  })
}
```

**Step 2: Create Info.plist**

```xml
<!-- widgets/ios/Info.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
```

**Step 3: Create EveryDayWidgets.swift**

```swift
// widgets/ios/EveryDayWidgets.swift
import WidgetKit
import SwiftUI

// MARK: - Shared data model

struct WidgetEntry: TimelineEntry {
    let date: Date
    // Fitness
    let steps: Int
    let caloriesBurned: Int
    let activeMinutes: Int
    // Nutrition
    let caloriesConsumed: Int
    let caloriesGoal: Int
    let waterMl: Int
    let waterGoalMl: Int
    // Finance
    let netSpend: Double
    // Habits
    let habitsCompleted: Int
    let habitsTotal: Int
    // Mood
    let moodEmoji: String?
    // Partner
    let partnerImageUrl: String?
    let partnerCaption: String?
    let partnerSenderName: String?
}

func readSharedData() -> WidgetEntry {
    let group = "group.com.yourname.everydayapp" // replace with your bundle ID
    let defaults = UserDefaults(suiteName: group)
    let json = defaults?.string(forKey: "widgetData") ?? "[]"
    guard let data = json.data(using: .utf8),
          let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        return emptyEntry()
    }

    func payload(_ type: String) -> [String: Any] {
        (arr.first(where: { $0["type"] as? String == type })?["data"] as? [String: Any]) ?? [:]
    }

    let fit = payload("fitness")
    let nut = payload("nutrition")
    let fin = payload("finance")
    let hab = payload("habits")
    let mood = payload("mood")
    let par = payload("partner")

    return WidgetEntry(
        date: Date(),
        steps: fit["steps"] as? Int ?? 0,
        caloriesBurned: fit["caloriesBurned"] as? Int ?? 0,
        activeMinutes: fit["activeMinutes"] as? Int ?? 0,
        caloriesConsumed: nut["caloriesConsumed"] as? Int ?? 0,
        caloriesGoal: nut["caloriesGoal"] as? Int ?? 2000,
        waterMl: nut["waterMl"] as? Int ?? 0,
        waterGoalMl: nut["waterGoalMl"] as? Int ?? 2000,
        netSpend: fin["netSpend"] as? Double ?? 0,
        habitsCompleted: hab["completedCount"] as? Int ?? 0,
        habitsTotal: hab["activeCount"] as? Int ?? 0,
        moodEmoji: mood["emoji"] as? String,
        partnerImageUrl: par["imageUrl"] as? String,
        partnerCaption: par["caption"] as? String,
        partnerSenderName: par["senderName"] as? String
    )
}

func emptyEntry() -> WidgetEntry {
    WidgetEntry(date: Date(), steps: 0, caloriesBurned: 0, activeMinutes: 0,
                caloriesConsumed: 0, caloriesGoal: 2000, waterMl: 0, waterGoalMl: 2000,
                netSpend: 0, habitsCompleted: 0, habitsTotal: 0, moodEmoji: nil,
                partnerImageUrl: nil, partnerCaption: nil, partnerSenderName: nil)
}

// MARK: - Generic provider (all widgets share same data)

struct EDAProvider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry { readSharedData() }
    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) { completion(readSharedData()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [readSharedData()], policy: .after(refresh)))
    }
}

struct PartnerProvider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry { readSharedData() }
    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) { completion(readSharedData()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [readSharedData()], policy: .after(refresh)))
    }
}

// MARK: - Views

struct FitnessView: View {
    let e: WidgetEntry
    var body: some View {
        VStack(spacing: 2) {
            Text("Fitness").font(.caption2).fontWeight(.semibold).foregroundColor(.indigo)
            Text("\(e.steps.formatted())").font(.system(size: 28, weight: .bold))
            Text("steps").font(.caption2).foregroundColor(.secondary)
            Text("\(e.caloriesBurned) cal burned").font(.caption2).foregroundColor(.secondary)
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct NutritionView: View {
    let e: WidgetEntry
    var body: some View {
        VStack(spacing: 2) {
            Text("Nutrition").font(.caption2).fontWeight(.semibold).foregroundColor(.green)
            Text("\(e.caloriesConsumed) / \(e.caloriesGoal)").font(.system(size: 18, weight: .bold))
            Text("kcal").font(.caption2).foregroundColor(.secondary)
            Text("💧 \(e.waterMl)ml / \(e.waterGoalMl)ml").font(.caption2).foregroundColor(.blue)
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct FinanceView: View {
    let e: WidgetEntry
    var body: some View {
        VStack(spacing: 2) {
            Text("Finance").font(.caption2).fontWeight(.semibold).foregroundColor(.orange)
            Text(String(format: "$%.2f", e.netSpend)).font(.system(size: 24, weight: .bold))
            Text("spent today").font(.caption2).foregroundColor(.secondary)
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct HabitsView: View {
    let e: WidgetEntry
    var body: some View {
        VStack(spacing: 2) {
            Text("Habits").font(.caption2).fontWeight(.semibold).foregroundColor(.purple)
            Text("\(e.habitsCompleted)/\(e.habitsTotal)").font(.system(size: 28, weight: .bold))
            Text("done today").font(.caption2).foregroundColor(.secondary)
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct MoodView: View {
    let e: WidgetEntry
    let map = ["1": "😞", "2": "😕", "3": "😐", "4": "🙂", "5": "😄"]
    var body: some View {
        VStack(spacing: 2) {
            Text("Mood").font(.caption2).fontWeight(.semibold).foregroundColor(.orange)
            if let m = e.moodEmoji, let emoji = map[m] {
                Text(emoji).font(.system(size: 36))
            } else {
                Text("Tap to log").font(.caption).foregroundColor(.secondary)
            }
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct PartnerView: View {
    let e: WidgetEntry
    var body: some View {
        Group {
            if let urlStr = e.partnerImageUrl, let url = URL(string: urlStr) {
                ZStack(alignment: .bottomLeading) {
                    AsyncImage(url: url) { img in img.resizable().scaledToFill() } placeholder: { Color.gray.opacity(0.2) }
                    LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .center, endPoint: .bottom)
                    VStack(alignment: .leading, spacing: 1) {
                        if let name = e.partnerSenderName { Text(name).font(.caption2).fontWeight(.semibold).foregroundColor(.white) }
                        if let cap = e.partnerCaption { Text(cap).font(.caption2).foregroundColor(.white.opacity(0.8)).lineLimit(2) }
                    }.padding(8)
                }.clipped()
            } else {
                VStack { Text("💕").font(.system(size: 32)); Text("No photos yet").font(.caption).foregroundColor(.secondary) }
            }
        }
        .containerBackground(.regularMaterial, for: .widget)
    }
}

// MARK: - Widget declarations

struct FitnessWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FitnessWidget", provider: EDAProvider()) { FitnessView(e: $0) }
            .configurationDisplayName("Fitness").description("Steps and calories burned.").supportedFamilies([.systemSmall])
    }
}
struct NutritionWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NutritionWidget", provider: EDAProvider()) { NutritionView(e: $0) }
            .configurationDisplayName("Nutrition").description("Calories and water.").supportedFamilies([.systemSmall])
    }
}
struct FinanceWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FinanceWidget", provider: EDAProvider()) { FinanceView(e: $0) }
            .configurationDisplayName("Finance").description("Today's spending.").supportedFamilies([.systemSmall])
    }
}
struct HabitsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HabitsWidget", provider: EDAProvider()) { HabitsView(e: $0) }
            .configurationDisplayName("Habits").description("Daily habit progress.").supportedFamilies([.systemSmall])
    }
}
struct MoodWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MoodWidget", provider: EDAProvider()) { MoodView(e: $0) }
            .configurationDisplayName("Mood").description("Today's mood.").supportedFamilies([.systemSmall])
    }
}
struct PartnerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PartnerWidget", provider: PartnerProvider()) { PartnerView(e: $0) }
            .configurationDisplayName("Partner").description("Latest photo from a friend.").supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct EveryDayWidgetBundle: WidgetBundle {
    var body: some Widget {
        FitnessWidget(); NutritionWidget(); FinanceWidget(); HabitsWidget(); MoodWidget(); PartnerWidget()
    }
}
```

**Step 4: Register plugin in app.json**

In `app.json` `plugins` array, add:
```json
"./plugins/withWidgetExtension"
```

**Step 5: Commit**

```bash
git add plugins/withWidgetExtension.js widgets/ios/
git commit -m "feat: add iOS WidgetKit extension config plugin and Swift widgets"
```

---

## Phase 8: Push Token + Build

### Task 15: Register Push Token on Sign-In

**Files:**
- Modify: `lib/notifications.ts`
- Modify: `app/_layout.tsx`

**Step 1: Add registerPushToken to notifications.ts**

```typescript
import { supabase } from '@/lib/supabase'

export async function registerPushToken(): Promise<void> {
  try {
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync()
    if (!tokenData?.data) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ push_token: tokenData.data }).eq('id', user.id)
  } catch {
    // silently fail if permissions not granted
  }
}
```

**Step 2: Call on sign-in in _layout.tsx**

```typescript
import { registerPushToken } from '@/lib/notifications'

// In the auth state change listener, after session is confirmed:
if (session) {
  registerPushToken()
}
```

**Step 3: Commit**

```bash
git add lib/notifications.ts app/_layout.tsx
git commit -m "feat: register and persist push token on sign-in"
```

---

### Task 16: Build Development Client + Test

Widgets cannot run in Expo Go — a custom dev build is required.

**Step 1: Initialize EAS (if not done)**

```bash
eas init
```

Expected: Writes real `projectId` into `app.json`.

**Step 2: Build for your platform**

iOS:
```bash
eas build --profile development --platform ios
```

Android:
```bash
eas build --profile development --platform android
```

Expected: Build queued (~10-15 min). Download and install the resulting `.ipa` / `.apk`.

**Step 3: Start dev server**

```bash
npx expo start --dev-client
```

Scan the QR code with the installed dev client app (not Expo Go).

**Step 4: Test on device**

- **iOS:** Long-press home screen → + → search "EveryDayApp" → add widgets
- **Android:** Long-press home screen → Widgets → scroll to EveryDayApp → drag to screen

**Step 5: Test partner post end-to-end**

1. Sign in with two accounts on separate devices
2. Add each other as friends via Add Friend screen
3. On device A: tap heart FAB on Me tab → pick image → add caption → select friend → Send
4. Verify device B gets push notification
5. Tap notification → partner-post screen opens with full image
6. Check home screen → PartnerWidget shows the image

**Step 6: Replace placeholder App Group ID**

In `lib/widgetSync.ts` and `widgets/ios/EveryDayWidgets.swift`, replace:
```
group.com.yourname.everydayapp
```
with your actual bundle ID prefixed by `group.`

**Step 7: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All passing.

**Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete widgets and relationship feature"
```

---

## Summary of New Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260326000001_friends.sql` | friend_requests, friends, partner_posts tables |
| `supabase/functions/accept-friend-request/index.ts` | Accept request + create friendship |
| `supabase/functions/send-partner-post/index.ts` | Store post + send push notification |
| `stores/friendStore.ts` | Friend/post Zustand store |
| `app/friends.tsx` | Friends list + pending requests |
| `app/add-friend.tsx` | Add friend by username/email |
| `app/partner-post.tsx` | Full-screen post viewer (deep link target) |
| `components/friends/FriendRequestBadge.tsx` | Badge on Me tab for pending requests |
| `components/friends/SendPartnerImageModal.tsx` | Pick + send partner image |
| `lib/widgetSync.ts` | Write widget data to shared storage |
| `widgets/FitnessWidget.tsx` | Android fitness widget |
| `widgets/NutritionWidget.tsx` | Android nutrition widget |
| `widgets/FinanceWidget.tsx` | Android finance widget |
| `widgets/HabitsWidget.tsx` | Android habits widget |
| `widgets/MoodWidget.tsx` | Android mood widget |
| `widgets/PartnerWidget.tsx` | Android partner widget |
| `widgets/widgetTaskHandler.ts` | Android widget action handler |
| `widgets/ios/EveryDayWidgets.swift` | iOS SwiftUI widget bundle (all 6 widgets) |
| `widgets/ios/Info.plist` | iOS widget extension plist |
| `plugins/withWidgetExtension.js` | EAS config plugin adds WidgetKit target |
