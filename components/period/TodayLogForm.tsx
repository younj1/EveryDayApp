import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native'
import { useState } from 'react'
import { usePeriodStore } from '@/stores/periodStore'

const FLOW_OPTIONS = ['none', 'spotting', 'light', 'medium', 'heavy'] as const
const SYMPTOM_OPTIONS = ['cramps', 'bloating', 'headache', 'fatigue', 'acne', 'backache', 'nausea', 'tender_breasts'] as const
const MOOD_OPTIONS = ['happy', 'sad', 'anxious', 'irritable', 'energetic', 'tired', 'neutral'] as const
const DISCHARGE_OPTIONS = ['none', 'dry', 'sticky', 'creamy', 'watery', 'egg_white'] as const

interface Props {
  cycleId: string
  date: string
}

export function TodayLogForm({ cycleId, date }: Props) {
  const { saveLog, getLogForDate } = usePeriodStore()
  const existing = getLogForDate(date)

  const [flow, setFlow] = useState<string>(existing?.flow ?? 'none')
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? [])
  const [mood, setMood] = useState<string | null>(existing?.mood ?? null)
  const [temperature, setTemperature] = useState(existing?.temperature?.toString() ?? '')
  const [discharge, setDischarge] = useState<string | null>(existing?.discharge ?? null)
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])

  const handleSave = () => {
    saveLog({
      cycleEntryId: cycleId,
      date,
      flow,
      symptoms,
      mood,
      temperature: temperature ? parseFloat(temperature) : null,
      discharge,
      notes,
    })
  }

  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <Text className="font-semibold text-gray-800 mb-3">Today's Log</Text>

      <Text className="text-xs text-gray-500 uppercase mb-2">Flow</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {FLOW_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFlow(f)}
            className={`mr-2 px-3 py-1.5 rounded-full border ${flow === f ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
          >
            <Text className={`text-sm capitalize ${flow === f ? 'text-white' : 'text-gray-600'}`}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="text-xs text-gray-500 uppercase mb-2">Symptoms</Text>
      <View className="flex-row flex-wrap mb-3">
        {SYMPTOM_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => toggleSymptom(s)}
            className={`mr-2 mb-2 px-3 py-1.5 rounded-full border ${symptoms.includes(s) ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
          >
            <Text className={`text-sm capitalize ${symptoms.includes(s) ? 'text-white' : 'text-gray-600'}`}>
              {s.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-xs text-gray-500 uppercase mb-2">Mood</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {MOOD_OPTIONS.map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMood(mood === m ? null : m)}
            className={`mr-2 px-3 py-1.5 rounded-full border ${mood === m ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
          >
            <Text className={`text-sm capitalize ${mood === m ? 'text-white' : 'text-gray-600'}`}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="text-xs text-gray-500 uppercase mb-2">Temperature</Text>
      <TextInput
        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3"
        placeholder="e.g. 36.5"
        value={temperature}
        onChangeText={setTemperature}
        keyboardType="decimal-pad"
      />

      <Text className="text-xs text-gray-500 uppercase mb-2">Discharge</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {DISCHARGE_OPTIONS.map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDischarge(discharge === d ? null : d)}
            className={`mr-2 px-3 py-1.5 rounded-full border ${discharge === d ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
          >
            <Text className={`text-sm capitalize ${discharge === d ? 'text-white' : 'text-gray-600'}`}>
              {d.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="text-xs text-gray-500 uppercase mb-2">Notes</Text>
      <TextInput
        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4 min-h-[60px]"
        placeholder="Any notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity className="bg-primary rounded-xl py-3 items-center" onPress={handleSave}>
        <Text className="text-white font-semibold">Save</Text>
      </TouchableOpacity>
    </View>
  )
}
