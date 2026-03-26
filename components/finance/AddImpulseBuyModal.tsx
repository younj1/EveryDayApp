import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import { useImpulseBuyStore } from '@/stores/impulseBuyStore'

const WAIT_OPTIONS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
]

interface Props { visible: boolean; onClose: () => void }

export function AddImpulseBuyModal({ visible, onClose }: Props) {
  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [waitDays, setWaitDays] = useState(7)
  const addImpulseBuy = useImpulseBuyStore((s) => s.addImpulseBuy)

  const handleSave = () => {
    const parsed = parseFloat(price)
    if (!itemName.trim() || !Number.isFinite(parsed) || parsed <= 0) return
    addImpulseBuy({ itemName: itemName.trim(), price: parsed, waitDays })
    setItemName('')
    setPrice('')
    setWaitDays(7)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white px-6 pt-8">
        <Text className="text-xl font-bold text-gray-900 mb-2">Add Impulse Buy</Text>
        <Text className="text-gray-500 text-sm mb-6">Set a waiting period before deciding to buy</Text>

        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4"
          placeholder="What do you want to buy?"
          value={itemName}
          onChangeText={setItemName}
        />
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-6"
          placeholder="Price ($)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        <Text className="font-medium text-gray-700 mb-3">Wait how long?</Text>
        <View className="flex-row flex-wrap gap-2 mb-8">
          {WAIT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.days}
              className={`px-4 py-2 rounded-full border ${waitDays === opt.days ? 'bg-primary border-primary' : 'border-gray-200'}`}
              onPress={() => setWaitDays(opt.days)}
            >
              <Text className={waitDays === opt.days ? 'text-white' : 'text-gray-600'}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity className="bg-primary rounded-xl py-4 items-center" onPress={handleSave}>
          <Text className="text-white font-semibold">Start Waiting Period</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-3 items-center" onPress={onClose}>
          <Text className="text-gray-400">Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}
