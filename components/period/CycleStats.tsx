import { View, Text } from 'react-native'
import { CycleEntry } from '@/stores/periodStore'

interface Props {
  cycles: CycleEntry[]
  logStreak: number
}

export function CycleStats({ cycles, logStreak }: Props) {
  const closed = cycles.filter((c) => c.cycleLength != null)
  const lengths = closed.map((c) => c.cycleLength as number)
  const periodLengths = cycles.filter((c) => c.periodLength != null).map((c) => c.periodLength as number)

  const avgCycle = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : null
  const avgPeriod = periodLengths.length ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : null
  const minCycle = lengths.length ? Math.min(...lengths) : null
  const maxCycle = lengths.length ? Math.max(...lengths) : null

  const stats = [
    { label: 'Avg cycle', value: avgCycle ? `${avgCycle}d` : '—' },
    { label: 'Avg period', value: avgPeriod ? `${avgPeriod}d` : '—' },
    { label: 'Shortest', value: minCycle ? `${minCycle}d` : '—' },
    { label: 'Longest', value: maxCycle ? `${maxCycle}d` : '—' },
    { label: 'Log streak', value: `${logStreak}d` },
  ]

  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <Text className="font-semibold text-gray-800 mb-3">Cycle Stats</Text>
      <View className="flex-row flex-wrap">
        {stats.map((s) => (
          <View key={s.label} className="w-1/3 items-center mb-3">
            <Text className="text-xl font-bold text-gray-900">{s.value}</Text>
            <Text className="text-xs text-gray-500">{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
