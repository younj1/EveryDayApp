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
