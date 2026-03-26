import { create } from 'zustand'

export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  merchant?: string
  date: number
  source: 'plaid' | 'manual' | 'receipt'
  receiptImageUrl?: string
  notes?: string
}

interface FinanceState {
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  removeTransaction: (id: string) => void
}

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  addTransaction: (t) =>
    set((state) => ({
      transactions: [...state.transactions, { ...t, id: Date.now().toString() }],
    })),
  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),
}))
