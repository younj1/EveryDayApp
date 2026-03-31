import { View, Text, TouchableOpacity, SectionList, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { Plus } from 'lucide-react-native'
import { useFinanceStore } from '@/stores/financeStore'
import { AddTransactionModal } from '@/components/finance/AddTransactionModal'
import { AddImpulseBuyModal } from '@/components/finance/AddImpulseBuyModal'
import { ImpulseBuyVault } from '@/components/finance/ImpulseBuyVault'
import type { Transaction } from '@/stores/financeStore'

function formatDateHeader(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function FinanceScreen() {
  const [tab, setTab] = useState<'transactions' | 'vault'>('transactions')
  const [showAdd, setShowAdd] = useState(false)
  const [showAddImpulse, setShowAddImpulse] = useState(false)
  const transactions = useFinanceStore((s) => s.transactions)
  const removeTransaction = useFinanceStore((s) => s.removeTransaction)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense' || t.type === 'subscription' || t.type === 'repeat').reduce((sum, t) => sum + t.amount, 0)

  // Group by date descending
  const grouped = transactions
    .slice()
    .sort((a, b) => b.date - a.date)
    .reduce<Record<string, Transaction[]>>((acc, t) => {
      const d = new Date(t.date).toISOString().split('T')[0]
      ;(acc[d] = acc[d] || []).push(t)
      return acc
    }, {})
  const sections = Object.entries(grouped).map(([date, data]) => ({ title: date, data }))

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-6 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Finance</Text>
        <View className="flex-row gap-3 mt-4 mb-4">
          <View className="flex-1 bg-green-50 rounded-2xl p-4">
            <Text className="text-xs text-gray-500">Income</Text>
            <Text className="text-lg font-bold text-green-600">${totalIncome.toFixed(2)}</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-2xl p-4">
            <Text className="text-xs text-gray-500">Expenses</Text>
            <Text className="text-lg font-bold text-red-500">${totalExpenses.toFixed(2)}</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          {(['transactions', 'vault'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              className={`px-4 py-2 rounded-full ${tab === t ? 'bg-primary' : 'bg-white border border-gray-200'}`}
              onPress={() => setTab(t)}
            >
              <Text className={tab === t ? 'text-white font-medium text-sm' : 'text-gray-600 text-sm'}>
                {t === 'transactions' ? 'Transactions' : '🛑 Impulse Vault'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === 'transactions' ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{formatDateHeader(section.title)}</Text>
          )}
          renderItem={({ item }) => (
            <View className="mx-4 mb-2 bg-white rounded-xl p-4 flex-row justify-between items-center">
              <View className="flex-row items-center gap-3 flex-1">
                <View style={[styles.typeBadge, styles[item.type]]}>
                  <Text style={styles.typeBadgeText}>
                    {item.type === 'subscription' ? 'SUB' : item.type === 'repeat' ? 'RPT' : item.type === 'income' ? 'INC' : 'EXP'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800" numberOfLines={1}>{item.merchant || item.category}</Text>
                  <Text className="text-xs text-gray-400">{item.category}</Text>
                </View>
              </View>
              <Text className={`font-semibold ml-2 ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => removeTransaction(item.id)} className="ml-3 p-1">
                <Text className="text-gray-300 text-sm">✕</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-16 px-8">
              <Text className="text-4xl mb-3">💸</Text>
              <Text className="text-lg font-semibold text-gray-700 mb-1">No transactions yet</Text>
              <Text className="text-sm text-gray-400 text-center">Tap the + button to add your first income or expense</Text>
            </View>
          }
        />
      ) : (
        <ImpulseBuyVault />
      )}

      <TouchableOpacity
        className="absolute bottom-8 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => tab === 'vault' ? setShowAddImpulse(true) : setShowAdd(true)}
      >
        <Plus color="white" size={24} />
      </TouchableOpacity>

      <AddTransactionModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <AddImpulseBuyModal visible={showAddImpulse} onClose={() => setShowAddImpulse(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 12, fontWeight: '600', color: '#6b7280', backgroundColor: '#f9fafb' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  income: { backgroundColor: '#16a34a' },
  expense: { backgroundColor: '#ef4444' },
  subscription: { backgroundColor: '#8b5cf6' },
  repeat: { backgroundColor: '#f59e0b' },
})
