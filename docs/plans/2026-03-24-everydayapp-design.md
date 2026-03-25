# EveryDayApp — Design Document
**Date:** 2026-03-24
**Status:** Approved

---

## Overview

EveryDayApp is a cross-platform mobile application (iOS + Android) combining a financial tracker, fitness tracker, calorie/water tracker, habit tracker, and mood journal into a single daily-use tool. Built for personal use first, architected for potential public App Store release.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile framework | React Native + Expo (TypeScript) |
| Auth + cloud database | Supabase (Postgres + Auth + Storage) |
| Local/offline storage | WatermelonDB (SQLite-backed, sync-ready) |
| Navigation | Expo Router (file-based) |
| State management | Zustand |
| Styling | NativeWind (Tailwind for React Native) |

### Third-Party Integrations

| Feature | Service |
|---|---|
| Bank sync | Plaid Link SDK |
| Fitness (iOS) | Apple HealthKit via `react-native-health` |
| Fitness (Android) | Google Health Connect via `react-native-health-connect` |
| Garmin data | Garmin Health API (OAuth, proxied via Supabase Edge Functions) |
| Food database + barcode | OpenFoodFacts API |
| AI meal photo recognition | Claude Vision API (Anthropic) |
| Receipt OCR | Google Cloud Vision |

### Sync Strategy
- **Local-first:** All data written to WatermelonDB (SQLite) first — app works fully offline
- **Cloud sync:** WatermelonDB syncs to Supabase Postgres via built-in sync protocol when online
- **Server-side integrations:** Garmin and Plaid API calls handled via Supabase Edge Functions to keep API keys off the device
- **Health data:** HealthKit / Health Connect synced on-device via background tasks

---

## App Structure & Navigation

Five bottom tabs:

| Tab | Purpose |
|---|---|
| Home | Daily dashboard summary |
| Finance | Financial tracking |
| Fitness | Garmin + Health data |
| Nutrition | Calories, food logging, water |
| Me | Habits, tasks, mood, journal, settings |

### Screens

**Home (Dashboard)**
- Daily greeting + date
- Summary cards: net spend today, calories vs goal, water progress, steps, active habits, mood
- Impulse buy reminders due today
- Quick-add shortcuts (log water, log food, log expense)

**Finance**
- Monthly overview: balance, income vs expenses, spending by category chart
- Transactions list (Plaid auto-imported + manual entry)
- Receipt scanner (camera → OCR → pre-filled expense form)
- Income entry
- Impulse Buy Vault: pending items with countdown timers + reminder notifications
- Budget settings per category

**Fitness**
- Today's stats: steps, heart rate, calories burned, active minutes
- Sleep summary (last night)
- Garmin health metrics: HRV, stress, SpO2, body battery
- Workout history log
- Connected devices panel (Garmin, Apple Health, Google Health Connect)

**Nutrition**
- Daily calorie ring (consumed vs goal)
- Macros breakdown (protein, carbs, fat)
- Meal log (breakfast, lunch, dinner, snacks)
- Add food: barcode scan / food search / AI photo recognition
- Water tracker with daily goal + quick-add buttons (+250ml, +500ml, custom)

**Me**
- Habits: daily checklist with streaks and history calendar
- Tasks: simple to-do list
- Mood: daily emoji-based check-in + optional note
- Journal: free-form daily entries
- Settings: account, connected services, notifications, cloud sync toggle

---

## Data Models

### Finance
```
Transaction
  id, type (income | expense), amount, category, merchant,
  date, source (plaid | manual | receipt), receipt_image_url, notes

ImpulseBuy
  id, item_name, price, wait_days, created_at, remind_at,
  status (pending | bought | skipped)

Budget
  id, category, monthly_limit, month
```

### Fitness
```
GarminSync
  id, date, steps, heart_rate, calories_burned, active_minutes,
  sleep_hours, sleep_score, stress, hrv, spo2, body_battery, raw_json

Workout
  id, type, duration, calories, source (garmin | manual), date
```

### Nutrition
```
FoodEntry
  id, meal_type (breakfast | lunch | dinner | snack),
  food_name, calories, protein, carbs, fat,
  date, source (barcode | search | photo | manual)

WaterEntry
  id, amount_ml, date, time

NutritionGoal
  daily_calories, daily_protein, daily_carbs, daily_fat, daily_water_ml
```

### Habits & Journal
```
Habit
  id, name, icon, frequency (daily | weekly), created_at

HabitLog
  id, habit_id, completed_at, date

Task
  id, title, completed, due_date, created_at

MoodLog
  id, mood (1–5 + emoji), note, date

JournalEntry
  id, content, date, created_at
```

### User
```
Profile
  id, name, email, avatar_url, created_at

SyncSettings
  plaid_connected, garmin_connected, healthkit_connected, cloud_sync_enabled
```

---

## Key Flows

### Impulse Buy Flow
1. User enters item name, price, and wait duration
2. Saved locally with a `remind_at` timestamp
3. Push notification fires at `remind_at`: *"Do you still want [item] for $X?"*
4. User sees three options: **Buy it** (logs as expense) / **Skip it** (archived) / **Wait longer** (snooze)
5. Stats panel shows total money saved from skipped impulse buys

### Receipt Scanning Flow
1. User opens camera in Finance tab
2. Photo sent to Google Cloud Vision OCR
3. Merchant, date, line items, and total extracted
4. Pre-filled expense form shown for review/edit
5. Confirmed → saved as transaction, image stored in Supabase Storage

### AI Meal Photo Flow
1. User selects "Take Photo" in Add Food
2. Photo sent to Claude Vision API
3. Claude identifies food items and estimates portions, calories, and macros
4. Results shown as editable food entries
5. User confirms → logged to meal

### Garmin + Health Sync Flow
- Supabase Edge Function polls Garmin Health API every 30 minutes (server-side, OAuth tokens stored securely)
- On app open, checks last sync timestamp and pulls delta if stale
- HealthKit (iOS) and Health Connect (Android) synced on-device via background task

---

## Notifications

| Trigger | Message |
|---|---|
| Impulse buy reminder | "Do you still want [item] for $X?" |
| Daily water goal not met (8pm) | "You're [X]ml short of your water goal today" |
| Habit streak at risk (9pm) | "Don't break your [habit] streak — [X] days!" |
| Budget category over 80% | "You've used 80% of your [category] budget" |
| Daily mood check-in (8pm) | "How are you feeling today?" |

---

## Future Considerations (Post-MVP)
- Multi-user / family accounts
- AI-powered spending insights and financial advice
- Export data (CSV, PDF reports)
- Apple Watch / Wear OS companion app
- App Store / Play Store public release
