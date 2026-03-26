import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

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
      transactions: [...state.transactions, { ...t, id: uuidv4() }],
    })),
  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),
}))
