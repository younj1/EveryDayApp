import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { useState } from 'react'
import { useFinanceStore } from '@/stores/financeStore'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other']

interface Props { visible: boolean; onClose: () => void }

export function AddTransactionModal({ visible, onClose }: Props) {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [merchant, setMerchant] = useState('')
  const addTransaction = useFinanceStore((s) => s.addTransaction)

  const handleSave = () => {
    if (!amount) return
    addTransaction({ type, amount: parseFloat(amount), category, merchant, date: Date.now(), source: 'manual' })
    setAmount('')
    setMerchant('')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white px-6 pt-8">
        <Text className="text-xl font-bold text-gray-900 mb-6">Add Transaction</Text>

        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              className={`flex-1 py-2 rounded-lg items-center ${type === t ? 'bg-white shadow' : ''}`}
              onPress={() => setType(t)}
            >
              <Text className={`font-medium ${type === t ? 'text-gray-900' : 'text-gray-400'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-2xl font-bold"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4"
          placeholder="Merchant (optional)"
          value={merchant}
          onChangeText={setMerchant}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              className={`mr-2 px-4 py-2 rounded-full border ${category === cat ? 'bg-primary border-primary' : 'border-gray-200'}`}
              onPress={() => setCategory(cat)}
            >
              <Text className={category === cat ? 'text-white' : 'text-gray-600'}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity className="bg-primary rounded-xl py-4 items-center" onPress={handleSave}>
          <Text className="text-white font-semibold">Save</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-3 items-center" onPress={onClose}>
          <Text className="text-gray-400">Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}
