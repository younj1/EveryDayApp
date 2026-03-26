import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Settings, Heart } from 'lucide-react-native'
import { HabitList } from '@/components/me/HabitList'
import { useMoodStore } from '@/stores/moodStore'
import { useTaskStore } from '@/stores/taskStore'
import { useHabitStore } from '@/stores/habitStore'
import { FriendRequestBadge } from '@/components/friends/FriendRequestBadge'
import { SendPartnerImageModal } from '@/components/friends/SendPartnerImageModal'
import { useFriendStore } from '@/stores/friendStore'

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞' }, { value: 2, emoji: '😕' }, { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' }, { value: 5, emoji: '😄' },
]

export default function MeScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<'habits' | 'tasks' | 'mood' | 'journal'>('habits')
  const [newTask, setNewTask] = useState('')
  const [journalText, setJournalText] = useState('')
  const [newHabitName, setNewHabitName] = useState('')
  const { logMood, addJournalEntry, getTodayMood, journalEntries } = useMoodStore()
  const { tasks, addTask, toggleTask, removeTask } = useTaskStore()
  const { addHabit } = useHabitStore()
  const { loadPendingRequests } = useFriendStore()
  const [showSendPhoto, setShowSendPhoto] = useState(false)
  const todayMood = getTodayMood()

  useEffect(() => { loadPendingRequests() }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-6 pb-2">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">Me</Text>
          <View className="relative">
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Settings size={22} color="#6b7280" />
            </TouchableOpacity>
            <FriendRequestBadge />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['habits', 'tasks', 'mood', 'journal'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              className={`mr-3 px-4 py-2 rounded-full ${tab === t ? 'bg-primary' : 'bg-white border border-gray-200'}`}
              onPress={() => setTab(t)}
            >
              <Text className={tab === t ? 'text-white font-medium' : 'text-gray-600'}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {tab === 'habits' && (
          <View>
            <View className="flex-row mb-4">
              <TextInput
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 mr-2"
                placeholder="New habit name..."
                value={newHabitName}
                onChangeText={setNewHabitName}
              />
              <TouchableOpacity
                className="bg-primary rounded-xl px-4 items-center justify-center"
                onPress={() => {
                  if (newHabitName.trim()) {
                    addHabit({ name: newHabitName.trim(), frequency: 'daily' })
                    setNewHabitName('')
                  }
                }}
              >
                <Text className="text-white font-bold text-lg">+</Text>
              </TouchableOpacity>
            </View>
            <HabitList />
          </View>
        )}

        {tab === 'tasks' && (
          <View>
            <View className="flex-row mb-4">
              <TextInput
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 mr-2"
                placeholder="Add a task..."
                value={newTask}
                onChangeText={setNewTask}
                onSubmitEditing={() => { if (newTask.trim()) { addTask(newTask.trim()); setNewTask('') } }}
                returnKeyType="done"
              />
              <TouchableOpacity
                className="bg-primary rounded-xl px-4 items-center justify-center"
                onPress={() => { if (newTask.trim()) { addTask(newTask.trim()); setNewTask('') } }}
              >
                <Text className="text-white font-bold text-lg">+</Text>
              </TouchableOpacity>
            </View>
            {tasks.length === 0 && <Text className="text-gray-400 text-center py-8">No tasks yet</Text>}
            {tasks.map((task) => (
              <View key={task.id} className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-2">
                <TouchableOpacity
                  className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${task.completed ? 'bg-primary border-primary' : 'border-gray-300'}`}
                  onPress={() => toggleTask(task.id)}
                >
                  {task.completed && <Text className="text-white text-xs">✓</Text>}
                </TouchableOpacity>
                <Text className={`flex-1 ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</Text>
                <TouchableOpacity onPress={() => removeTask(task.id)}>
                  <Text className="text-red-400 text-xs px-1">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {tab === 'mood' && (
          <View>
            <Text className="font-medium text-gray-700 mb-4">How are you feeling today?</Text>
            <View className="flex-row justify-around mb-6">
              {MOOD_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  className={`w-14 h-14 rounded-full items-center justify-center ${todayMood?.mood === opt.value ? 'bg-primary' : 'bg-white border border-gray-200'}`}
                  onPress={() => logMood(opt.value)}
                >
                  <Text className="text-2xl">{opt.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {todayMood && (
              <View className="bg-white rounded-xl p-4 items-center">
                <Text className="text-gray-600">Today you feel {todayMood.emoji} ({todayMood.mood}/5)</Text>
              </View>
            )}
          </View>
        )}

        {tab === 'journal' && (
          <View>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3 min-h-[120px]"
              placeholder="Write your thoughts..."
              value={journalText}
              onChangeText={setJournalText}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              className="bg-primary rounded-xl py-3 items-center mb-6"
              onPress={() => {
                if (journalText.trim()) {
                  addJournalEntry(journalText.trim())
                  setJournalText('')
                }
              }}
            >
              <Text className="text-white font-semibold">Save Entry</Text>
            </TouchableOpacity>
            {journalEntries.slice().reverse().map((entry) => (
              <View key={entry.id} className="bg-white rounded-xl p-4 mb-2">
                <Text className="text-xs text-gray-400 mb-1">{entry.date}</Text>
                <Text className="text-gray-700">{entry.content}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="h-16" />
      </ScrollView>
      <TouchableOpacity
        onPress={() => setShowSendPhoto(true)}
        className="absolute bottom-6 right-4 bg-pink-500 rounded-full w-14 h-14 items-center justify-center shadow-lg"
      >
        <Heart size={24} color="white" fill="white" />
      </TouchableOpacity>
      <SendPartnerImageModal visible={showSendPhoto} onClose={() => setShowSendPhoto(false)} />
    </SafeAreaView>
  )
}
