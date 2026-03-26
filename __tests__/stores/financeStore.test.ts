import { useFinanceStore } from '@/stores/financeStore'

describe('financeStore', () => {
  beforeEach(() => { useFinanceStore.setState({ transactions: [] }) })

  it('starts with empty transactions', () => {
    expect(useFinanceStore.getState().transactions).toEqual([])
  })

  it('adds a transaction', () => {
    const store = useFinanceStore.getState()
    store.addTransaction({ type: 'expense', amount: 10, category: 'food', date: Date.now(), source: 'manual' })
    expect(useFinanceStore.getState().transactions).toHaveLength(1)
  })

  it('removes a transaction', () => {
    const store = useFinanceStore.getState()
    store.addTransaction({ type: 'expense', amount: 5, category: 'food', date: Date.now(), source: 'manual' })
    const id = useFinanceStore.getState().transactions[0].id
    store.removeTransaction(id)
    expect(useFinanceStore.getState().transactions).toHaveLength(0)
  })
})
