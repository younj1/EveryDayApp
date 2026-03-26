import { View, Text, TouchableOpacity, FlatList } from 'react-native'
import { useHabitStore } from '@/stores/habitStore'
import { Check } from 'lucide-react-native'

export function HabitList() {
  const { habits, isCompleted, logHabit, unlogHabit, getStreak } = useHabitStore()
  const today = new Date().toISOString().split('T')[0]
  const activeHabits = habits.filter((h) => !h.archived)

  if (activeHabits.length === 0) {
    return (
      <View className="items-center py-12">
        <Text className="text-gray-400">No habits yet. Add one to get started!</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={activeHabits}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => {
        const done = isCompleted(item.id, today)
        const streak = getStreak(item.id)
        return (
          <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-2">
            <TouchableOpacity
              className={`w-8 h-8 rounded-full border-2 items-center justify-center mr-3 ${done ? 'bg-primary border-primary' : 'border-gray-300'}`}
              onPress={() => done ? unlogHabit(item.id, today) : logHabit(item.id, today)}
            >
              {done && <Check size={16} color="white" />}
            </TouchableOpacity>
            <View className="flex-1">
              <Text className={`font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                {item.icon ? `${item.icon} ` : ''}{item.name}
              </Text>
            </View>
            {streak > 0 && (
              <View className="bg-orange-100 px-2 py-1 rounded-full">
                <Text className="text-orange-600 text-xs font-bold">🔥 {streak}</Text>
              </View>
            )}
          </View>
        )
      }}
    />
  )
}
