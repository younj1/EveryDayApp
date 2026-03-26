# Period Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full-featured period and cycle tracker as a dedicated 6th tab with logging, predictions, stats, insights, and notifications including a custom birth control reminder.

**Architecture:** Local-first with WatermelonDB (SQLite) for all period data, synced to Supabase. Cycle predictions computed in a pure `lib/cycleCalculations.ts` module from stored `CycleEntry` history. Notifications scheduled locally via `expo-notifications`.

**Tech Stack:** React Native + Expo, WatermelonDB, Zustand, NativeWind (Tailwind), expo-notifications, expo-router, Jest + jest-expo for tests.

---

## Task 1: WatermelonDB Schema — Add period tables

**Files:**
- Modify: `db/schema.ts`

The schema version must be incremented whenever tables are added. WatermelonDB will run a migration if the version changes. Since there are no migrations set up yet (only a single version), increment `version` from `1` to `2` and add the new tables. WatermelonDB will drop and recreate the DB on version bump in development — this is expected.

**Step 1: Add tables to schema**

In `db/schema.ts`, change `version: 1` to `version: 2` and add four new `tableSchema` entries inside the `tables` array after the existing ones:

```typescript
tableSchema({
  name: 'cycle_entries',
  columns: [
    { name: 'start_date', type: 'string' },          // 'YYYY-MM-DD'
    { name: 'end_date', type: 'string', isOptional: true },
    { name: 'cycle_length', type: 'number', isOptional: true },
    { name: 'period_length', type: 'number', isOptional: true },
    { name: 'notes', type: 'string', isOptional: true },
    { name: 'created_at', type: 'number' },
  ],
}),
tableSchema({
  name: 'period_logs',
  columns: [
    { name: 'cycle_entry_id', type: 'string', isIndexed: true },
    { name: 'date', type: 'string' },                 // 'YYYY-MM-DD'
    { name: 'flow', type: 'string', isOptional: true },
    { name: 'symptoms', type: 'string', isOptional: true }, // JSON array string
    { name: 'mood', type: 'string', isOptional: true },
    { name: 'temperature', type: 'number', isOptional: true },
    { name: 'discharge', type: 'string', isOptional: true },
    { name: 'notes', type: 'string', isOptional: true },
    { name: 'created_at', type: 'number' },
  ],
}),
tableSchema({
  name: 'birth_control_reminders',
  columns: [
    { name: 'label', type: 'string' },
    { name: 'time', type: 'string' },                 // 'HH:MM' 24h
    { name: 'message', type: 'string' },
    { name: 'enabled', type: 'boolean' },
    { name: 'created_at', type: 'number' },
  ],
}),
tableSchema({
  name: 'user_cycle_settings',
  columns: [
    { name: 'average_cycle_length', type: 'number' },
    { name: 'average_period_length', type: 'number' },
    { name: 'temperature_unit', type: 'string' },     // 'C' | 'F'
    { name: 'notifications_enabled', type: 'boolean' },
    { name: 'symptom_reminder_time', type: 'string', isOptional: true }, // 'HH:MM'
  ],
}),
```

**Step 2: Verify no syntax errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add db/schema.ts
git commit -m "feat: add period tracker tables to WatermelonDB schema"
```

---

## Task 2: WatermelonDB Model Classes

**Files:**
- Create: `db/models/CycleEntry.ts`
- Create: `db/models/PeriodLog.ts`
- Create: `db/models/BirthControlReminder.ts`
- Create: `db/models/UserCycleSettings.ts`

WatermelonDB models extend `Model` and use field decorators. Look at `db/models/MoodLog.ts` for the exact pattern — each column in the schema gets a `@field('column_name')` decorated property.

**Step 1: Create `db/models/CycleEntry.ts`**

```typescript
import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class CycleEntry extends Model {
  static table = 'cycle_entries'

  @field('start_date') startDate!: string
  @field('end_date') endDate!: string | null
  @field('cycle_length') cycleLength!: number | null
  @field('period_length') periodLength!: number | null
  @field('notes') notes!: string | null
  @field('created_at') createdAt!: number
}
```

**Step 2: Create `db/models/PeriodLog.ts`**

```typescript
import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class PeriodLog extends Model {
  static table = 'period_logs'

  @field('cycle_entry_id') cycleEntryId!: string
  @field('date') date!: string
  @field('flow') flow!: string | null
  @field('symptoms') symptoms!: string | null  // JSON array string
  @field('mood') mood!: string | null
  @field('temperature') temperature!: number | null
  @field('discharge') discharge!: string | null
  @field('notes') notes!: string | null
  @field('created_at') createdAt!: number
}
```

**Step 3: Create `db/models/BirthControlReminder.ts`**

```typescript
import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class BirthControlReminder extends Model {
  static table = 'birth_control_reminders'

  @field('label') label!: string
  @field('time') time!: string
  @field('message') message!: string
  @field('enabled') enabled!: boolean
  @field('created_at') createdAt!: number
}
```

**Step 4: Create `db/models/UserCycleSettings.ts`**

```typescript
import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class UserCycleSettings extends Model {
  static table = 'user_cycle_settings'

  @field('average_cycle_length') averageCycleLength!: number
  @field('average_period_length') averagePeriodLength!: number
  @field('temperature_unit') temperatureUnit!: string
  @field('notifications_enabled') notificationsEnabled!: boolean
  @field('symptom_reminder_time') symptomReminderTime!: string | null
}
```

**Step 5: Register models in `db/index.ts`**

Add imports and include in `modelClasses` array:

```typescript
import { CycleEntry } from './models/CycleEntry'
import { PeriodLog } from './models/PeriodLog'
import { BirthControlReminder } from './models/BirthControlReminder'
import { UserCycleSettings } from './models/UserCycleSettings'
```

Add to the `modelClasses` array: `CycleEntry, PeriodLog, BirthControlReminder, UserCycleSettings`

**Step 6: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 7: Commit**

```bash
git add db/models/CycleEntry.ts db/models/PeriodLog.ts db/models/BirthControlReminder.ts db/models/UserCycleSettings.ts db/index.ts
git commit -m "feat: add WatermelonDB models for period tracker"
```

---

## Task 3: Cycle Calculation Logic

**Files:**
- Create: `lib/cycleCalculations.ts`
- Create: `__tests__/lib/cycleCalculations.test.ts`

This is pure logic with no React or database dependencies — easy to unit test. Write tests first.

**Step 1: Write the failing tests**

Create `__tests__/lib/cycleCalculations.test.ts`:

```typescript
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
```

**Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/cycleCalculations.test.ts --no-coverage
```

Expected: FAIL — module not found.

**Step 3: Implement `lib/cycleCalculations.ts`**

```typescript
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
  d.setDate(d.getDate() + days)
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
```

**Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/cycleCalculations.test.ts --no-coverage
```

Expected: all PASS.

**Step 5: Commit**

```bash
git add lib/cycleCalculations.ts __tests__/lib/cycleCalculations.test.ts
git commit -m "feat: add cycle calculation and prediction logic"
```

---

## Task 4: Period Zustand Store

**Files:**
- Create: `stores/periodStore.ts`
- Create: `__tests__/stores/periodStore.test.ts`

The store manages cycle entries, period logs, settings, and birth control reminders in memory (same pattern as `moodStore.ts` — in-memory Zustand, no WatermelonDB wiring yet since that comes at screen level).

**Step 1: Write failing tests**

Create `__tests__/stores/periodStore.test.ts`:

```typescript
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
```

**Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/stores/periodStore.test.ts --no-coverage
```

Expected: FAIL — module not found.

**Step 3: Implement `stores/periodStore.ts`**

```typescript
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { getAverageCycleLength } from '@/lib/cycleCalculations'

export interface CycleEntry {
  id: string
  startDate: string
  endDate: string | null
  cycleLength: number | null
  periodLength: number | null
  notes: string | null
}

export interface PeriodLogEntry {
  id: string
  cycleEntryId: string
  date: string
  flow: string | null
  symptoms: string[]
  mood: string | null
  temperature: number | null
  discharge: string | null
  notes: string
}

export interface BirthControlReminder {
  id: string
  label: string
  time: string
  message: string
  enabled: boolean
}

export interface CycleSettings {
  averageCycleLength: number
  averagePeriodLength: number
  temperatureUnit: 'C' | 'F'
  notificationsEnabled: boolean
  symptomReminderTime: string
}

interface PeriodState {
  cycles: CycleEntry[]
  logs: PeriodLogEntry[]
  settings: CycleSettings
  birthControlReminder: BirthControlReminder | null

  startCycle: (startDate: string) => void
  endCycle: (cycleId: string, endDate: string) => void
  saveLog: (log: Omit<PeriodLogEntry, 'id'>) => void
  getLogForDate: (date: string) => PeriodLogEntry | null
  getActiveCycle: () => CycleEntry | null
  updateSettings: (settings: Partial<CycleSettings>) => void
  setBirthControlReminder: (reminder: Omit<BirthControlReminder, 'id'>) => void
  toggleBirthControlReminder: () => void
}

export const usePeriodStore = create<PeriodState>((set, get) => ({
  cycles: [],
  logs: [],
  settings: {
    averageCycleLength: 28,
    averagePeriodLength: 5,
    temperatureUnit: 'C',
    notificationsEnabled: true,
    symptomReminderTime: '21:00',
  },
  birthControlReminder: null,

  startCycle: (startDate) => {
    const newCycle: CycleEntry = {
      id: uuidv4(),
      startDate,
      endDate: null,
      cycleLength: null,
      periodLength: null,
      notes: null,
    }
    set((state) => ({ cycles: [...state.cycles, newCycle] }))
  },

  endCycle: (cycleId, endDate) => {
    set((state) => {
      const cycles = state.cycles.map((c) => {
        if (c.id !== cycleId) return c
        const start = new Date(c.startDate)
        const end = new Date(endDate)
        const periodLength = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

        // Calculate cycle length from previous cycle start
        const idx = state.cycles.findIndex((x) => x.id === cycleId)
        let cycleLength: number | null = null
        if (idx > 0) {
          const prev = state.cycles[idx - 1]
          cycleLength = Math.round((start.getTime() - new Date(prev.startDate).getTime()) / 86400000)
        }

        return { ...c, endDate, periodLength, cycleLength }
      })

      // Recompute average cycle length from closed cycles
      const lengths = cycles.map((c) => c.cycleLength).filter((l): l is number => l != null)
      const averageCycleLength = getAverageCycleLength(lengths)

      return {
        cycles,
        settings: { ...state.settings, averageCycleLength },
      }
    })
  },

  saveLog: (log) => {
    set((state) => ({
      logs: [
        ...state.logs.filter((l) => l.date !== log.date || l.cycleEntryId !== log.cycleEntryId),
        { ...log, id: uuidv4() },
      ],
    }))
  },

  getLogForDate: (date) => {
    return get().logs.find((l) => l.date === date) ?? null
  },

  getActiveCycle: () => {
    return get().cycles.findLast((c) => c.endDate === null) ?? null
  },

  updateSettings: (settings) => {
    set((state) => ({ settings: { ...state.settings, ...settings } }))
  },

  setBirthControlReminder: (reminder) => {
    set({ birthControlReminder: { ...reminder, id: uuidv4() } })
  },

  toggleBirthControlReminder: () => {
    set((state) => {
      if (!state.birthControlReminder) return state
      return { birthControlReminder: { ...state.birthControlReminder, enabled: !state.birthControlReminder.enabled } }
    })
  },
}))
```

**Step 4: Run tests**

```bash
npx jest __tests__/stores/periodStore.test.ts --no-coverage
```

Expected: all PASS.

**Step 5: Commit**

```bash
git add stores/periodStore.ts __tests__/stores/periodStore.test.ts
git commit -m "feat: add period Zustand store"
```

---

## Task 5: Cycle Notification Scheduling

**Files:**
- Create: `lib/cycleNotifications.ts`
- Create: `__tests__/lib/cycleNotifications.test.ts`

`expo-notifications` is already used in the app (see `lib/notifications.ts` and the existing mock in the test suite). Follow the same mock pattern.

**Step 1: Write failing tests**

Create `__tests__/lib/cycleNotifications.test.ts`:

```typescript
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
}))

import * as Notifications from 'expo-notifications'
import {
  schedulePeriodApproachingNotification,
  scheduleOvulationNotification,
  scheduleDailySymptomReminder,
  scheduleBirthControlReminder,
  cancelCycleNotifications,
} from '@/lib/cycleNotifications'

describe('cycleNotifications', () => {
  beforeEach(() => jest.clearAllMocks())

  it('schedules period approaching notification', async () => {
    await schedulePeriodApproachingNotification('2026-04-01')
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: expect.stringContaining('period') }),
      })
    )
  })

  it('schedules ovulation notification', async () => {
    await scheduleOvulationNotification('2026-03-28')
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled()
  })

  it('schedules daily symptom reminder', async () => {
    await scheduleDailySymptomReminder('21:00')
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled()
  })

  it('schedules birth control reminder', async () => {
    await scheduleBirthControlReminder({ label: 'Pill', time: '08:00', message: 'Take your pill!' })
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled()
  })

  it('cancels cycle notifications', async () => {
    await cancelCycleNotifications()
    expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/cycleNotifications.test.ts --no-coverage
```

Expected: FAIL — module not found.

**Step 3: Implement `lib/cycleNotifications.ts`**

```typescript
import * as Notifications from 'expo-notifications'

const CYCLE_NOTIFICATION_PREFIX = 'cycle_'

export async function schedulePeriodApproachingNotification(predictedStartDate: string): Promise<void> {
  const triggerDate = new Date(predictedStartDate)
  triggerDate.setDate(triggerDate.getDate() - 2)
  triggerDate.setHours(9, 0, 0, 0)
  if (triggerDate <= new Date()) return
  await Notifications.scheduleNotificationAsync({
    identifier: `${CYCLE_NOTIFICATION_PREFIX}period_approaching`,
    content: {
      title: 'Your period is approaching',
      body: `Your period is predicted to start in 2 days.`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  })
}

export async function scheduleOvulationNotification(ovulationDate: string): Promise<void> {
  const triggerDate = new Date(ovulationDate)
  triggerDate.setHours(8, 0, 0, 0)
  if (triggerDate <= new Date()) return
  await Notifications.scheduleNotificationAsync({
    identifier: `${CYCLE_NOTIFICATION_PREFIX}ovulation`,
    content: {
      title: 'Fertile window',
      body: "You're entering your fertile window today.",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  })
}

export async function scheduleDailySymptomReminder(time: string): Promise<void> {
  const [hourStr, minuteStr] = time.split(':')
  await Notifications.scheduleNotificationAsync({
    identifier: `${CYCLE_NOTIFICATION_PREFIX}symptom_reminder`,
    content: {
      title: 'Log your symptoms',
      body: "Don't forget to log today's symptoms.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10),
    } as any,
  })
}

export async function scheduleBirthControlReminder(reminder: {
  label: string
  time: string
  message: string
}): Promise<void> {
  const [hourStr, minuteStr] = reminder.time.split(':')
  await Notifications.scheduleNotificationAsync({
    identifier: `${CYCLE_NOTIFICATION_PREFIX}birth_control`,
    content: {
      title: reminder.label,
      body: reminder.message,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10),
    } as any,
  })
}

export async function cancelCycleNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const cycleNotifs = scheduled.filter((n) => n.identifier.startsWith(CYCLE_NOTIFICATION_PREFIX))
  await Promise.all(cycleNotifs.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)))
}
```

**Step 4: Run tests**

```bash
npx jest __tests__/lib/cycleNotifications.test.ts --no-coverage
```

Expected: all PASS.

**Step 5: Commit**

```bash
git add lib/cycleNotifications.ts __tests__/lib/cycleNotifications.test.ts
git commit -m "feat: add cycle notification scheduling"
```

---

## Task 6: Period Tracker Components

**Files:**
- Create: `components/period/CycleStatusCard.tsx`
- Create: `components/period/CycleCalendar.tsx`
- Create: `components/period/TodayLogForm.tsx`
- Create: `components/period/CycleStats.tsx`
- Create: `components/period/CycleInsights.tsx`
- Create: `components/period/BirthControlCard.tsx`

These are UI components. No unit tests needed — they are tested by running the app. Use NativeWind (Tailwind) for styling, matching the existing app style (white cards, rounded-xl, bg-gray-50 screen background, `text-primary` / `bg-primary` for accent). Look at `app/(tabs)/me.tsx` for the style patterns.

**Step 1: Create `components/period/CycleStatusCard.tsx`**

Displays current phase, day of cycle, and days until next period. Receives props — no store calls inside.

```typescript
import { View, Text } from 'react-native'
import { CyclePhase } from '@/lib/cycleCalculations'

const PHASE_CONFIG: Record<CyclePhase, { label: string; color: string; bg: string }> = {
  menstruation: { label: 'Period', color: 'text-red-600', bg: 'bg-red-50' },
  follicular: { label: 'Follicular', color: 'text-blue-600', bg: 'bg-blue-50' },
  ovulation: { label: 'Ovulation', color: 'text-green-600', bg: 'bg-green-50' },
  luteal: { label: 'Luteal', color: 'text-purple-600', bg: 'bg-purple-50' },
}

interface Props {
  phase: CyclePhase
  dayOfCycle: number
  daysUntilNextPeriod: number | null
}

export function CycleStatusCard({ phase, dayOfCycle, daysUntilNextPeriod }: Props) {
  const config = PHASE_CONFIG[phase]
  return (
    <View className={`rounded-2xl p-4 mb-4 ${config.bg}`}>
      <Text className={`text-xs font-semibold uppercase tracking-wide mb-1 ${config.color}`}>
        {config.label} Phase
      </Text>
      <Text className="text-3xl font-bold text-gray-900">Day {dayOfCycle}</Text>
      {daysUntilNextPeriod !== null && (
        <Text className="text-sm text-gray-500 mt-1">
          {daysUntilNextPeriod === 0
            ? 'Period expected today'
            : `Period in ${daysUntilNextPeriod} day${daysUntilNextPeriod === 1 ? '' : 's'}`}
        </Text>
      )}
    </View>
  )
}
```

**Step 2: Create `components/period/CycleCalendar.tsx`**

Horizontal scrollable month calendar. Days are colored by status. Receives `markedDates` map as prop.

```typescript
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'

export type DayStatus = 'period' | 'predicted' | 'ovulation' | 'fertile' | 'today' | 'none'

interface MarkedDates {
  [date: string]: DayStatus
}

interface Props {
  month: Date
  markedDates: MarkedDates
  onDayPress: (date: string) => void
}

const STATUS_STYLE: Record<DayStatus, string> = {
  period: 'bg-red-400',
  predicted: 'bg-red-200',
  ovulation: 'bg-green-400',
  fertile: 'bg-green-200',
  today: 'bg-indigo-100 border-2 border-indigo-400',
  none: 'bg-white',
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function CycleCalendar({ month, markedDates, onDayPress }: Props) {
  const days = getDaysInMonth(month.getFullYear(), month.getMonth())
  const monthLabel = month.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <Text className="font-semibold text-gray-800 mb-3">{monthLabel}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-1">
          {days.map((day) => {
            const dateStr = day.toISOString().split('T')[0]
            const status = markedDates[dateStr] ?? 'none'
            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => onDayPress(dateStr)}
                className={`w-9 h-12 rounded-xl items-center justify-center ${STATUS_STYLE[status]}`}
              >
                <Text className="text-xs text-gray-500">{day.toLocaleString('default', { weekday: 'narrow' })}</Text>
                <Text className="text-sm font-medium text-gray-800">{day.getDate()}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
```

**Step 3: Create `components/period/TodayLogForm.tsx`**

Inline log form. Calls `usePeriodStore` directly.

```typescript
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
```

**Step 4: Create `components/period/CycleStats.tsx`**

```typescript
import { View, Text } from 'react-native'
import { CycleEntry } from '@/stores/periodStore'

interface Props {
  cycles: CycleEntry[]
  logStreak: number
}

export function CycleStats({ cycles, logStreak }: Props) {
  const closed = cycles.filter((c) => c.cycleLength != null)
  const lengths = closed.map((c) => c.cycleLength as number)
  const periodLengths = cycles.filter((c) => c.periodLength != null).map((c) => c.periodLength as number)

  const avgCycle = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : null
  const avgPeriod = periodLengths.length ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : null
  const minCycle = lengths.length ? Math.min(...lengths) : null
  const maxCycle = lengths.length ? Math.max(...lengths) : null

  const stats = [
    { label: 'Avg cycle', value: avgCycle ? `${avgCycle}d` : '—' },
    { label: 'Avg period', value: avgPeriod ? `${avgPeriod}d` : '—' },
    { label: 'Shortest', value: minCycle ? `${minCycle}d` : '—' },
    { label: 'Longest', value: maxCycle ? `${maxCycle}d` : '—' },
    { label: 'Log streak', value: `${logStreak}d` },
  ]

  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <Text className="font-semibold text-gray-800 mb-3">Cycle Stats</Text>
      <View className="flex-row flex-wrap">
        {stats.map((s) => (
          <View key={s.label} className="w-1/3 items-center mb-3">
            <Text className="text-xl font-bold text-gray-900">{s.value}</Text>
            <Text className="text-xs text-gray-500">{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
```

**Step 5: Create `components/period/CycleInsights.tsx`**

```typescript
import { View, Text } from 'react-native'

interface Props {
  insights: string[]
}

export function CycleInsights({ insights }: Props) {
  if (insights.length === 0) return null
  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <Text className="font-semibold text-gray-800 mb-3">Insights</Text>
      {insights.map((insight, i) => (
        <View key={i} className="flex-row items-start mb-2">
          <Text className="text-indigo-400 mr-2">•</Text>
          <Text className="text-gray-700 flex-1">{insight}</Text>
        </View>
      ))}
    </View>
  )
}
```

**Step 6: Create `components/period/BirthControlCard.tsx`**

```typescript
import { View, Text, TouchableOpacity, TextInput, Switch } from 'react-native'
import { useState } from 'react'
import { usePeriodStore, BirthControlReminder } from '@/stores/periodStore'

export function BirthControlCard() {
  const { birthControlReminder, setBirthControlReminder, toggleBirthControlReminder } = usePeriodStore()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(birthControlReminder?.label ?? 'Birth Control')
  const [time, setTime] = useState(birthControlReminder?.time ?? '08:00')
  const [message, setMessage] = useState(birthControlReminder?.message ?? 'Time to take your birth control!')

  const handleSave = () => {
    setBirthControlReminder({ label, time, message, enabled: true })
    setEditing(false)
  }

  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="font-semibold text-gray-800">Birth Control Reminder</Text>
        {birthControlReminder && (
          <Switch
            value={birthControlReminder.enabled}
            onValueChange={toggleBirthControlReminder}
            trackColor={{ true: '#6366f1' }}
          />
        )}
      </View>

      {!editing && birthControlReminder ? (
        <View>
          <Text className="text-gray-600">{birthControlReminder.label} · {birthControlReminder.time}</Text>
          <Text className="text-gray-400 text-sm mt-1">{birthControlReminder.message}</Text>
          <TouchableOpacity onPress={() => setEditing(true)} className="mt-3">
            <Text className="text-indigo-500 font-medium">Edit reminder</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text className="text-xs text-gray-500 uppercase mb-1">Label</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3"
            value={label}
            onChangeText={setLabel}
          />
          <Text className="text-xs text-gray-500 uppercase mb-1">Time (HH:MM)</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3"
            value={time}
            onChangeText={setTime}
            placeholder="08:00"
          />
          <Text className="text-xs text-gray-500 uppercase mb-1">Message</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4"
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity className="bg-primary rounded-xl py-3 items-center" onPress={handleSave}>
            <Text className="text-white font-semibold">Save Reminder</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
```

**Step 7: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 8: Commit**

```bash
git add components/period/
git commit -m "feat: add period tracker UI components"
```

---

## Task 7: Period Tracker Main Screen

**Files:**
- Create: `app/(tabs)/period.tsx`

Assembles all components. Computes derived data (phase, marked dates, insights) from the store and passes it down.

**Step 1: Create `app/(tabs)/period.tsx`**

```typescript
import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { usePeriodStore } from '@/stores/periodStore'
import { CycleStatusCard } from '@/components/period/CycleStatusCard'
import { CycleCalendar, DayStatus } from '@/components/period/CycleCalendar'
import { TodayLogForm } from '@/components/period/TodayLogForm'
import { CycleStats } from '@/components/period/CycleStats'
import { CycleInsights } from '@/components/period/CycleInsights'
import { BirthControlCard } from '@/components/period/BirthControlCard'
import {
  getCyclePhase,
  predictNextPeriod,
  getOvulationDay,
  getFertileWindow,
  computeInsights,
  CyclePhase,
} from '@/lib/cycleCalculations'

const today = new Date().toISOString().split('T')[0]

export default function PeriodScreen() {
  const { cycles, logs, settings, startCycle, endCycle } = usePeriodStore()
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const activeCycle = cycles.findLast((c) => c.endDate === null) ?? null
  const lastClosedCycle = cycles.findLast((c) => c.endDate !== null) ?? null

  // Day of cycle
  let dayOfCycle = 1
  let phase: CyclePhase = 'follicular'
  let daysUntilNext: number | null = null

  if (activeCycle) {
    const start = new Date(activeCycle.startDate)
    const now = new Date(today)
    dayOfCycle = Math.round((now.getTime() - start.getTime()) / 86400000) + 1
    phase = getCyclePhase(dayOfCycle, settings.averagePeriodLength, settings.averageCycleLength)

    const nextDate = predictNextPeriod(activeCycle.startDate, settings.averageCycleLength)
    const diff = Math.round((new Date(nextDate).getTime() - now.getTime()) / 86400000)
    daysUntilNext = diff >= 0 ? diff : 0
  }

  // Build marked dates for calendar
  const markedDates: Record<string, DayStatus> = {}

  logs.forEach((log) => {
    if (log.flow && log.flow !== 'none') markedDates[log.date] = 'period'
  })

  if (activeCycle) {
    const nextPeriod = predictNextPeriod(activeCycle.startDate, settings.averageCycleLength)
    const ovDay = getOvulationDay(activeCycle.startDate, settings.averageCycleLength)
    const fertile = getFertileWindow(activeCycle.startDate, settings.averageCycleLength)

    // Mark predicted period (next 5 days from predicted start)
    for (let i = 0; i < settings.averagePeriodLength; i++) {
      const d = new Date(nextPeriod)
      d.setDate(d.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      if (!markedDates[ds]) markedDates[ds] = 'predicted'
    }

    if (!markedDates[ovDay]) markedDates[ovDay] = 'ovulation'

    // Fertile window
    const fertileStart = new Date(fertile.start)
    const fertileEnd = new Date(fertile.end)
    const cur = new Date(fertileStart)
    while (cur <= fertileEnd) {
      const ds = cur.toISOString().split('T')[0]
      if (!markedDates[ds]) markedDates[ds] = 'fertile'
      cur.setDate(cur.getDate() + 1)
    }
  }

  markedDates[today] = markedDates[today] === 'period' ? 'period' : 'today'

  // Insights
  const insights = computeInsights(cycles, logs.map((l) => ({ date: l.date, symptoms: l.symptoms ? JSON.stringify(l.symptoms) : null, mood: l.mood })))

  // Log streak
  let logStreak = 0
  const d = new Date(today)
  while (logs.find((l) => l.date === d.toISOString().split('T')[0])) {
    logStreak++
    d.setDate(d.getDate() - 1)
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-6 pb-2">
        <Text className="text-2xl font-bold text-gray-900">Period Tracking</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <CycleStatusCard phase={phase} dayOfCycle={dayOfCycle} daysUntilNextPeriod={daysUntilNext} />

        {/* Cycle start/end buttons */}
        <View className="flex-row mb-4 gap-3">
          {!activeCycle ? (
            <TouchableOpacity
              className="flex-1 bg-red-500 rounded-xl py-3 items-center"
              onPress={() => startCycle(today)}
            >
              <Text className="text-white font-semibold">Start Period</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-1 bg-gray-200 rounded-xl py-3 items-center"
              onPress={() => endCycle(activeCycle.id, today)}
            >
              <Text className="text-gray-700 font-semibold">End Period</Text>
            </TouchableOpacity>
          )}
        </View>

        <CycleCalendar
          month={calendarMonth}
          markedDates={markedDates}
          onDayPress={() => {}}
        />

        {activeCycle && <TodayLogForm cycleId={activeCycle.id} date={today} />}

        <CycleStats cycles={cycles} logStreak={logStreak} />

        <CycleInsights insights={insights} />

        <BirthControlCard />

        <View className="h-16" />
      </ScrollView>
    </SafeAreaView>
  )
}
```

**Step 2: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/\(tabs\)/period.tsx
git commit -m "feat: add period tracker main screen"
```

---

## Task 8: Add Period Tab to Navigation

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

**Step 1: Add the tab**

In `app/(tabs)/_layout.tsx`:

1. Add `Heart` to the lucide import: `import { Home, Wallet, Activity, UtensilsCrossed, User, Heart } from 'lucide-react-native'`

2. Add a new `<Tabs.Screen>` entry after the `me` screen:

```tsx
<Tabs.Screen name="period" options={{ title: 'Period', tabBarIcon: ({ color }) => <Heart size={22} color={color} /> }} />
```

**Step 2: Verify types and run**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "feat: add Period tab to bottom navigation"
```

---

## Task 9: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260326000002_period_tracker.sql`

**Step 1: Create the migration file**

```sql
-- Period Tracker tables

create table if not exists cycle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  start_date date not null,
  end_date date,
  cycle_length integer,
  period_length integer,
  notes text,
  created_at timestamptz default now()
);

create table if not exists period_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  cycle_entry_id uuid references cycle_entries(id) on delete cascade not null,
  date date not null,
  flow text,
  symptoms jsonb default '[]',
  mood text,
  temperature decimal(4,1),
  discharge text,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists birth_control_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  time text not null,
  message text not null,
  enabled boolean default true,
  created_at timestamptz default now()
);

create table if not exists user_cycle_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  average_cycle_length integer default 28,
  average_period_length integer default 5,
  temperature_unit text default 'C',
  notifications_enabled boolean default true,
  symptom_reminder_time text default '21:00',
  updated_at timestamptz default now()
);

-- RLS
alter table cycle_entries enable row level security;
alter table period_logs enable row level security;
alter table birth_control_reminders enable row level security;
alter table user_cycle_settings enable row level security;

create policy "Users can manage own cycle entries" on cycle_entries for all using (auth.uid() = user_id);
create policy "Users can manage own period logs" on period_logs for all using (auth.uid() = user_id);
create policy "Users can manage own birth control reminders" on birth_control_reminders for all using (auth.uid() = user_id);
create policy "Users can manage own cycle settings" on user_cycle_settings for all using (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260326000002_period_tracker.sql
git commit -m "feat: add Supabase migration for period tracker tables"
```

---

## Task 10: Run All Tests

**Step 1: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS, including:
- `__tests__/lib/cycleCalculations.test.ts`
- `__tests__/lib/cycleNotifications.test.ts`
- `__tests__/stores/periodStore.test.ts`
- all pre-existing tests

**Step 2: Fix any failures before proceeding**

If any pre-existing tests fail due to the schema version bump (WatermelonDB), check `__tests__/db/` for any schema-related tests and update the expected version number.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: update tests after period tracker implementation"
```
