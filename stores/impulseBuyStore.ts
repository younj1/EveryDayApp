import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'
import { scheduleImpulseBuyReminder } from '@/lib/notifications'

export interface ImpulseBuy {
  id: string
  itemName: string
  price: number
  waitDays: number
  createdAt: number
  remindAt: number
  status: 'pending' | 'bought' | 'skipped'
}

interface ImpulseBuyState {
  items: ImpulseBuy[]
  addImpulseBuy: (input: { itemName: string; price: number; waitDays: number }) => void
  updateStatus: (id: string, status: ImpulseBuy['status']) => void
  snooze: (id: string, extraDays: number) => void
}

export const useImpulseBuyStore = create<ImpulseBuyState>()(
  persist(
    (set) => ({
      items: [],
      addImpulseBuy: ({ itemName, price, waitDays }) => {
        const id = uuidv4()
        const remindAt = Date.now() + waitDays * 24 * 60 * 60 * 1000
        set((state) => ({
          items: [...state.items, { id, itemName, price, waitDays, createdAt: Date.now(), remindAt, status: 'pending' }],
        }))
        // Fire and forget — don't block store update on permission prompt
        scheduleImpulseBuyReminder(id, itemName, price, remindAt).catch(() => {})
      },
      updateStatus: (id, status) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, status } : item)),
        })),
      snooze: (id, extraDays) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, remindAt: item.remindAt + extraDays * 24 * 60 * 60 * 1000 }
              : item
          ),
        })),
    }),
    { name: 'impulse-buys', storage: createJSONStorage(() => AsyncStorage) }
  )
)
