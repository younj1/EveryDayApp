import { View, Text, TouchableOpacity, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { Plus } from 'lucide-react-native'
import { useFinanceStore } from '@/stores/financeStore'
import { AddTransactionModal } from '@/components/finance/AddTransactionModal'

export default function FinanceScreen() {
  const [showAdd, setShowAdd] = useState(false)
  const transactions = useFinanceStore((s) => s.transactions)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-6 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Finance</Text>
        <View className="flex-row gap-3 mt-4">
          <View className="flex-1 bg-green-50 rounded-2xl p-4">
            <Text className="text-xs text-gray-500">Income</Text>
            <Text className="text-lg font-bold text-green-600">${totalIncome.toFixed(2)}</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-2xl p-4">
            <Text className="text-xs text-gray-500">Expenses</Text>
            <Text className="text-lg font-bold text-red-500">${totalExpenses.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mx-4 mb-2 bg-white rounded-xl p-4 flex-row justify-between">
            <View>
              <Text className="font-medium text-gray-800">{item.merchant || item.category}</Text>
              <Text className="text-xs text-gray-400">{item.category}</Text>
            </View>
            <Text className={`font-semibold ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
              {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-gray-400">No transactions yet</Text>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute bottom-8 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => setShowAdd(true)}
      >
        <Plus color="white" size={24} />
      </TouchableOpacity>

      <AddTransactionModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </SafeAreaView>
  )
}
