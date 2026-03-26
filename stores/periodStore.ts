import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { getAverageCycleLength } from '@/lib/cycleCalculations'

export interface CycleEntry {
  id: string
  startDate: string
  endDate: string | null
  cycleLength: number | null
  periodLength: number | null
  notes: string | null
}

export interface PeriodLogEntry {
  id: string
  cycleEntryId: string
  date: string
  flow: string | null
  symptoms: string[]
  mood: string | null
  temperature: number | null
  discharge: string | null
  notes: string
}

export interface BirthControlReminder {
  id: string
  label: string
  time: string
  message: string
  enabled: boolean
}

export interface CycleSettings {
  averageCycleLength: number
  averagePeriodLength: number
  temperatureUnit: 'C' | 'F'
  notificationsEnabled: boolean
  symptomReminderTime: string
}

interface PeriodState {
  cycles: CycleEntry[]
  logs: PeriodLogEntry[]
  settings: CycleSettings
  birthControlReminder: BirthControlReminder | null

  startCycle: (startDate: string) => void
  endCycle: (cycleId: string, endDate: string) => void
  saveLog: (log: Omit<PeriodLogEntry, 'id'>) => void
  getLogForDate: (date: string) => PeriodLogEntry | null
  getActiveCycle: () => CycleEntry | null
  updateSettings: (settings: Partial<CycleSettings>) => void
  setBirthControlReminder: (reminder: Omit<BirthControlReminder, 'id'>) => void
  toggleBirthControlReminder: () => void
}

export const usePeriodStore = create<PeriodState>((set, get) => ({
  cycles: [],
  logs: [],
  settings: {
    averageCycleLength: 28,
    averagePeriodLength: 5,
    temperatureUnit: 'C',
    notificationsEnabled: true,
    symptomReminderTime: '21:00',
  },
  birthControlReminder: null,

  startCycle: (startDate) => {
    const newCycle: CycleEntry = {
      id: uuidv4(),
      startDate,
      endDate: null,
      cycleLength: null,
      periodLength: null,
      notes: null,
    }
    set((state) => ({ cycles: [...state.cycles, newCycle] }))
  },

  endCycle: (cycleId, endDate) => {
    set((state) => {
      const cycles = state.cycles.map((c) => {
        if (c.id !== cycleId) return c
        const start = new Date(c.startDate)
        const end = new Date(endDate)
        const periodLength = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

        const idx = state.cycles.findIndex((x) => x.id === cycleId)
        let cycleLength: number | null = null
        if (idx > 0) {
          const prev = state.cycles[idx - 1]
          cycleLength = Math.round((start.getTime() - new Date(prev.startDate).getTime()) / 86400000)
        }

        return { ...c, endDate, periodLength, cycleLength }
      })

      const lengths = cycles.map((c) => c.cycleLength).filter((l): l is number => l != null)
      const averageCycleLength = getAverageCycleLength(lengths)

      return {
        cycles,
        settings: { ...state.settings, averageCycleLength },
      }
    })
  },

  saveLog: (log) => {
    set((state) => ({
      logs: [
        ...state.logs.filter((l) => l.date !== log.date || l.cycleEntryId !== log.cycleEntryId),
        { ...log, id: uuidv4() },
      ],
    }))
  },

  getLogForDate: (date) => {
    return get().logs.find((l) => l.date === date) ?? null
  },

  getActiveCycle: () => {
    return get().cycles.findLast((c) => c.endDate === null) ?? null
  },

  updateSettings: (settings) => {
    set((state) => ({ settings: { ...state.settings, ...settings } }))
  },

  setBirthControlReminder: (reminder) => {
    set({ birthControlReminder: { ...reminder, id: uuidv4() } })
  },

  toggleBirthControlReminder: () => {
    set((state) => {
      if (!state.birthControlReminder) return state
      return { birthControlReminder: { ...state.birthControlReminder, enabled: !state.birthControlReminder.enabled } }
    })
  },
}))
