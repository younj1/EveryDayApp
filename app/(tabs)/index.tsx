import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { useFinanceStore } from '@/stores/financeStore'
import { useNutritionStore } from '@/stores/nutritionStore'
import { useFitnessStore } from '@/stores/fitnessStore'
import { useHabitStore } from '@/stores/habitStore'
import { useMoodStore } from '@/stores/moodStore'

import { useAuthStore } from '@/stores/authStore'

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
    .filter((t) => ['expense', 'subscription', 'repeat'].includes(t.type) && new Date(t.date).toISOString().split('T')[0] === today)
    .reduce((sum, t) => sum + t.amount, 0)

  // Nutrition
  const getTotalCalories = useNutritionStore((s) => s.getTotalCalories)
  const getTotalWater = useNutritionStore((s) => s.getTotalWater)
  const totalCalories = getTotalCalories(today)
  const totalWater = getTotalWater(today)
  const calGoal = useNutritionStore((s) => s.goals.calories)
  const waterGoal = useNutritionStore((s) => s.goals.waterMl)

  // Fitness
  const steps = useFitnessStore((s) => s.todayStats?.steps ?? 0)

  // Habits
  const allHabits = useHabitStore((s) => s.habits)
  const habits = allHabits.filter((h) => !h.archived)
  const isCompleted = useHabitStore((s) => s.isCompleted)
  const completedHabits = habits.filter((h) => isCompleted(h.id, today)).length

  // Mood
  const getTodayMood = useMoodStore((s) => s.getTodayMood)
  const todayMood = getTodayMood()

  const session = useAuthStore((s) => s.session)
  const hasAnyData = transactions.length > 0 || habits.length > 0 || totalCalories > 0

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-gray-500 text-sm">{todayDate}</Text>
        <Text className="text-2xl font-bold text-gray-900 mt-1 mb-6">{greeting}{session?.user?.email ? `, ${session.user.email.split('@')[0]}` : ''}</Text>

        {!hasAnyData ? (
          <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-4">
            <Text className="text-lg font-bold text-indigo-900 mb-2">Welcome to EveryDayApp 👋</Text>
            <Text className="text-sm text-indigo-700 leading-5">Start by adding a transaction in Finance, logging a meal in Nutrition, or creating a habit in the Me tab. Your dashboard will fill up as you track your day.</Text>
          </View>
        ) : null}

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
