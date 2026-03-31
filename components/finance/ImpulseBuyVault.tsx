import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useEffect } from 'react'
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
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  const items = useImpulseBuyStore((s) => s.items)
  const updateStatus = useImpulseBuyStore((s) => s.updateStatus)
  const snooze = useImpulseBuyStore((s) => s.snooze)

  const pending = items.filter((i) => i.status === 'pending')
  const skipped = items.filter((i) => i.status === 'skipped')
  const bought = items.filter((i) => i.status === 'bought')
  const totalSaved = skipped.reduce((sum, i) => sum + i.price, 0)

  if (items.length === 0) {
    return (
      <View className="items-center py-16 px-8">
        <Text className="text-4xl mb-3">🛑</Text>
        <Text className="text-lg font-semibold text-gray-700 mb-1">Impulse Vault is empty</Text>
        <Text className="text-sm text-gray-400 text-center">Tap + to add something you want to buy — then wait before deciding</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1">
      {totalSaved > 0 && (
        <View className="mx-4 mb-4 bg-green-50 rounded-xl p-4">
          <Text className="text-green-700 font-semibold">💰 Saved by skipping: ${totalSaved.toFixed(2)}</Text>
        </View>
      )}

      {pending.length > 0 && (
        <Text className="mx-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Waiting</Text>
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

      {skipped.length > 0 && (
        <>
          <Text className="mx-4 mt-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Skipped</Text>
          {skipped.map((item) => (
            <View key={item.id} className="mx-4 mb-2 bg-white rounded-xl px-4 py-3 flex-row justify-between items-center opacity-60">
              <Text className="text-gray-600 line-through">{item.itemName}</Text>
              <Text className="text-green-600 font-medium text-sm">saved ${item.price.toFixed(2)}</Text>
            </View>
          ))}
        </>
      )}

      {bought.length > 0 && (
        <>
          <Text className="mx-4 mt-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bought</Text>
          {bought.map((item) => (
            <View key={item.id} className="mx-4 mb-2 bg-white rounded-xl px-4 py-3 flex-row justify-between items-center opacity-60">
              <Text className="text-gray-600">{item.itemName}</Text>
              <Text className="text-gray-500 text-sm">${item.price.toFixed(2)}</Text>
            </View>
          ))}
        </>
      )}

      <View className="h-24" />
    </ScrollView>
  )
}
