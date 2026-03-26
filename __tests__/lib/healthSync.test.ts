import { normalizeHealthData } from '@/lib/healthSync'

describe('normalizeHealthData', () => {
  it('normalizes HealthKit step data', () => {
    const raw = { value: 8432, startDate: '2026-03-24', endDate: '2026-03-24' }
    const result = normalizeHealthData('steps', raw)
    expect(result.value).toBe(8432)
    expect(result.type).toBe('steps')
  })

  it('normalizes Health Connect step data (uses count field)', () => {
    const raw = { count: 5000, startTime: '2026-03-24T00:00:00Z' }
    const result = normalizeHealthData('steps', raw)
    expect(result.value).toBe(5000)
    expect(result.type).toBe('steps')
  })

  it('falls back to 0 for unknown fields', () => {
    const result = normalizeHealthData('steps', {})
    expect(result.value).toBe(0)
  })

  it('uses date from startDate or startTime', () => {
    const r1 = normalizeHealthData('heartRate', { value: 75, startDate: '2026-03-24' })
    expect(r1.date).toBe('2026-03-24')
    const r2 = normalizeHealthData('heartRate', { value: 75, startTime: '2026-03-24T10:00:00Z' })
    expect(r2.date).toBe('2026-03-24T10:00:00Z')
  })
})
