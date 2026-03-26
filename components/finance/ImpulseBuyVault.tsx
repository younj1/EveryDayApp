import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useImpulseBuyStore } from '@/stores/impulseBuyStore'

function getCountdown(remindAt: number): string {
  const diff = remindAt - Date.now()
  if (diff <= 0) return 'Ready to decide!'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h remaining`
  return `${hours}h remaining`
}

export function ImpulseBuyVault() {
  const items = useImpulseBuyStore((s) => s.items)
  const updateStatus = useImpulseBuyStore((s) => s.updateStatus)
  const snooze = useImpulseBuyStore((s) => s.snooze)

  const pending = items.filter((i) => i.status === 'pending')
  const skipped = items.filter((i) => i.status === 'skipped')
  const totalSaved = skipped.reduce((sum, i) => sum + i.price, 0)

  if (pending.length === 0 && skipped.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-gray-400 text-sm">No impulse buys tracked yet</Text>
      </View>
    )
  }

  return (
    <ScrollView>
      {totalSaved > 0 && (
        <View className="mx-4 mb-4 bg-green-50 rounded-xl p-4">
          <Text className="text-green-700 font-semibold">💰 Saved by skipping: ${totalSaved.toFixed(2)}</Text>
        </View>
      )}
      {pending.map((item) => (
        <View key={item.id} className="mx-4 mb-3 bg-white rounded-xl p-4 shadow-sm">
          <View className="flex-row justify-between mb-1">
            <Text className="font-semibold text-gray-800">{item.itemName}</Text>
            <Text className="font-bold text-gray-900">${item.price.toFixed(2)}</Text>
          </View>
          <Text className="text-xs text-indigo-500 mb-3">{getCountdown(item.remindAt)}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 bg-green-100 rounded-lg py-2 items-center"
              onPress={() => updateStatus(item.id, 'bought')}
            >
              <Text className="text-green-700 font-medium text-sm">Buy it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-red-100 rounded-lg py-2 items-center"
              onPress={() => updateStatus(item.id, 'skipped')}
            >
              <Text className="text-red-600 font-medium text-sm">Skip it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-100 rounded-lg py-2 items-center"
              onPress={() => snooze(item.id, 7)}
            >
              <Text className="text-gray-600 font-medium text-sm">+7 days</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}
