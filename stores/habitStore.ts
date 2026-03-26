import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Habit {
  id: string
  name: string
  icon?: string
  frequency: 'daily' | 'weekly'
  createdAt: number
  archived: boolean
}

interface HabitLog {
  id: string
  habitId: string
  date: string  // YYYY-MM-DD
  completedAt: number
}

interface HabitState {
  habits: Habit[]
  logs: HabitLog[]
  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'archived'>) => void
  archiveHabit: (id: string) => void
  logHabit: (habitId: string, date: string) => void
  unlogHabit: (habitId: string, date: string) => void
  isCompleted: (habitId: string, date: string) => boolean
  getStreak: (habitId: string) => number
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  logs: [],
  addHabit: (h) =>
    set((state) => ({
      habits: [...state.habits, { ...h, id: uuidv4(), createdAt: Date.now(), archived: false }],
    })),
  archiveHabit: (id) =>
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, archived: true } : h)),
    })),
  logHabit: (habitId, date) => {
    if (get().isCompleted(habitId, date)) return
    set((state) => ({
      logs: [...state.logs, { id: uuidv4(), habitId, date, completedAt: Date.now() }],
    }))
  },
  unlogHabit: (habitId, date) =>
    set((state) => ({
      logs: state.logs.filter((l) => !(l.habitId === habitId && l.date === date)),
    })),
  isCompleted: (habitId, date) =>
    get().logs.some((l) => l.habitId === habitId && l.date === date),
  getStreak: (habitId) => {
    const logDates = new Set(
      get().logs.filter((l) => l.habitId === habitId).map((l) => l.date)
    )
    if (logDates.size === 0) return 0
    let streak = 0
    const current = new Date()
    for (let i = 0; i < 365; i++) {
      const dateStr = current.toISOString().split('T')[0]
      if (logDates.has(dateStr)) {
        streak++
        current.setDate(current.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  },
}))
