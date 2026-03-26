import { usePeriodStore } from '@/stores/periodStore'

describe('periodStore', () => {
  beforeEach(() => usePeriodStore.setState({
    cycles: [],
    logs: [],
    settings: { averageCycleLength: 28, averagePeriodLength: 5, temperatureUnit: 'C', notificationsEnabled: true, symptomReminderTime: '21:00' },
    birthControlReminder: null,
  }))

  it('starts a new cycle', () => {
    usePeriodStore.getState().startCycle('2026-03-01')
    const { cycles } = usePeriodStore.getState()
    expect(cycles).toHaveLength(1)
    expect(cycles[0].startDate).toBe('2026-03-01')
    expect(cycles[0].endDate).toBeNull()
  })

  it('ends a cycle and calculates lengths', () => {
    usePeriodStore.getState().startCycle('2026-03-01')
    usePeriodStore.getState().endCycle(usePeriodStore.getState().cycles[0].id, '2026-03-06')
    const cycle = usePeriodStore.getState().cycles[0]
    expect(cycle.endDate).toBe('2026-03-06')
    expect(cycle.periodLength).toBe(6) // inclusive day count
  })

  it('saves a daily log', () => {
    usePeriodStore.getState().startCycle('2026-03-01')
    const cycleId = usePeriodStore.getState().cycles[0].id
    usePeriodStore.getState().saveLog({
      cycleEntryId: cycleId,
      date: '2026-03-02',
      flow: 'medium',
      symptoms: ['cramps'],
      mood: 'neutral',
      temperature: 36.5,
      discharge: null,
      notes: '',
    })
    const { logs } = usePeriodStore.getState()
    expect(logs).toHaveLength(1)
    expect(logs[0].flow).toBe('medium')
  })

  it('updates an existing log for the same date', () => {
    usePeriodStore.getState().startCycle('2026-03-01')
    const cycleId = usePeriodStore.getState().cycles[0].id
    usePeriodStore.getState().saveLog({ cycleEntryId: cycleId, date: '2026-03-02', flow: 'light', symptoms: [], mood: null, temperature: null, discharge: null, notes: '' })
    usePeriodStore.getState().saveLog({ cycleEntryId: cycleId, date: '2026-03-02', flow: 'heavy', symptoms: [], mood: null, temperature: null, discharge: null, notes: '' })
    expect(usePeriodStore.getState().logs).toHaveLength(1)
    expect(usePeriodStore.getState().logs[0].flow).toBe('heavy')
  })

  it('getLogForDate returns correct log', () => {
    usePeriodStore.getState().startCycle('2026-03-01')
    const cycleId = usePeriodStore.getState().cycles[0].id
    usePeriodStore.getState().saveLog({ cycleEntryId: cycleId, date: '2026-03-03', flow: 'spotting', symptoms: [], mood: null, temperature: null, discharge: null, notes: '' })
    expect(usePeriodStore.getState().getLogForDate('2026-03-03')?.flow).toBe('spotting')
    expect(usePeriodStore.getState().getLogForDate('2026-03-04')).toBeNull()
  })

  it('sets birth control reminder', () => {
    usePeriodStore.getState().setBirthControlReminder({ label: 'Pill', time: '09:00', message: 'Take your pill!', enabled: true })
    expect(usePeriodStore.getState().birthControlReminder?.label).toBe('Pill')
  })
})
