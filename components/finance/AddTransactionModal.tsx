import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useState } from 'react'
import { useFinanceStore } from '@/stores/financeStore'

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other']
const SUBSCRIPTION_CATEGORIES = ['Streaming', 'Software', 'Gym', 'News', 'Cloud', 'Other']
const REPEAT_CATEGORIES = ['Rent', 'Mortgage', 'Loan', 'Insurance', 'Utilities', 'Other']

interface Props { visible: boolean; onClose: () => void }

export function AddTransactionModal({ visible, onClose }: Props) {
  const [type, setType] = useState<'income' | 'expense' | 'subscription' | 'repeat'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [merchant, setMerchant] = useState('')
  const addTransaction = useFinanceStore((s) => s.addTransaction)

  const resetForm = () => {
    setAmount('')
    setMerchant('')
    setType('expense')
    setCategory('Food')
  }

  const handleSave = () => {
    const parsed = parseFloat(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    addTransaction({
      type,
      amount: parsed,
      category,
      ...(merchant.trim() ? { merchant: merchant.trim() } : {}),
      date: Date.now(),
      source: 'manual',
    })
    resetForm()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { resetForm(); onClose() }}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} onPress={() => { resetForm(); onClose() }} />
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.titleRow}>
            <Text style={s.title}>Add Transaction</Text>
            <TouchableOpacity onPress={() => { resetForm(); onClose() }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={s.typeRow}>
            {(['expense', 'income', 'subscription', 'repeat'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.typeBtn, type === t && s.typeBtnActive]}
                onPress={() => {
                  setType(t)
                  setCategory(t === 'expense' ? 'Food' : t === 'income' ? 'Salary' : t === 'subscription' ? 'Streaming' : 'Rent')
                }}
              >
                <Text style={[s.typeBtnText, type === t && s.typeBtnTextActive]}>
                  {t === 'repeat' ? 'Repeat' : t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={s.input}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={s.input}
            placeholder="Merchant (optional)"
            value={merchant}
            onChangeText={setMerchant}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoriesScroll}>
            {(type === 'expense' ? EXPENSE_CATEGORIES : type === 'income' ? INCOME_CATEGORIES : type === 'subscription' ? SUBSCRIPTION_CATEGORIES : REPEAT_CATEGORIES).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.categoryChip, category === cat && s.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={category === cat ? s.categoryTextActive : s.categoryText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
            <Text style={s.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 },
  handle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  closeX: { fontSize: 18, color: '#9ca3af' },
  typeRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#6366f1', elevation: 2 },
  typeBtnText: { fontWeight: '500', color: '#9ca3af' },
  typeBtnTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 10, fontSize: 15 },
  categoriesScroll: { marginBottom: 12 },
  categoryChip: { marginRight: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb' },
  categoryChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  categoryText: { color: '#4b5563' },
  categoryTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
})
