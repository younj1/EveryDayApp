import { useImpulseBuyStore } from '@/stores/impulseBuyStore'

describe('impulseBuyStore', () => {
  beforeEach(() => {
    useImpulseBuyStore.setState({ items: [] })
  })

  it('calculates remindAt from waitDays', () => {
    const store = useImpulseBuyStore.getState()
    const before = Date.now()
    store.addImpulseBuy({ itemName: 'AirPods', price: 179, waitDays: 7 })
    const item = useImpulseBuyStore.getState().items[0]
    const expectedMin = before + 7 * 24 * 60 * 60 * 1000
    expect(item.remindAt).toBeGreaterThanOrEqual(expectedMin - 1000)
    expect(item.status).toBe('pending')
  })

  it('updates status to bought', () => {
    useImpulseBuyStore.getState().addImpulseBuy({ itemName: 'Shoes', price: 80, waitDays: 3 })
    const id = useImpulseBuyStore.getState().items[0].id
    useImpulseBuyStore.getState().updateStatus(id, 'bought')
    expect(useImpulseBuyStore.getState().items[0].status).toBe('bought')
  })

  it('snoozes by extending remindAt', () => {
    useImpulseBuyStore.getState().addImpulseBuy({ itemName: 'Watch', price: 200, waitDays: 7 })
    const item = useImpulseBuyStore.getState().items[0]
    const originalRemindAt = item.remindAt
    useImpulseBuyStore.getState().snooze(item.id, 3)
    const snoozed = useImpulseBuyStore.getState().items[0].remindAt
    expect(snoozed).toBe(originalRemindAt + 3 * 24 * 60 * 60 * 1000)
  })
})
