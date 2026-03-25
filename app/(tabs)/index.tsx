import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SummaryCard } from '@/components/dashboard/SummaryCard'

export default function HomeScreen() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-gray-500 text-sm">{today}</Text>
        <Text className="text-2xl font-bold text-gray-900 mt-1 mb-6">{greeting}</Text>

        {/* Row 1: Finance + Steps */}
        <View className="flex-row gap-3 mb-3">
          <SummaryCard title="Spent Today" value="$0.00" color="blue" />
          <SummaryCard title="Steps" value="—" color="green" />
        </View>

        {/* Row 2: Calories + Water */}
        <View className="flex-row gap-3 mb-3">
          <SummaryCard title="Calories" value="0 / 2000" color="orange" />
          <SummaryCard title="Water" value="0 / 2500ml" color="blue" />
        </View>

        {/* Row 3: Mood + Habits */}
        <View className="flex-row gap-3 mb-6">
          <SummaryCard title="Mood" value="—" color="purple" />
          <SummaryCard title="Habits" value="0 done" color="green" />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
