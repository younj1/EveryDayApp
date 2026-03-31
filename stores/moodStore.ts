import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄']

export interface MoodLog {
  id: string
  mood: number  // 1-5
  emoji: string
  note?: string
  date: string  // YYYY-MM-DD
}

export interface JournalEntry {
  id: string
  content: string
  date: string
  createdAt: number
}

interface MoodState {
  moodLogs: MoodLog[]
  journalEntries: JournalEntry[]
  logMood: (mood: number, note?: string) => void
  addJournalEntry: (content: string) => void
  getTodayMood: () => MoodLog | null
}

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      moodLogs: [],
      journalEntries: [],
      logMood: (mood, note) => {
        const today = new Date().toISOString().split('T')[0]
        set((state) => ({
          moodLogs: [
            ...state.moodLogs.filter((m) => m.date !== today),
            { id: uuidv4(), mood, emoji: MOOD_EMOJIS[mood - 1], note, date: today },
          ],
        }))
      },
      addJournalEntry: (content) =>
        set((state) => ({
          journalEntries: [
            ...state.journalEntries,
            { id: uuidv4(), content, date: new Date().toISOString().split('T')[0], createdAt: Date.now() },
          ],
        })),
      getTodayMood: () => {
        const today = new Date().toISOString().split('T')[0]
        return get().moodLogs.find((m) => m.date === today) ?? null
      },
    }),
    { name: 'mood', storage: createJSONStorage(() => AsyncStorage) }
  )
)
