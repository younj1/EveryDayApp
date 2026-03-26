import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus } from 'lucide-react-native'
import { useNutritionStore } from '@/stores/nutritionStore'
import { CalorieRing } from '@/components/nutrition/CalorieRing'

const WATER_QUICK_ADD = [250, 500, 750]
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const progress = goal > 0 ? Math.min(value / goal, 1) : 0
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="text-xs text-gray-500">{value}g / {goal}g</Text>
      </View>
      <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <View style={{ width: `${progress * 100}%`, backgroundColor: color }} className="h-full rounded-full" />
      </View>
    </View>
  )
}

export default function NutritionScreen() {
  const today = new Date().toISOString().split('T')[0]
  const { entries, goals, getTotalCalories, getTotalWater, getMacros, addWater, removeFoodEntry } = useNutritionStore()
  const [showAddFood, setShowAddFood] = useState(false)

  const todayEntries = entries.filter((e) => e.date === today)
  const totalCalories = getTotalCalories(today)
  const totalWater = getTotalWater(today)
  const macros = getMacros(today)

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Nutrition</Text>

        {/* Calorie ring + macros */}
        <View className="bg-white rounded-2xl p-6 mb-4 items-center">
          <CalorieRing consumed={totalCalories} goal={goals.calories} />
          <View className="w-full mt-4">
            <MacroBar label="Protein" value={macros.protein} goal={goals.protein} color="#6366f1" />
            <MacroBar label="Carbs" value={macros.carbs} goal={goals.carbs} color="#f59e0b" />
            <MacroBar label="Fat" value={macros.fat} goal={goals.fat} color="#ef4444" />
          </View>
        </View>

        {/* Water tracker */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-semibold text-gray-800">Water</Text>
            <Text className="text-sm text-gray-500">{totalWater}ml / {goals.waterMl}ml</Text>
          </View>
          <View className="h-3 bg-blue-100 rounded-full overflow-hidden mb-3">
            <View
              style={{ width: `${Math.min(totalWater / goals.waterMl, 1) * 100}%` }}
              className="h-full bg-blue-400 rounded-full"
            />
          </View>
          <View className="flex-row gap-2">
            {WATER_QUICK_ADD.map((ml) => (
              <TouchableOpacity
                key={ml}
                className="flex-1 bg-blue-50 rounded-xl py-2 items-center"
                onPress={() => addWater(ml)}
              >
                <Text className="text-blue-600 font-medium text-sm">+{ml}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meal sections */}
        {MEALS.map((meal) => {
          const mealEntries = todayEntries.filter((e) => e.mealType === meal)
          const mealCalories = mealEntries.reduce((s, e) => s + e.calories, 0)
          return (
            <View key={meal} className="bg-white rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-semibold text-gray-800 capitalize">{meal}</Text>
                <Text className="text-sm text-gray-400">{mealCalories} kcal</Text>
              </View>
              {mealEntries.map((entry) => (
                <View key={entry.id} className="flex-row justify-between items-center py-1">
                  <View>
                    <Text className="text-sm text-gray-700">{entry.foodName}</Text>
                    <Text className="text-xs text-gray-400">P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-gray-600">{entry.calories} kcal</Text>
                    <TouchableOpacity onPress={() => removeFoodEntry(entry.id)}>
                      <Text className="text-red-400 text-xs">✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {mealEntries.length === 0 && (
                <Text className="text-xs text-gray-300 py-1">Nothing logged yet</Text>
              )}
            </View>
          )
        })}

        <View className="h-24" />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => setShowAddFood(true)}
      >
        <Plus color="white" size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}
