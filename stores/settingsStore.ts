import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SettingsState {
  cloudSyncEnabled: boolean
  plaidConnected: boolean
  garminConnected: boolean
  healthKitConnected: boolean
  dailyCalorieGoal: number
  dailyWaterGoalMl: number
  toggleCloudSync: () => void
  setPlaidConnected: (v: boolean) => void
  setGarminConnected: (v: boolean) => void
  setHealthKitConnected: (v: boolean) => void
  updateGoals: (calories: number, waterMl: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cloudSyncEnabled: false,
      plaidConnected: false,
      garminConnected: false,
      healthKitConnected: false,
      dailyCalorieGoal: 2000,
      dailyWaterGoalMl: 2500,
      toggleCloudSync: () => set((state) => ({ cloudSyncEnabled: !state.cloudSyncEnabled })),
      setPlaidConnected: (v) => set({ plaidConnected: v }),
      setGarminConnected: (v) => set({ garminConnected: v }),
      setHealthKitConnected: (v) => set({ healthKitConnected: v }),
      updateGoals: (calories, waterMl) => set({ dailyCalorieGoal: calories, dailyWaterGoalMl: waterMl }),
    }),
    { name: 'settings', storage: createJSONStorage(() => AsyncStorage) }
  )
)
