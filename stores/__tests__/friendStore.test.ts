jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn(), getSession: jest.fn() },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

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
