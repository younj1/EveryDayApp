import { View, Text, TouchableOpacity, TextInput, Switch } from 'react-native'
import { useState } from 'react'
import { usePeriodStore } from '@/stores/periodStore'

export function BirthControlCard() {
  const { birthControlReminder, setBirthControlReminder, toggleBirthControlReminder } = usePeriodStore()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(birthControlReminder?.label ?? 'Birth Control')
  const [time, setTime] = useState(birthControlReminder?.time ?? '08:00')
  const [message, setMessage] = useState(birthControlReminder?.message ?? 'Time to take your birth control!')

  const handleSave = () => {
    setBirthControlReminder({ label, time, message, enabled: true })
    setEditing(false)
  }

  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="font-semibold text-gray-800">Birth Control Reminder</Text>
        {birthControlReminder && (
          <Switch
            value={birthControlReminder.enabled}
            onValueChange={toggleBirthControlReminder}
            trackColor={{ true: '#6366f1' }}
          />
        )}
      </View>

      {!editing && birthControlReminder ? (
        <View>
          <Text className="text-gray-600">{birthControlReminder.label} · {birthControlReminder.time}</Text>
          <Text className="text-gray-400 text-sm mt-1">{birthControlReminder.message}</Text>
          <TouchableOpacity onPress={() => setEditing(true)} className="mt-3">
            <Text className="text-indigo-500 font-medium">Edit reminder</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text className="text-xs text-gray-500 uppercase mb-1">Label</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3"
            value={label}
            onChangeText={setLabel}
          />
          <Text className="text-xs text-gray-500 uppercase mb-1">Time (HH:MM)</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3"
            value={time}
            onChangeText={setTime}
            placeholder="08:00"
          />
          <Text className="text-xs text-gray-500 uppercase mb-1">Message</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4"
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity className="bg-primary rounded-xl py-3 items-center" onPress={handleSave}>
            <Text className="text-white font-semibold">Save Reminder</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
