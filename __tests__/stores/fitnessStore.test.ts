import { useFitnessStore } from '@/stores/fitnessStore'

describe('fitnessStore', () => {
  beforeEach(() => {
    useFitnessStore.setState({ todayStats: null, lastSyncAt: null })
  })

  it('starts with no data', () => {
    expect(useFitnessStore.getState().todayStats).toBeNull()
  })

  it('sets today stats', () => {
    useFitnessStore.getState().setTodayStats({ steps: 8000, heartRate: 72, caloriesBurned: 400 })
    expect(useFitnessStore.getState().todayStats?.steps).toBe(8000)
  })
})
