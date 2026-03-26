import { useHabitStore } from '@/stores/habitStore'

describe('habitStore', () => {
  beforeEach(() => useHabitStore.setState({ habits: [], logs: [] }))

  it('calculates streak correctly', () => {
    const store = useHabitStore.getState()
    store.addHabit({ name: 'Exercise', icon: '🏋️', frequency: 'daily' })
    const habit = useHabitStore.getState().habits[0]
    const today = new Date()
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      store.logHabit(habit.id, d.toISOString().split('T')[0])
    }
    expect(useHabitStore.getState().getStreak(habit.id)).toBe(3)
  })

  it('does not double-log the same day', () => {
    useHabitStore.getState().addHabit({ name: 'Read', icon: '📚', frequency: 'daily' })
    const habit = useHabitStore.getState().habits[0]
    const today = new Date().toISOString().split('T')[0]
    useHabitStore.getState().logHabit(habit.id, today)
    useHabitStore.getState().logHabit(habit.id, today)
    expect(useHabitStore.getState().logs.length).toBe(1)
  })

  it('unlog removes the entry', () => {
    useHabitStore.getState().addHabit({ name: 'Water', icon: '💧', frequency: 'daily' })
    const habit = useHabitStore.getState().habits[0]
    const today = new Date().toISOString().split('T')[0]
    useHabitStore.getState().logHabit(habit.id, today)
    useHabitStore.getState().unlogHabit(habit.id, today)
    expect(useHabitStore.getState().isCompleted(habit.id, today)).toBe(false)
  })
})
