export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal'

/**
 * Returns rolling average of last 3 cycle lengths, defaulting to 28.
 */
export function getAverageCycleLength(cycleLengths: number[]): number {
  if (cycleLengths.length === 0) return 28
  const last3 = cycleLengths.slice(-3)
  return Math.round(last3.reduce((a, b) => a + b, 0) / last3.length)
}

/**
 * Add N days to a YYYY-MM-DD date string. Returns YYYY-MM-DD.
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

/**
 * Predict next period start date.
 */
export function predictNextPeriod(lastStartDate: string, avgCycleLength: number): string {
  return addDays(lastStartDate, avgCycleLength)
}

/**
 * Predict ovulation day (cycle_length - 14 days after start).
 */
export function getOvulationDay(cycleStartDate: string, cycleLength: number): string {
  return addDays(cycleStartDate, cycleLength - 14)
}

/**
 * Fertile window: 3 days before ovulation to 1 day after (5 days total).
 */
export function getFertileWindow(cycleStartDate: string, cycleLength: number): { start: string; end: string } {
  const ovulationDay = cycleLength - 14
  return {
    start: addDays(cycleStartDate, ovulationDay - 3),
    end: addDays(cycleStartDate, ovulationDay + 1),
  }
}

/**
 * Returns the current cycle phase based on day of cycle.
 * dayOfCycle is 1-indexed (day 1 = first day of period).
 */
export function getCyclePhase(dayOfCycle: number, periodLength: number, cycleLength: number): CyclePhase {
  if (dayOfCycle <= periodLength) return 'menstruation'
  const ovulationDay = cycleLength - 14
  if (dayOfCycle >= ovulationDay - 1 && dayOfCycle <= ovulationDay + 1) return 'ovulation'
  if (dayOfCycle > ovulationDay) return 'luteal'
  return 'follicular'
}

/**
 * Rule-based insights from cycle and log history.
 * cycles: array of { startDate, cycleLength } (most recent last)
 * logs: array of { date, symptoms, mood }
 */
export function computeInsights(
  cycles: Array<{ startDate: string; cycleLength?: number | null }>,
  logs: Array<{ date: string; symptoms?: string | null; mood?: string | null }>
): string[] {
  const insights: string[] = []
  if (cycles.length < 2) return insights

  const lengths = cycles.map((c) => c.cycleLength).filter((l): l is number => l != null)
  if (lengths.length >= 2) {
    const avg = getAverageCycleLength(lengths)
    insights.push(`Your cycle is typically ${avg} days long.`)

    const min = Math.min(...lengths)
    const max = Math.max(...lengths)
    if (max - min >= 5) {
      insights.push(`Your cycle varies between ${min} and ${max} days.`)
    }
  }

  // Symptom patterns: find symptoms that appear in >50% of logged days
  if (logs.length >= 6) {
    const symptomCounts: Record<string, number> = {}
    logs.forEach((log) => {
      if (!log.symptoms) return
      try {
        const symptoms: string[] = JSON.parse(log.symptoms)
        symptoms.forEach((s) => { symptomCounts[s] = (symptomCounts[s] ?? 0) + 1 })
      } catch {}
    })
    const threshold = Math.ceil(logs.length * 0.5)
    const common = Object.entries(symptomCounts)
      .filter(([, count]) => count >= threshold)
      .map(([s]) => s)
    if (common.length > 0) {
      insights.push(`You commonly experience: ${common.join(', ')}.`)
    }
  }

  return insights
}
