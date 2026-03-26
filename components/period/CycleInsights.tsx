import { View, Text } from 'react-native'

interface Props {
  insights: string[]
}

export function CycleInsights({ insights }: Props) {
  if (insights.length === 0) return null
  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <Text className="font-semibold text-gray-800 mb-3">Insights</Text>
      {insights.map((insight, i) => (
        <View key={i} className="flex-row items-start mb-2">
          <Text className="text-indigo-400 mr-2">•</Text>
          <Text className="text-gray-700 flex-1">{insight}</Text>
        </View>
      ))}
    </View>
  )
}
