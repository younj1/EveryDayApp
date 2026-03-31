import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface TodayStats {
  steps: number
  heartRate: number
  caloriesBurned: number
  activeMinutes?: number
  sleepHours?: number
  sleepScore?: number
  stress?: number
  hrv?: number
  spo2?: number
  bodyBattery?: number
}

interface FitnessState {
  todayStats: TodayStats | null
  lastSyncAt: number | null
  setTodayStats: (stats: TodayStats) => void
  setLastSyncAt: (ts: number) => void
}

export const useFitnessStore = create<FitnessState>()(
  persist(
    (set) => ({
      todayStats: null,
      lastSyncAt: null,
      setTodayStats: (stats) => set({ todayStats: stats }),
      setLastSyncAt: (ts) => set({ lastSyncAt: ts }),
    }),
    { name: 'fitness', storage: createJSONStorage(() => AsyncStorage) }
  )
)
