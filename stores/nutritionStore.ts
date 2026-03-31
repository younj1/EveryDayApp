import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'

export interface FoodEntry {
  id: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foodName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  date: string  // YYYY-MM-DD
  source: 'barcode' | 'search' | 'photo' | 'manual'
}

interface NutritionGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
  waterMl: number
}

interface NutritionState {
  entries: FoodEntry[]
  waterEntries: { id: string; amountMl: number; date: string; time: number }[]
  goals: NutritionGoals
  addFoodEntry: (entry: Omit<FoodEntry, 'id'>) => void
  removeFoodEntry: (id: string) => void
  addWater: (amountMl: number) => void
  updateGoals: (goals: Partial<NutritionGoals>) => void
  getTotalCalories: (date: string) => number
  getTotalWater: (date: string) => number
  getMacros: (date: string) => { protein: number; carbs: number; fat: number }
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      entries: [],
      waterEntries: [],
      goals: { calories: 2000, protein: 150, carbs: 250, fat: 65, waterMl: 2500 },
      addFoodEntry: (entry) =>
        set((state) => ({ entries: [...state.entries, { ...entry, id: uuidv4() }] })),
      removeFoodEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      addWater: (amountMl) =>
        set((state) => ({
          waterEntries: [
            ...state.waterEntries,
            { id: uuidv4(), amountMl, date: new Date().toISOString().split('T')[0], time: Date.now() },
          ],
        })),
      updateGoals: (goals) =>
        set((state) => ({ goals: { ...state.goals, ...goals } })),
      getTotalCalories: (date) =>
        get().entries.filter((e) => e.date === date).reduce((sum, e) => sum + e.calories, 0),
      getTotalWater: (date) =>
        get().waterEntries.filter((e) => e.date === date).reduce((sum, e) => sum + e.amountMl, 0),
      getMacros: (date) => {
        const dayEntries = get().entries.filter((e) => e.date === date)
        return {
          protein: dayEntries.reduce((s, e) => s + e.protein, 0),
          carbs: dayEntries.reduce((s, e) => s + e.carbs, 0),
          fat: dayEntries.reduce((s, e) => s + e.fat, 0),
        }
      },
    }),
    { name: 'nutrition', storage: createJSONStorage(() => AsyncStorage) }
  )
)
