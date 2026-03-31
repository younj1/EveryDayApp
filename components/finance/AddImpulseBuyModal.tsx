import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
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

  const handleClose = () => {
    setItemName('')
    setPrice('')
    setWaitDays(7)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={s.container}>
        <Text style={s.title}>Add Impulse Buy</Text>
        <Text style={s.subtitle}>Set a waiting period before deciding to buy</Text>

        <TextInput
          style={s.input}
          placeholder="What do you want to buy?"
          value={itemName}
          onChangeText={setItemName}
        />
        <TextInput
          style={s.input}
          placeholder="Price ($)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        <Text style={s.label}>Wait how long?</Text>
        <View style={s.waitRow}>
          {WAIT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.days}
              style={[s.waitChip, waitDays === opt.days && s.waitChipActive]}
              onPress={() => setWaitDays(opt.days)}
            >
              <Text style={waitDays === opt.days ? s.waitChipTextActive : s.waitChipText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>Start Waiting Period</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 32 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, fontSize: 16 },
  label: { fontWeight: '500', color: '#374151', marginBottom: 12 },
  waitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  waitChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb' },
  waitChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  waitChipText: { color: '#4b5563' },
  waitChipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { marginTop: 12, alignItems: 'center' },
  cancelBtnText: { color: '#9ca3af' },
})
