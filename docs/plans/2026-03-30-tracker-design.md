# Tracker Tab — Period Tracker Design Document
**Date:** 2026-03-30
**Status:** Approved

---

## Overview

A dedicated "Tracker" tab added to EveryDayApp for period and cycle tracking. Single scrollable screen with a cycle wheel as the hero element, followed by logging, predictions, and history. Fully local-first using Zustand + AsyncStorage, consistent with existing stores.

---

## Navigation

- New 6th tab: **"Tracker"** with a `Compass` icon from lucide-react-native
- Added to `app/(tabs)/_layout.tsx` alongside the existing 5 tabs
- New screen file: `app/(tabs)/tracker.tsx`

---

## Screen Layout (single scroll)

1. **Cycle Wheel** — SVG arc showing current day in cycle, color-coded zones:
   - Period = red
   - Fertile window = green
   - Ovulation = purple
   - Luteal = gray
   - Center text: "Day X of cycle" + current phase name

2. **Quick Actions row** — three buttons:
   - Log Period Start
   - Log Period End
   - Log Symptoms (opens `LogSymptomsModal`)

3. **Today's Log card** — displays today's recorded data: flow intensity, symptoms list, BBT, notes

4. **Fertile Window banner** — estimated ovulation date + fertile window date range

5. **Next Period prediction card** — estimated next period start date

6. **Cycle History list** — past cycles showing start date, cycle length, and period length

---

## Components

| File | Purpose |
|---|---|
| `app/(tabs)/tracker.tsx` | Main screen — single scrollable layout |
| `components/tracker/CycleWheel.tsx` | SVG arc wheel with color-coded cycle phases |
| `components/tracker/LogSymptomsModal.tsx` | Bottom sheet modal for logging flow, symptoms, BBT, notes |
| `stores/periodStore.ts` | Zustand store with AsyncStorage persistence |

---

## Data Models

```
CycleEntry
  id: string
  startDate: string (ISO date)
  endDate: string | null (ISO date)
  cycleLength: number | null (calculated on end)

DayLog
  id: string
  date: string (ISO date)
  flow: 'none' | 'spotting' | 'light' | 'medium' | 'heavy'
  symptoms: string[]  // e.g. ['cramps', 'bloating', 'headache', 'mood swings', 'fatigue']
  bbt: number | null  // basal body temperature in °C
  notes: string

CycleSettings
  averageCycleLength: number  // default 28
  averagePeriodLength: number  // default 5
```

---

## Prediction Logic (pure functions in store)

- **Next period start** = last cycle start date + average cycle length
- **Ovulation day** = next period start − 14 days
- **Fertile window** = ovulation day ± 2 days (5-day window)
- **Current phase**:
  - Period: days 1–averagePeriodLength
  - Follicular: after period ends to fertile window start
  - Fertile: fertile window
  - Ovulation: ovulation day
  - Luteal: after ovulation to next period

---

## State Management

Zustand store (`periodStore`) with AsyncStorage persistence — same pattern as `moodStore` and `habitStore`.

**Store shape:**
```ts
{
  cycles: CycleEntry[]
  dayLogs: DayLog[]
  settings: CycleSettings
  // actions
  startPeriod: (date: string) => void
  endPeriod: (date: string) => void
  logDay: (log: Omit<DayLog, 'id'>) => void
  updateSettings: (settings: Partial<CycleSettings>) => void
  // selectors
  getCurrentCycleDay: () => number
  getCurrentPhase: () => string
  getNextPeriodDate: () => string | null
  getOvulationDate: () => string | null
  getFertileWindow: () => { start: string; end: string } | null
}
```

---

## Tech Constraints

- No new dependencies required — SVG wheel built with React Native's built-in `View` + `StyleSheet` arc technique or existing Expo SVG support
- Consistent styling with NativeWind (Tailwind classes)
- No cloud sync in this phase — local only, same as other stores
