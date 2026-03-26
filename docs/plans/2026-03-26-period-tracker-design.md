# EveryDayApp — Period Tracker Design
**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Add a full-featured period and cycle tracker as a new dedicated sixth tab ("Period") in EveryDayApp. Includes cycle logging, symptom tracking, ovulation prediction, temperature/discharge logging, cycle statistics, rule-based insights, and notifications — including a custom birth control reminder.

---

## Approach

Single scrollable screen under a new bottom tab. All data is local-first via WatermelonDB, synced to Supabase. No third-party period tracking SDK — built from scratch to keep all data in-app. Notifications scheduled locally via `expo-notifications`.

---

## Architecture & Navigation

A new 6th bottom tab **"Period"** added to Expo Router alongside the existing 5 tabs.

**Screens:**
| File | Purpose |
|---|---|
| `app/(tabs)/period.tsx` | Main scrollable period tracking screen |
| `app/cycle-history.tsx` | Past cycle detail view |

**Supporting files:**
| File | Purpose |
|---|---|
| `components/period/` | All period-specific components |
| `db/models/PeriodLog.ts` | WatermelonDB model for daily log entries |
| `db/models/CycleEntry.ts` | WatermelonDB model for cycle records |
| `stores/periodStore.ts` | Zustand store for period state |
| `lib/cycleCalculations.ts` | Prediction + ovulation window logic |
| `lib/cycleNotifications.ts` | Notification scheduling logic |
| `supabase/migrations/..._period.sql` | Supabase migration for period tables |

---

## Data Models

### CycleEntry
```
id
start_date
end_date           — nullable until period ends
cycle_length       — computed on close
period_length      — computed on close
notes
```

### PeriodLog (one per day during/around cycle)
```
id
cycle_entry_id
date
flow               — none | spotting | light | medium | heavy
symptoms           — JSON array: cramps | bloating | headache | fatigue | acne | backache | nausea | tender_breasts
mood               — happy | sad | anxious | irritable | energetic | tired | neutral
temperature        — decimal (°C or °F per user setting)
discharge          — none | dry | sticky | creamy | watery | egg_white
notes
```

### BirthControlReminder
```
id
label
schedule_type      — custom
cron_expression
time
message
enabled
```

### UserCycleSettings
```
id
average_cycle_length    — default 28
average_period_length   — default 5
temperature_unit        — C | F
notifications_enabled
```

Predictions and ovulation window are computed in `lib/cycleCalculations.ts` from stored `CycleEntry` history — no separate stored predictions.

---

## Main Screen Layout

Single scrollable screen with these sections:

### 1. Cycle Status Card
Current phase (menstruation / follicular / ovulation / luteal), day of cycle, days until next period. Color-coded by phase.

### 2. Monthly Calendar
Horizontal scrollable month view. Days colored by:
- Period days — red
- Predicted period — pink/faded
- Ovulation window — green
- Fertile window — light green
- Today — outlined

Tap a day to jump to its log entry.

### 3. Today's Log
Inline form: flow selector, symptom chips (multi-select), mood picker, temperature input, discharge selector, notes field, Save button. If already logged today, shows summary with edit option.

### 4. Cycle Stats
Average cycle length, average period length, shortest/longest cycle, current streak of logged days.

### 5. Insights
Rule-based pattern observations computed from history:
- "Your cycle is typically X days"
- "You commonly experience cramps on day 1–2"
- "Temperature usually rises on day 14"

Shown as simple text cards. No AI — purely derived from logged data.

### 6. Birth Control Reminder
Card showing active reminder (time, message, next trigger). Tap to configure: label, time, custom message, on/off toggle.

---

## Cycle Prediction Logic

Implemented in `lib/cycleCalculations.ts`:
- **Next period start:** `last_start_date + average_cycle_length` (rolling average of last 3 cycles)
- **Fertile window:** days 10–17 of cycle (configurable based on average cycle length)
- **Ovulation day:** cycle_length − 14
- Rescheduling triggered whenever a new cycle is logged or predictions are recalculated

---

## Notifications

All notifications scheduled locally on-device via `expo-notifications`. Rescheduling triggered on cycle log or prediction update.

| Trigger | Message | Timing |
|---|---|---|
| Period approaching | "Your period is predicted to start in X days" | 2 days before predicted start |
| Ovulation window | "You're entering your fertile window today" | Day of predicted ovulation |
| Daily symptom reminder | "Don't forget to log today's symptoms" | User-set time (default 9pm), active period days only |
| Birth control | User-defined message | User-defined time + schedule |

---

## Future Considerations (Post-MVP)
- Export cycle data (CSV)
- Cycle correlation with mood/sleep/fitness data from other app tabs
- Partner sharing (share cycle phase with a friend/partner via the existing friend system)
- Apple Health / Google Health Connect integration for cycle data
