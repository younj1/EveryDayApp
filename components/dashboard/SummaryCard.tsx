import { View, Text } from 'react-native'

interface SummaryCardProps {
  title: string
  value: string
  subtitle?: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const colorMap: Record<SummaryCardProps['color'], string> = {
  blue: 'bg-blue-50 border-blue-100',
  green: 'bg-green-50 border-green-100',
  purple: 'bg-purple-50 border-purple-100',
  orange: 'bg-orange-50 border-orange-100',
  red: 'bg-red-50 border-red-100',
}

export function SummaryCard({ title, value, subtitle, color }: SummaryCardProps) {
  return (
    <View className={`flex-1 rounded-2xl border p-4 ${colorMap[color]}`}>
      <Text className="text-xs text-gray-500 mb-1">{title}</Text>
      <Text className="text-xl font-bold text-gray-900">{value}</Text>
      {subtitle ? <Text className="text-xs text-gray-400 mt-1">{subtitle}</Text> : null}
    </View>
  )
}
