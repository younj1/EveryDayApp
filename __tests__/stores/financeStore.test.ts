import { useFinanceStore } from '@/stores/financeStore'

describe('financeStore', () => {
  it('starts with empty transactions', () => {
    expect(useFinanceStore.getState().transactions).toEqual([])
  })

  it('adds a transaction', () => {
    const store = useFinanceStore.getState()
    store.addTransaction({ type: 'expense', amount: 10, category: 'food', date: Date.now(), source: 'manual' })
    expect(useFinanceStore.getState().transactions).toHaveLength(1)
  })
})
