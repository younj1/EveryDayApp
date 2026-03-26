import { View, Text } from 'react-native'
import { CyclePhase } from '@/lib/cycleCalculations'

const PHASE_CONFIG: Record<CyclePhase, { label: string; color: string; bg: string }> = {
  menstruation: { label: 'Period', color: 'text-red-600', bg: 'bg-red-50' },
  follicular: { label: 'Follicular', color: 'text-blue-600', bg: 'bg-blue-50' },
  ovulation: { label: 'Ovulation', color: 'text-green-600', bg: 'bg-green-50' },
  luteal: { label: 'Luteal', color: 'text-purple-600', bg: 'bg-purple-50' },
}

interface Props {
  phase: CyclePhase
  dayOfCycle: number
  daysUntilNextPeriod: number | null
}

export function CycleStatusCard({ phase, dayOfCycle, daysUntilNextPeriod }: Props) {
  const config = PHASE_CONFIG[phase]
  return (
    <View className={`rounded-2xl p-4 mb-4 ${config.bg}`}>
      <Text className={`text-xs font-semibold uppercase tracking-wide mb-1 ${config.color}`}>
        {config.label} Phase
      </Text>
      <Text className="text-3xl font-bold text-gray-900">Day {dayOfCycle}</Text>
      {daysUntilNextPeriod !== null && (
        <Text className="text-sm text-gray-500 mt-1">
          {daysUntilNextPeriod === 0
            ? 'Period expected today'
            : `Period in ${daysUntilNextPeriod} day${daysUntilNextPeriod === 1 ? '' : 's'}`}
        </Text>
      )}
    </View>
  )
}
