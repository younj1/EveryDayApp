import {
  predictNextPeriod,
  getOvulationDay,
  getFertileWindow,
  getCyclePhase,
  getAverageCycleLength,
  computeInsights,
} from '@/lib/cycleCalculations'

describe('cycleCalculations', () => {
  describe('getAverageCycleLength', () => {
    it('returns default 28 when no history', () => {
      expect(getAverageCycleLength([])).toBe(28)
    })

    it('averages last 3 cycle lengths', () => {
      const lengths = [30, 28, 26, 32] // should use 28, 26, 32 → avg 28.67 → round to 29
      expect(getAverageCycleLength(lengths)).toBe(29)
    })

    it('uses all cycles when fewer than 3', () => {
      expect(getAverageCycleLength([30, 26])).toBe(28)
    })
  })

  describe('predictNextPeriod', () => {
    it('predicts next period from last start date and average cycle', () => {
      const result = predictNextPeriod('2026-03-01', 28)
      expect(result).toBe('2026-03-29')
    })

    it('handles month boundary', () => {
      const result = predictNextPeriod('2026-01-20', 28)
      expect(result).toBe('2026-02-17')
    })
  })

  describe('getOvulationDay', () => {
    it('returns cycle_length - 14', () => {
      expect(getOvulationDay('2026-03-01', 28)).toBe('2026-03-15')
    })
  })

  describe('getFertileWindow', () => {
    it('returns 5-day window around ovulation', () => {
      const { start, end } = getFertileWindow('2026-03-01', 28)
      expect(start).toBe('2026-03-12')
      expect(end).toBe('2026-03-16')
    })
  })

  describe('getCyclePhase', () => {
    it('returns menstruation during period', () => {
      expect(getCyclePhase(2, 5, 28)).toBe('menstruation')
    })

    it('returns follicular after period ends', () => {
      expect(getCyclePhase(8, 5, 28)).toBe('follicular')
    })

    it('returns ovulation near ovulation day', () => {
      expect(getCyclePhase(14, 5, 28)).toBe('ovulation')
    })

    it('returns luteal after ovulation', () => {
      expect(getCyclePhase(20, 5, 28)).toBe('luteal')
    })
  })

  describe('computeInsights', () => {
    it('returns empty array when no data', () => {
      expect(computeInsights([], [])).toEqual([])
    })

    it('reports average cycle length', () => {
      const cycles = [
        { startDate: '2026-01-01', cycleLength: 28 },
        { startDate: '2026-01-29', cycleLength: 29 },
        { startDate: '2026-02-27', cycleLength: 28 },
      ]
      const insights = computeInsights(cycles, [])
      expect(insights.some((i) => i.includes('28') || i.includes('29'))).toBe(true)
    })
  })
})
