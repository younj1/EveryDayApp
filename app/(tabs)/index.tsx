import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { useFinanceStore } from '@/stores/financeStore'
import { useNutritionStore } from '@/stores/nutritionStore'
import { useFitnessStore } from '@/stores/fitnessStore'
import { useHabitStore } from '@/stores/habitStore'
import { useMoodStore } from '@/stores/moodStore'
import { useSettingsStore } from '@/stores/settingsStore'

export default function HomeScreen() {
  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const today = new Date().toISOString().split('T')[0]

  // Finance
  const transactions = useFinanceStore((s) => s.transactions)
  const todayExpenses = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date).toISOString().split('T')[0] === today)
    .reduce((sum, t) => sum + t.amount, 0)

  // Nutrition
  const getTotalCalories = useNutritionStore((s) => s.getTotalCalories)
  const getTotalWater = useNutritionStore((s) => s.getTotalWater)
  const totalCalories = getTotalCalories(today)
  const totalWater = getTotalWater(today)
  const calGoal = useSettingsStore((s) => s.dailyCalorieGoal)
  const waterGoal = useSettingsStore((s) => s.dailyWaterGoalMl)

  // Fitness
  const steps = useFitnessStore((s) => s.todayStats?.steps ?? 0)

  // Habits
  const habits = useHabitStore((s) => s.habits.filter((h) => !h.archived))
  const isCompleted = useHabitStore((s) => s.isCompleted)
  const completedHabits = habits.filter((h) => isCompleted(h.id, today)).length

  // Mood
  const getTodayMood = useMoodStore((s) => s.getTodayMood)
  const todayMood = getTodayMood()

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-gray-500 text-sm">{todayDate}</Text>
        <Text className="text-2xl font-bold text-gray-900 mt-1 mb-6">{greeting}</Text>

        {/* Row 1: Finance + Steps */}
        <View className="flex-row gap-3 mb-3">
          <SummaryCard title="Spent Today" value={`$${todayExpenses.toFixed(2)}`} color="blue" />
          <SummaryCard title="Steps" value={`${steps.toLocaleString()}`} color="green" />
        </View>

        {/* Row 2: Calories + Water */}
        <View className="flex-row gap-3 mb-3">
          <SummaryCard title="Calories" value={`${totalCalories} / ${calGoal} kcal`} color="orange" />
          <SummaryCard title="Water" value={`${totalWater} / ${waterGoal} ml`} color="blue" />
        </View>

        {/* Row 3: Mood + Habits */}
        <View className="flex-row gap-3 mb-6">
          <SummaryCard title="Mood" value={todayMood?.emoji ?? '—'} color="purple" />
          <SummaryCard title="Habits" value={`${completedHabits} / ${habits.length}`} color="green" />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
