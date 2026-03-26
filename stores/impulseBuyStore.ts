import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

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

export const useImpulseBuyStore = create<ImpulseBuyState>((set) => ({
  items: [],
  addImpulseBuy: ({ itemName, price, waitDays }) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: uuidv4(),
          itemName,
          price,
          waitDays,
          createdAt: Date.now(),
          remindAt: Date.now() + waitDays * 24 * 60 * 60 * 1000,
          status: 'pending',
        },
      ],
    })),
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
}))
