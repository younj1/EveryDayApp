import { View, Text, ScrollView, TouchableOpacity } from 'react-native'

export type DayStatus = 'period' | 'predicted' | 'ovulation' | 'fertile' | 'today' | 'none'

interface MarkedDates {
  [date: string]: DayStatus
}

interface Props {
  month: Date
  markedDates: MarkedDates
  onDayPress: (date: string) => void
}

const STATUS_STYLE: Record<DayStatus, string> = {
  period: 'bg-red-400',
  predicted: 'bg-red-200',
  ovulation: 'bg-green-400',
  fertile: 'bg-green-200',
  today: 'bg-indigo-100 border-2 border-indigo-400',
  none: 'bg-white',
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function CycleCalendar({ month, markedDates, onDayPress }: Props) {
  const days = getDaysInMonth(month.getFullYear(), month.getMonth())
  const monthLabel = month.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <Text className="font-semibold text-gray-800 mb-3">{monthLabel}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-1">
          {days.map((day) => {
            const dateStr = day.toISOString().split('T')[0]
            const status = markedDates[dateStr] ?? 'none'
            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => onDayPress(dateStr)}
                className={`w-9 h-12 rounded-xl items-center justify-center ${STATUS_STYLE[status]}`}
              >
                <Text className="text-xs text-gray-500">{day.toLocaleString('default', { weekday: 'narrow' })}</Text>
                <Text className="text-sm font-medium text-gray-800">{day.getDate()}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
