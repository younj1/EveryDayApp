import { useAuthStore } from '@/stores/authStore'

describe('authStore', () => {
  it('starts with no session', () => {
    const { session } = useAuthStore.getState()
    expect(session).toBeNull()
  })

  it('starts with loading true', () => {
    const { loading } = useAuthStore.getState()
    expect(loading).toBe(true)
  })

  it('setSession updates session and sets loading false', () => {
    const mockSession = { user: { id: '123' } } as any
    useAuthStore.getState().setSession(mockSession)
    expect(useAuthStore.getState().session).toBe(mockSession)
    expect(useAuthStore.getState().loading).toBe(false)
    // reset
    useAuthStore.getState().setSession(null)
  })
})
