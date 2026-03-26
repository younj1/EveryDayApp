import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { usePeriodStore } from '@/stores/periodStore'
import { CycleStatusCard } from '@/components/period/CycleStatusCard'
import { CycleCalendar, DayStatus } from '@/components/period/CycleCalendar'
import { TodayLogForm } from '@/components/period/TodayLogForm'
import { CycleStats } from '@/components/period/CycleStats'
import { CycleInsights } from '@/components/period/CycleInsights'
import { BirthControlCard } from '@/components/period/BirthControlCard'
import {
  getCyclePhase,
  predictNextPeriod,
  getOvulationDay,
  getFertileWindow,
  computeInsights,
  CyclePhase,
} from '@/lib/cycleCalculations'

const today = new Date().toISOString().split('T')[0]

export default function PeriodScreen() {
  const { cycles, logs, settings, startCycle, endCycle } = usePeriodStore()
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const activeCycle = cycles.findLast((c) => c.endDate === null) ?? null

  // Day of cycle
  let dayOfCycle = 1
  let phase: CyclePhase = 'follicular'
  let daysUntilNext: number | null = null

  if (activeCycle) {
    const start = new Date(activeCycle.startDate)
    const now = new Date(today)
    dayOfCycle = Math.round((now.getTime() - start.getTime()) / 86400000) + 1
    phase = getCyclePhase(dayOfCycle, settings.averagePeriodLength, settings.averageCycleLength)

    const nextDate = predictNextPeriod(activeCycle.startDate, settings.averageCycleLength)
    const diff = Math.round((new Date(nextDate).getTime() - now.getTime()) / 86400000)
    daysUntilNext = diff >= 0 ? diff : 0
  }

  // Build marked dates for calendar
  const markedDates: Record<string, DayStatus> = {}

  logs.forEach((log) => {
    if (log.flow && log.flow !== 'none') markedDates[log.date] = 'period'
  })

  if (activeCycle) {
    const nextPeriod = predictNextPeriod(activeCycle.startDate, settings.averageCycleLength)
    const ovDay = getOvulationDay(activeCycle.startDate, settings.averageCycleLength)
    const fertile = getFertileWindow(activeCycle.startDate, settings.averageCycleLength)

    for (let i = 0; i < settings.averagePeriodLength; i++) {
      const d = new Date(nextPeriod)
      d.setDate(d.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      if (!markedDates[ds]) markedDates[ds] = 'predicted'
    }

    if (!markedDates[ovDay]) markedDates[ovDay] = 'ovulation'

    const fertileStart = new Date(fertile.start)
    const fertileEnd = new Date(fertile.end)
    const cur = new Date(fertileStart)
    while (cur <= fertileEnd) {
      const ds = cur.toISOString().split('T')[0]
      if (!markedDates[ds]) markedDates[ds] = 'fertile'
      cur.setDate(cur.getDate() + 1)
    }
  }

  markedDates[today] = markedDates[today] === 'period' ? 'period' : 'today'

  // Insights
  const insights = computeInsights(
    cycles,
    logs.map((l) => ({ date: l.date, symptoms: l.symptoms ? JSON.stringify(l.symptoms) : null, mood: l.mood }))
  )

  // Log streak
  let logStreak = 0
  const d = new Date(today)
  while (logs.find((l) => l.date === d.toISOString().split('T')[0])) {
    logStreak++
    d.setDate(d.getDate() - 1)
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-6 pb-2">
        <Text className="text-2xl font-bold text-gray-900">Period Tracking</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <CycleStatusCard phase={phase} dayOfCycle={dayOfCycle} daysUntilNextPeriod={daysUntilNext} />

        <View className="flex-row mb-4 gap-3">
          {!activeCycle ? (
            <TouchableOpacity
              className="flex-1 bg-red-500 rounded-xl py-3 items-center"
              onPress={() => startCycle(today)}
            >
              <Text className="text-white font-semibold">Start Period</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-1 bg-gray-200 rounded-xl py-3 items-center"
              onPress={() => endCycle(activeCycle.id, today)}
            >
              <Text className="text-gray-700 font-semibold">End Period</Text>
            </TouchableOpacity>
          )}
        </View>

        <CycleCalendar
          month={calendarMonth}
          markedDates={markedDates}
          onDayPress={() => {}}
        />

        {activeCycle && <TodayLogForm cycleId={activeCycle.id} date={today} />}

        <CycleStats cycles={cycles} logStreak={logStreak} />

        <CycleInsights insights={insights} />

        <BirthControlCard />

        <View className="h-16" />
      </ScrollView>
    </SafeAreaView>
  )
}
