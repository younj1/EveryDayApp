import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'

export interface Task {
  id: string
  title: string
  completed: boolean
  dueDate?: number
  createdAt: number
}

interface TaskState {
  tasks: Task[]
  addTask: (title: string, dueDate?: number) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (title, dueDate) =>
        set((state) => ({
          tasks: [...state.tasks, { id: uuidv4(), title, completed: false, dueDate, createdAt: Date.now() }],
        })),
      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
        })),
      removeTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
    }),
    { name: 'tasks', storage: createJSONStorage(() => AsyncStorage) }
  )
)
