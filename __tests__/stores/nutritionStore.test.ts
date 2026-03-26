import { useNutritionStore } from '@/stores/nutritionStore'

describe('nutritionStore', () => {
  const today = new Date().toISOString().split('T')[0]

  beforeEach(() => {
    useNutritionStore.setState({ entries: [], waterEntries: [] })
  })

  it('calculates total calories for today', () => {
    const store = useNutritionStore.getState()
    store.addFoodEntry({ mealType: 'breakfast', foodName: 'Oats', calories: 300, protein: 10, carbs: 50, fat: 5, date: today, source: 'manual' })
    store.addFoodEntry({ mealType: 'lunch', foodName: 'Chicken', calories: 400, protein: 40, carbs: 0, fat: 8, date: today, source: 'manual' })
    expect(useNutritionStore.getState().getTotalCalories(today)).toBe(700)
  })

  it('calculates macros for today', () => {
    useNutritionStore.getState().addFoodEntry({ mealType: 'breakfast', foodName: 'Oats', calories: 300, protein: 10, carbs: 50, fat: 5, date: today, source: 'manual' })
    const macros = useNutritionStore.getState().getMacros(today)
    expect(macros.protein).toBe(10)
    expect(macros.carbs).toBe(50)
    expect(macros.fat).toBe(5)
  })

  it('tracks water intake', () => {
    useNutritionStore.getState().addWater(500)
    useNutritionStore.getState().addWater(250)
    expect(useNutritionStore.getState().getTotalWater(today)).toBe(750)
  })
})
