import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'

export interface Transaction {
  id: string
  type: 'income' | 'expense' | 'subscription' | 'repeat'
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

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      transactions: [],
      addTransaction: (t) =>
        set((state) => ({
          transactions: [...state.transactions, { ...t, id: uuidv4() }],
        })),
      removeTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),
    }),
    { name: 'finance', storage: createJSONStorage(() => AsyncStorage) }
  )
)
