# Tracker Tab — Period Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated "Tracker" tab for period/cycle tracking with a cycle wheel, symptom logging, BBT, predictions, and history.

**Architecture:** Single scrollable screen (`app/(tabs)/tracker.tsx`) with a cycle wheel hero (SVG arcs via `react-native-svg`), quick action buttons, today's log card, prediction cards, and cycle history. State managed by a new `periodStore` (Zustand + AsyncStorage). A `LogSymptomsModal` bottom sheet handles daily logging. No new dependencies required.

**Tech Stack:** React Native, Expo Router, NativeWind, Zustand + AsyncStorage, react-native-svg, lucide-react-native, uuid

---

## Task 1: Create the periodStore

**Files:**
- Create: `stores/periodStore.ts`

The store holds cycle entries, day logs, and settings. It exposes actions and pure selector functions for cycle math.

**Step 1: Create the store file**

```ts
// stores/periodStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'

export interface CycleEntry {
  id: string
  startDate: string   // YYYY-MM-DD
  endDate: string | null
}

export interface DayLog {
  id: string
  date: string        // YYYY-MM-DD
  flow: 'none' | 'spotting' | 'light' | 'medium' | 'heavy'
  symptoms: string[]  // e.g. ['cramps', 'bloating', 'headache', 'mood swings', 'fatigue']
  bbt: number | null  // °C
  notes: string
}

export interface CycleSettings {
  averageCycleLength: number   // default 28
  averagePeriodLength: number  // default 5
}

interface PeriodState {
  cycles: CycleEntry[]
  dayLogs: DayLog[]
  settings: CycleSettings
  startPeriod: (date: string) => void
  endPeriod: (date: string) => void
  logDay: (log: Omit<DayLog, 'id'>) => void
  updateSettings: (s: Partial<CycleSettings>) => void
  getCurrentCycleDay: () => number
  getCurrentPhase: () => 'period' | 'follicular' | 'fertile' | 'ovulation' | 'luteal' | 'unknown'
  getNextPeriodDate: () => string | null
  getOvulationDate: () => string | null
  getFertileWindow: () => { start: string; end: string } | null
  getTodayLog: () => DayLog | null
}

// Helper: days between two YYYY-MM-DD strings (positive = date2 is after date1)
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

// Helper: add N days to a YYYY-MM-DD string
function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export const usePeriodStore = create<PeriodState>()(
  persist(
    (set, get) => ({
      cycles: [],
      dayLogs: [],
      settings: { averageCycleLength: 28, averagePeriodLength: 5 },

      startPeriod: (date) =>
        set((state) => ({
          cycles: [...state.cycles, { id: uuidv4(), startDate: date, endDate: null }],
        })),

      endPeriod: (date) =>
        set((state) => ({
          cycles: state.cycles.map((c, i) =>
            i === state.cycles.length - 1 && c.endDate === null
              ? { ...c, endDate: date }
              : c
          ),
        })),

      logDay: (log) =>
        set((state) => ({
          dayLogs: [
            ...state.dayLogs.filter((l) => l.date !== log.date),
            { ...log, id: uuidv4() },
          ],
        })),

      updateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),

      getCurrentCycleDay: () => {
        const { cycles } = get()
        if (cycles.length === 0) return 0
        const last = cycles[cycles.length - 1]
        const today = new Date().toISOString().split('T')[0]
        return daysBetween(last.startDate, today) + 1
      },

      getCurrentPhase: () => {
        const { cycles, settings } = get()
        if (cycles.length === 0) return 'unknown'
        const last = cycles[cycles.length - 1]
        const today = new Date().toISOString().split('T')[0]
        const cycleDay = daysBetween(last.startDate, today) + 1
        const ovulationDay = settings.averageCycleLength - 14
        const fertileStart = ovulationDay - 2
        const fertileEnd = ovulationDay + 2

        if (cycleDay <= settings.averagePeriodLength) return 'period'
        if (cycleDay < fertileStart) return 'follicular'
        if (cycleDay === ovulationDay) return 'ovulation'
        if (cycleDay >= fertileStart && cycleDay <= fertileEnd) return 'fertile'
        return 'luteal'
      },

      getNextPeriodDate: () => {
        const { cycles, settings } = get()
        if (cycles.length === 0) return null
        const last = cycles[cycles.length - 1]
        return addDays(last.startDate, settings.averageCycleLength)
      },

      getOvulationDate: () => {
        const nextPeriod = get().getNextPeriodDate()
        if (!nextPeriod) return null
        return addDays(nextPeriod, -14)
      },

      getFertileWindow: () => {
        const ovulation = get().getOvulationDate()
        if (!ovulation) return null
        return { start: addDays(ovulation, -2), end: addDays(ovulation, 2) }
      },

      getTodayLog: () => {
        const today = new Date().toISOString().split('T')[0]
        return get().dayLogs.find((l) => l.date === today) ?? null
      },
    }),
    { name: 'period', storage: createJSONStorage(() => AsyncStorage) }
  )
)
```

**Step 2: Verify TypeScript compiles**

```bash
cd /home/j/Documents/EveryDayApp/EveryDayApp && npx tsc --noEmit
```

Expected: No errors related to `stores/periodStore.ts`

**Step 3: Commit**

```bash
git add stores/periodStore.ts
git commit -m "feat: add periodStore with cycle tracking and prediction logic"
```

---

## Task 2: Create the CycleWheel component

**Files:**
- Create: `components/tracker/CycleWheel.tsx`

Renders a full SVG circle divided into arc segments — one per day of the cycle — color-coded by phase. A dot marks the current day. Center text shows "Day X" and the phase name.

**Step 1: Create the component**

```tsx
// components/tracker/CycleWheel.tsx
import { View, Text } from 'react-native'
import Svg, { Path, Circle, G } from 'react-native-svg'

interface Props {
  cycleLength: number
  periodLength: number
  currentDay: number  // 1-based, 0 = unknown
  phase: string
}

// Convert polar coordinates to cartesian
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// SVG arc path for a segment from startAngle to endAngle
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle - 0.5)
  const end = polarToCartesian(cx, cy, r, startAngle + 0.5)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

const PHASE_COLORS: Record<string, string> = {
  period: '#ef4444',
  follicular: '#d1d5db',
  fertile: '#22c55e',
  ovulation: '#a855f7',
  luteal: '#9ca3af',
}

const PHASE_LABELS: Record<string, string> = {
  period: 'Period',
  follicular: 'Follicular',
  fertile: 'Fertile',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
  unknown: 'No data',
}

export function CycleWheel({ cycleLength, periodLength, currentDay, phase }: Props) {
  const size = 260
  const cx = size / 2
  const cy = size / 2
  const r = 100
  const strokeWidth = 22
  const degreesPerDay = 360 / cycleLength
  const ovulationDay = cycleLength - 14
  const fertileStart = ovulationDay - 2
  const fertileEnd = ovulationDay + 2

  function getPhaseForDay(day: number): string {
    if (day <= periodLength) return 'period'
    if (day < fertileStart) return 'follicular'
    if (day === ovulationDay) return 'ovulation'
    if (day >= fertileStart && day <= fertileEnd) return 'fertile'
    return 'luteal'
  }

  const segments = Array.from({ length: cycleLength }, (_, i) => {
    const day = i + 1
    const startAngle = i * degreesPerDay
    const endAngle = (i + 1) * degreesPerDay
    const segPhase = getPhaseForDay(day)
    const isToday = day === currentDay
    return { day, startAngle, endAngle, segPhase, isToday }
  })

  // Dot for current day
  const todayAngle = currentDay > 0 ? (currentDay - 0.5) * degreesPerDay : -1
  const dotPos = currentDay > 0 ? polarToCartesian(cx, cy, r, todayAngle) : null

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle cx={cx} cy={cy} r={r} stroke="#f3f4f6" strokeWidth={strokeWidth} fill="none" />

        {/* Phase segments */}
        {segments.map(({ day, startAngle, endAngle, segPhase, isToday }) => (
          <Path
            key={day}
            d={arcPath(cx, cy, r, startAngle, endAngle)}
            stroke={isToday ? '#1f2937' : PHASE_COLORS[segPhase]}
            strokeWidth={isToday ? strokeWidth + 4 : strokeWidth}
            strokeLinecap="butt"
            fill="none"
          />
        ))}

        {/* Current day dot */}
        {dotPos && (
          <G>
            <Circle cx={dotPos.x} cy={dotPos.y} r={10} fill="white" />
            <Circle cx={dotPos.x} cy={dotPos.y} r={6} fill="#1f2937" />
          </G>
        )}
      </Svg>

      {/* Center text overlay */}
      <View className="absolute inset-0 items-center justify-center">
        {currentDay > 0 ? (
          <>
            <Text className="text-4xl font-bold text-gray-900">{currentDay}</Text>
            <Text className="text-xs text-gray-500 mt-1">Day of cycle</Text>
            <Text className="text-sm font-semibold mt-1" style={{ color: PHASE_COLORS[phase] ?? '#6b7280' }}>
              {PHASE_LABELS[phase] ?? phase}
            </Text>
          </>
        ) : (
          <>
            <Text className="text-2xl">🌙</Text>
            <Text className="text-xs text-gray-400 mt-1 text-center px-8">Log your{'\n'}period to start</Text>
          </>
        )}
      </View>
    </View>
  )
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add components/tracker/CycleWheel.tsx
git commit -m "feat: add CycleWheel SVG component"
```

---

## Task 3: Create the LogSymptomsModal component

**Files:**
- Create: `components/tracker/LogSymptomsModal.tsx`

A `Modal` bottom sheet for logging today's flow, symptoms, BBT, and notes.

**Step 1: Create the component**

```tsx
// components/tracker/LogSymptomsModal.tsx
import { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { X } from 'lucide-react-native'
import { usePeriodStore, DayLog } from '@/stores/periodStore'

interface Props {
  visible: boolean
  onClose: () => void
}

const FLOW_OPTIONS: DayLog['flow'][] = ['none', 'spotting', 'light', 'medium', 'heavy']
const SYMPTOM_OPTIONS = ['Cramps', 'Bloating', 'Headache', 'Mood swings', 'Fatigue', 'Breast tenderness', 'Acne', 'Back pain', 'Nausea']

const FLOW_COLORS: Record<DayLog['flow'], string> = {
  none: '#d1d5db',
  spotting: '#fca5a5',
  light: '#f87171',
  medium: '#ef4444',
  heavy: '#b91c1c',
}

export function LogSymptomsModal({ visible, onClose }: Props) {
  const { logDay, getTodayLog } = usePeriodStore()
  const todayLog = getTodayLog()
  const today = new Date().toISOString().split('T')[0]

  const [flow, setFlow] = useState<DayLog['flow']>(todayLog?.flow ?? 'none')
  const [symptoms, setSymptoms] = useState<string[]>(todayLog?.symptoms ?? [])
  const [bbt, setBbt] = useState(todayLog?.bbt?.toString() ?? '')
  const [notes, setNotes] = useState(todayLog?.notes ?? '')

  function toggleSymptom(s: string) {
    setSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  function handleSave() {
    logDay({
      date: today,
      flow,
      symptoms,
      bbt: bbt ? parseFloat(bbt) : null,
      notes,
    })
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
        <View className="bg-white rounded-t-3xl px-6 pt-4 pb-8" style={{ maxHeight: '85%' }}>
          {/* Handle */}
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />

          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-bold text-gray-900">Log Today</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Flow */}
            <Text className="text-sm font-semibold text-gray-700 mb-3">Flow</Text>
            <View className="flex-row gap-2 mb-6">
              {FLOW_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFlow(f)}
                  className="flex-1 py-2 rounded-xl items-center"
                  style={{ backgroundColor: flow === f ? FLOW_COLORS[f] : '#f3f4f6' }}
                >
                  <Text className={`text-xs font-medium capitalize ${flow === f ? 'text-white' : 'text-gray-500'}`}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Symptoms */}
            <Text className="text-sm font-semibold text-gray-700 mb-3">Symptoms</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {SYMPTOM_OPTIONS.map((s) => {
                const active = symptoms.includes(s)
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => toggleSymptom(s)}
                    className={`px-3 py-2 rounded-full border ${active ? 'bg-red-500 border-red-500' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-gray-600'}`}>{s}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* BBT */}
            <Text className="text-sm font-semibold text-gray-700 mb-3">Basal Body Temp (°C)</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-900"
              placeholder="e.g. 36.5"
              keyboardType="decimal-pad"
              value={bbt}
              onChangeText={setBbt}
            />

            {/* Notes */}
            <Text className="text-sm font-semibold text-gray-700 mb-3">Notes</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-900"
              placeholder="How are you feeling?"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            {/* Save */}
            <TouchableOpacity
              className="bg-red-500 rounded-2xl py-4 items-center"
              onPress={handleSave}
            >
              <Text className="text-white font-semibold text-base">Save</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add components/tracker/LogSymptomsModal.tsx
git commit -m "feat: add LogSymptomsModal for daily cycle logging"
```

---

## Task 4: Create the Tracker screen

**Files:**
- Create: `app/(tabs)/tracker.tsx`

Single scrollable screen assembling all pieces: CycleWheel, quick actions, today's log card, predictions, and cycle history.

**Step 1: Create the screen**

```tsx
// app/(tabs)/tracker.tsx
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Droplets, FlaskConical, ClipboardList } from 'lucide-react-native'
import { usePeriodStore } from '@/stores/periodStore'
import { CycleWheel } from '@/components/tracker/CycleWheel'
import { LogSymptomsModal } from '@/components/tracker/LogSymptomsModal'

const FLOW_LABELS: Record<string, string> = {
  none: 'None', spotting: 'Spotting', light: 'Light', medium: 'Medium', heavy: 'Heavy',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TrackerScreen() {
  const [showLogModal, setShowLogModal] = useState(false)
  const {
    cycles,
    settings,
    startPeriod,
    endPeriod,
    getCurrentCycleDay,
    getCurrentPhase,
    getNextPeriodDate,
    getOvulationDate,
    getFertileWindow,
    getTodayLog,
  } = usePeriodStore()

  const today = new Date().toISOString().split('T')[0]
  const currentDay = getCurrentCycleDay()
  const phase = getCurrentPhase()
  const nextPeriod = getNextPeriodDate()
  const ovulation = getOvulationDate()
  const fertileWindow = getFertileWindow()
  const todayLog = getTodayLog()
  const activeCycle = cycles.length > 0 ? cycles[cycles.length - 1] : null
  const isPeriodActive = activeCycle !== null && activeCycle.endDate === null

  function handleStartPeriod() {
    if (isPeriodActive) {
      Alert.alert('Period already active', 'End the current period before starting a new one.')
      return
    }
    startPeriod(today)
  }

  function handleEndPeriod() {
    if (!isPeriodActive) {
      Alert.alert('No active period', 'Log a period start first.')
      return
    }
    endPeriod(today)
  }

  const pastCycles = cycles
    .filter((c) => c.endDate !== null)
    .slice()
    .reverse()
    .slice(0, 6)

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-gray-900 mb-6">Tracker</Text>

        {/* Cycle Wheel */}
        <View className="bg-white rounded-3xl p-6 mb-4 items-center">
          <CycleWheel
            cycleLength={settings.averageCycleLength}
            periodLength={settings.averagePeriodLength}
            currentDay={currentDay}
            phase={phase}
          />
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            className={`flex-1 rounded-2xl py-4 items-center ${isPeriodActive ? 'bg-gray-100' : 'bg-red-500'}`}
            onPress={handleStartPeriod}
          >
            <Droplets size={20} color={isPeriodActive ? '#9ca3af' : 'white'} />
            <Text className={`text-xs font-semibold mt-1 ${isPeriodActive ? 'text-gray-400' : 'text-white'}`}>
              Period Start
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 rounded-2xl py-4 items-center ${isPeriodActive ? 'bg-red-100' : 'bg-gray-100'}`}
            onPress={handleEndPeriod}
          >
            <Droplets size={20} color={isPeriodActive ? '#ef4444' : '#9ca3af'} />
            <Text className={`text-xs font-semibold mt-1 ${isPeriodActive ? 'text-red-500' : 'text-gray-400'}`}>
              Period End
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-indigo-500 rounded-2xl py-4 items-center"
            onPress={() => setShowLogModal(true)}
          >
            <ClipboardList size={20} color="white" />
            <Text className="text-xs font-semibold mt-1 text-white">Log Today</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Log Card */}
        {todayLog && (
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-semibold text-gray-800 mb-3">Today's Log</Text>
            <View className="flex-row flex-wrap gap-2">
              {todayLog.flow !== 'none' && (
                <View className="bg-red-50 px-3 py-1 rounded-full">
                  <Text className="text-red-600 text-xs font-medium">Flow: {FLOW_LABELS[todayLog.flow]}</Text>
                </View>
              )}
              {todayLog.bbt && (
                <View className="bg-blue-50 px-3 py-1 rounded-full">
                  <Text className="text-blue-600 text-xs font-medium">BBT: {todayLog.bbt}°C</Text>
                </View>
              )}
              {todayLog.symptoms.map((s) => (
                <View key={s} className="bg-purple-50 px-3 py-1 rounded-full">
                  <Text className="text-purple-600 text-xs font-medium">{s}</Text>
                </View>
              ))}
              {todayLog.notes ? (
                <Text className="text-gray-500 text-xs mt-2 w-full">{todayLog.notes}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Predictions */}
        {cycles.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-semibold text-gray-800 mb-3">Predictions</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-red-50 rounded-xl p-3">
                <Text className="text-xs text-gray-500 mb-1">Next period</Text>
                <Text className="font-bold text-red-600">{formatDate(nextPeriod)}</Text>
              </View>
              <View className="flex-1 bg-purple-50 rounded-xl p-3">
                <Text className="text-xs text-gray-500 mb-1">Ovulation</Text>
                <Text className="font-bold text-purple-600">{formatDate(ovulation)}</Text>
              </View>
            </View>
            {fertileWindow && (
              <View className="bg-green-50 rounded-xl p-3 mt-3">
                <Text className="text-xs text-gray-500 mb-1">Fertile window</Text>
                <Text className="font-bold text-green-600">
                  {formatDate(fertileWindow.start)} – {formatDate(fertileWindow.end)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Cycle History */}
        {pastCycles.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-8">
            <Text className="font-semibold text-gray-800 mb-3">Cycle History</Text>
            {pastCycles.map((c) => {
              const length = c.endDate
                ? Math.round((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                : null
              return (
                <View key={c.id} className="flex-row justify-between items-center py-3 border-b border-gray-50 last:border-0">
                  <Text className="text-gray-700 font-medium">{formatDate(c.startDate)}</Text>
                  {length !== null && (
                    <View className="bg-gray-100 px-3 py-1 rounded-full">
                      <Text className="text-gray-500 text-xs">{length} days</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {/* Empty state */}
        {cycles.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">🌙</Text>
            <Text className="text-gray-600 font-semibold mb-1">No cycle data yet</Text>
            <Text className="text-gray-400 text-sm text-center">
              Tap "Period Start" when your period begins to start tracking.
            </Text>
          </View>
        )}
      </ScrollView>

      <LogSymptomsModal visible={showLogModal} onClose={() => setShowLogModal(false)} />
    </SafeAreaView>
  )
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/\(tabs\)/tracker.tsx
git commit -m "feat: add Tracker screen with cycle wheel and predictions"
```

---

## Task 5: Register the Tracker tab in navigation

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

Add a 6th tab entry for the tracker screen with a Compass icon.

**Step 1: Update the layout**

Open [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx). Make these two changes:

1. Add `Compass` to the lucide import:
```ts
import { Home, Wallet, Activity, UtensilsCrossed, User, Compass } from 'lucide-react-native'
```

2. Add a new `Tabs.Screen` entry after the `me` screen:
```tsx
<Tabs.Screen name="tracker" options={{ title: 'Tracker', tabBarIcon: ({ color }) => <Compass size={22} color={color} /> }} />
```

**Step 2: Verify TypeScript and check no nav errors**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "feat: add Tracker tab to bottom navigation"
```

---

## Task 6: Manual smoke test

Start the dev server and verify on device/emulator:

```bash
npx expo start
```

Check:
1. "Tracker" tab appears in the bottom nav with a compass icon
2. Tapping it shows the screen with the cycle wheel and empty state message
3. Tapping "Period Start" logs the period and updates the wheel to Day 1 (red segment highlighted)
4. Tapping "Log Today" opens the modal — select flow, symptoms, BBT, notes, save
5. Today's log card appears below the wheel
6. Tapping "Period End" closes the cycle and adds it to history
7. Prediction cards appear after first cycle is logged
8. Cycle history shows past cycles after at least one is complete
```
