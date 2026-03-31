import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { useFitnessStore } from '@/stores/fitnessStore'
import { supabase } from '@/lib/supabase'

const STATS_CONFIG = [
  { key: 'steps' as const, label: 'Steps', format: (v: number) => v.toLocaleString() },
  { key: 'heartRate' as const, label: 'Heart Rate', format: (v: number) => `${v} bpm` },
  { key: 'caloriesBurned' as const, label: 'Calories', format: (v: number) => `${v} kcal` },
  { key: 'activeMinutes' as const, label: 'Active Min', format: (v: number) => `${v}m` },
  { key: 'sleepHours' as const, label: 'Sleep', format: (v: number) => `${v.toFixed(1)}h` },
  { key: 'stress' as const, label: 'Stress', format: (v: number) => v.toString() },
  { key: 'bodyBattery' as const, label: 'Body Battery', format: (v: number) => v.toString() },
]

export default function FitnessScreen() {
  const { todayStats, setTodayStats, setLastSyncAt, lastSyncAt } = useFitnessStore()
  const [isSyncing, setIsSyncing] = useState(false)

  const syncGarmin = async () => {
    setIsSyncing(true)
    try {
      const { error: syncError } = await supabase.functions.invoke('garmin-sync')
      if (syncError) throw new Error(syncError.message)

      const today = new Date().toISOString().split('T')[0]
      const { data, error: fetchError } = await supabase
        .from('garmin_syncs')
        .select('*')
        .eq('date', today)
        .single()

      if (fetchError) throw new Error(fetchError.message)

      if (data) {
        setTodayStats({
          steps: data.steps,
          heartRate: data.heart_rate,
          caloriesBurned: data.calories_burned,
          activeMinutes: data.active_minutes,
          sleepHours: data.sleep_hours,
          stress: data.stress,
          bodyBattery: data.body_battery,
        })
        setLastSyncAt(Date.now())
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      Alert.alert('Sync failed', message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900">Fitness</Text>
          {lastSyncAt && (
            <Text className="text-xs text-gray-400">
              Synced {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {!todayStats ? (
          <View className="items-center py-16 px-8 mb-6">
            <Text className="text-4xl mb-3">🏃</Text>
            <Text className="text-lg font-semibold text-gray-700 mb-1">No fitness data yet</Text>
            <Text className="text-sm text-gray-400 text-center">Sync your Garmin watch to see today's stats</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-3 mb-6">
            {STATS_CONFIG.map(({ key, label, format }) => {
              const val = todayStats[key]
              return (
                <View key={label} className="bg-white rounded-2xl p-4 w-[47%]">
                  <Text className="text-xs text-gray-500">{label}</Text>
                  <Text className="text-xl font-bold text-gray-900 mt-1">
                    {val != null ? format(val) : '—'}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        <TouchableOpacity
          className="bg-primary rounded-xl py-4 items-center flex-row justify-center gap-2"
          onPress={syncGarmin}
          disabled={isSyncing}
        >
          {isSyncing && <ActivityIndicator color="white" size="small" />}
          <Text className="text-white font-semibold">{isSyncing ? 'Syncing...' : 'Sync Garmin Now'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
