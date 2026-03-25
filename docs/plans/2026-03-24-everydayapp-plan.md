# EveryDayApp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a cross-platform iOS/Android daily companion app combining financial tracking, fitness tracking, nutrition/calorie/water logging, habit tracking, and mood journaling.

**Architecture:** Local-first mobile app using React Native (Expo) with WatermelonDB for offline SQLite storage synced to Supabase Postgres. Navigation via Expo Router with five main tabs. Third-party integrations (Plaid, Garmin, HealthKit, OpenFoodFacts, Claude Vision) handled via Supabase Edge Functions and on-device SDKs.

**Tech Stack:** React Native, Expo SDK 52+, TypeScript, Expo Router, NativeWind v4, Zustand, WatermelonDB, Supabase JS v2, Plaid Link SDK, react-native-health, react-native-health-connect, OpenFoodFacts API, Claude Vision API (Anthropic SDK), Google Cloud Vision API, Expo Notifications, Jest + React Native Testing Library

---

## Phase 1: Project Foundation

### Task 1: Initialize Expo Project

**Files:**
- Modify: `package.json` (created by Expo)
- Create: `app.json`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Initialize Expo in existing directory**

```bash
cd /home/j/Documents/EveryDayApp/EveryDayApp
npx create-expo-app@latest . --template blank-typescript
```

Expected: Expo project scaffolded with `app/`, `assets/`, `package.json`, `tsconfig.json`

**Step 2: Verify it runs**

```bash
npx expo start --no-dev
```

Expected: QR code displayed, no errors

**Step 3: Create `.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
GARMIN_CLIENT_ID=
GARMIN_CLIENT_SECRET=
GOOGLE_CLOUD_VISION_API_KEY=
ANTHROPIC_API_KEY=
```

**Step 4: Copy to `.env.local` and fill in values (skip for now, revisit in Task 6)**

```bash
cp .env.example .env.local
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: initialize Expo project"
```

---

### Task 2: Install Core Dependencies

**Step 1: Install navigation + UI dependencies**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

**Step 2: Install NativeWind + Tailwind**

```bash
npm install nativewind@^4.0.0
npm install --save-dev tailwindcss@^3.4.0
npx tailwindcss init
```

**Step 3: Install Zustand + async storage**

```bash
npm install zustand
npx expo install @react-native-async-storage/async-storage
```

**Step 4: Install Supabase**

```bash
npm install @supabase/supabase-js
npx expo install expo-secure-store
```

**Step 5: Install WatermelonDB**

```bash
npm install @nozbe/watermelondb
npm install --save-dev @nozbe/with-observables
npx expo install expo-sqlite
```

**Step 6: Install dev/test dependencies**

```bash
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: install core dependencies"
```

---

### Task 3: Configure TypeScript, NativeWind, Expo Router

**Files:**
- Modify: `tailwind.config.js`
- Modify: `babel.config.js`
- Modify: `tsconfig.json`
- Modify: `app.json`
- Create: `global.css`

**Step 1: Configure `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
      },
    },
  },
  plugins: [],
}
```

**Step 2: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 3: Configure `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
```

**Step 4: Update `app.json` to enable Expo Router**

Add under `expo`:
```json
{
  "expo": {
    "scheme": "everydayapp",
    "web": { "bundler": "metro" },
    "plugins": ["expo-router"]
  }
}
```

**Step 5: Update `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "nativewind-env.d.ts"]
}
```

**Step 6: Create `nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

**Step 7: Configure Jest in `package.json`**

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@nozbe/.*)"
    ]
  }
}
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: configure NativeWind, Expo Router, and TypeScript"
```

---

### Task 4: Build Navigation Shell

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx` (Home)
- Create: `app/(tabs)/finance.tsx`
- Create: `app/(tabs)/fitness.tsx`
- Create: `app/(tabs)/nutrition.tsx`
- Create: `app/(tabs)/me.tsx`
- Create: `components/ui/TabIcon.tsx`

**Step 1: Create root layout `app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import '../global.css'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  )
}
```

**Step 2: Create tab layout `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router'
import { Home, Wallet, Activity, UtensilsCrossed, User } from 'lucide-react-native'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e5e7eb' },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="finance" options={{ title: 'Finance', tabBarIcon: ({ color }) => <Wallet size={22} color={color} /> }} />
      <Tabs.Screen name="fitness" options={{ title: 'Fitness', tabBarIcon: ({ color }) => <Activity size={22} color={color} /> }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Nutrition', tabBarIcon: ({ color }) => <UtensilsCrossed size={22} color={color} /> }} />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  )
}
```

**Step 3: Install lucide-react-native**

```bash
npm install lucide-react-native react-native-svg
npx expo install react-native-svg
```

**Step 4: Create placeholder screens (repeat pattern for all 5 tabs)**

`app/(tabs)/index.tsx`:
```tsx
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-bold text-gray-800">Home</Text>
      </View>
    </SafeAreaView>
  )
}
```

Repeat for `finance.tsx`, `fitness.tsx`, `nutrition.tsx`, `me.tsx` with appropriate titles.

**Step 5: Verify navigation works**

```bash
npx expo start
```

Expected: App loads with 5 bottom tabs, each showing placeholder screen

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add five-tab navigation shell"
```

---

## Phase 2: Auth & Supabase

### Task 5: Set Up Supabase Project

**Step 1: Create Supabase project at supabase.com**
- New project → name: "EveryDayApp"
- Note the Project URL and anon key
- Fill in `.env.local` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Step 2: Create Supabase client `lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

**Step 3: Write test `__tests__/lib/supabase.test.ts`**

```ts
import { supabase } from '@/lib/supabase'

describe('supabase client', () => {
  it('is defined', () => {
    expect(supabase).toBeDefined()
  })
  it('has auth object', () => {
    expect(supabase.auth).toBeDefined()
  })
})
```

**Step 4: Run test**

```bash
npx jest __tests__/lib/supabase.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client with SecureStore adapter"
```

---

### Task 6: Auth Store + Screens

**Files:**
- Create: `stores/authStore.ts`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/sign-in.tsx`
- Create: `app/(auth)/sign-up.tsx`
- Modify: `app/_layout.tsx`

**Step 1: Write failing test `__tests__/stores/authStore.test.ts`**

```ts
import { useAuthStore } from '@/stores/authStore'

describe('authStore', () => {
  it('starts with no session', () => {
    const { session } = useAuthStore.getState()
    expect(session).toBeNull()
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/stores/authStore.test.ts
```

Expected: FAIL — "Cannot find module"

**Step 3: Create `stores/authStore.ts`**

```ts
import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  loading: boolean
  setSession: (session: Session | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  setSession: (session) => set({ session, loading: false }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null })
  },
}))
```

**Step 4: Run test — expect PASS**

```bash
npx jest __tests__/stores/authStore.test.ts
```

**Step 5: Update root layout to handle auth routing**

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import '../global.css'

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </SafeAreaProvider>
  )
}
```

**Step 6: Create `app/(auth)/sign-in.tsx`**

```tsx
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return Alert.alert('Error', error.message)
    router.replace('/(tabs)')
  }

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <Text className="text-3xl font-bold text-gray-900 mb-8">Sign In</Text>
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-900"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-900"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        className="bg-primary rounded-xl py-4 items-center"
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text className="text-white font-semibold text-base">{loading ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>
      <TouchableOpacity className="mt-4 items-center" onPress={() => router.push('/(auth)/sign-up')}>
        <Text className="text-primary">Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  )
}
```

**Step 7: Create `app/(auth)/sign-up.tsx`** (same pattern as sign-in, calls `supabase.auth.signUp`)

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add auth store and sign-in/sign-up screens"
```

---

## Phase 3: WatermelonDB Local Database

### Task 7: WatermelonDB Schema

**Files:**
- Create: `db/schema.ts`
- Create: `db/index.ts`
- Create: `db/models/Transaction.ts`
- Create: `db/models/ImpulseBuy.ts`
- Create: `db/models/FoodEntry.ts`
- Create: `db/models/WaterEntry.ts`
- Create: `db/models/GarminSync.ts`
- Create: `db/models/Habit.ts`
- Create: `db/models/HabitLog.ts`
- Create: `db/models/MoodLog.ts`
- Create: `db/models/JournalEntry.ts`
- Create: `db/models/Task.ts`

**Step 1: Create `db/schema.ts`**

```ts
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'type', type: 'string' },       // income | expense
        { name: 'amount', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'merchant', type: 'string', isOptional: true },
        { name: 'date', type: 'number' },        // unix timestamp
        { name: 'source', type: 'string' },      // plaid | manual | receipt
        { name: 'receipt_image_url', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'impulse_buys',
      columns: [
        { name: 'item_name', type: 'string' },
        { name: 'price', type: 'number' },
        { name: 'wait_days', type: 'number' },
        { name: 'remind_at', type: 'number' },
        { name: 'status', type: 'string' },      // pending | bought | skipped
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'food_entries',
      columns: [
        { name: 'meal_type', type: 'string' },   // breakfast | lunch | dinner | snack
        { name: 'food_name', type: 'string' },
        { name: 'calories', type: 'number' },
        { name: 'protein', type: 'number' },
        { name: 'carbs', type: 'number' },
        { name: 'fat', type: 'number' },
        { name: 'date', type: 'number' },
        { name: 'source', type: 'string' },      // barcode | search | photo | manual
      ],
    }),
    tableSchema({
      name: 'water_entries',
      columns: [
        { name: 'amount_ml', type: 'number' },
        { name: 'date', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'garmin_syncs',
      columns: [
        { name: 'date', type: 'number' },
        { name: 'steps', type: 'number', isOptional: true },
        { name: 'heart_rate', type: 'number', isOptional: true },
        { name: 'calories_burned', type: 'number', isOptional: true },
        { name: 'active_minutes', type: 'number', isOptional: true },
        { name: 'sleep_hours', type: 'number', isOptional: true },
        { name: 'sleep_score', type: 'number', isOptional: true },
        { name: 'stress', type: 'number', isOptional: true },
        { name: 'hrv', type: 'number', isOptional: true },
        { name: 'spo2', type: 'number', isOptional: true },
        { name: 'body_battery', type: 'number', isOptional: true },
        { name: 'raw_json', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'habits',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'frequency', type: 'string' },   // daily | weekly
        { name: 'created_at', type: 'number' },
        { name: 'archived', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'habit_logs',
      columns: [
        { name: 'habit_id', type: 'string', isIndexed: true },
        { name: 'completed_at', type: 'number' },
        { name: 'date', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'mood_logs',
      columns: [
        { name: 'mood', type: 'number' },         // 1-5
        { name: 'emoji', type: 'string', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'date', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'journal_entries',
      columns: [
        { name: 'content', type: 'string' },
        { name: 'date', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'completed', type: 'boolean' },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
})
```

**Step 2: Create `db/index.ts`**

```ts
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { schema } from './schema'

const adapter = new SQLiteAdapter({
  schema,
  onSetUpError: (error) => {
    console.error('Database setup error:', error)
  },
})

export const database = new Database({
  adapter,
  modelClasses: [], // populated as models are added
})
```

**Step 3: Create model `db/models/Transaction.ts`**

```ts
import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Transaction extends Model {
  static table = 'transactions'

  @field('type') type!: string
  @field('amount') amount!: number
  @field('category') category!: string
  @field('merchant') merchant!: string | null
  @date('date') date!: Date
  @field('source') source!: string
  @field('receipt_image_url') receiptImageUrl!: string | null
  @field('notes') notes!: string | null
}
```

Repeat the model pattern for each table: `ImpulseBuy`, `FoodEntry`, `WaterEntry`, `GarminSync`, `Habit`, `HabitLog`, `MoodLog`, `JournalEntry`, `Task` — using the same `@field` / `@date` / `@readonly` decorator pattern.

**Step 4: Register models in `db/index.ts`**

Import all model classes and add to `modelClasses` array.

**Step 5: Write test `__tests__/db/schema.test.ts`**

```ts
import { schema } from '@/db/schema'

describe('database schema', () => {
  it('has all required tables', () => {
    const tableNames = schema.tables.map((t: any) => t.name)
    expect(tableNames).toContain('transactions')
    expect(tableNames).toContain('impulse_buys')
    expect(tableNames).toContain('food_entries')
    expect(tableNames).toContain('water_entries')
    expect(tableNames).toContain('habits')
    expect(tableNames).toContain('mood_logs')
  })
})
```

**Step 6: Run test**

```bash
npx jest __tests__/db/schema.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add WatermelonDB schema and model classes"
```

---

## Phase 4: Dashboard Screen

### Task 8: Dashboard UI + Summary Cards

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Create: `components/dashboard/SummaryCard.tsx`
- Create: `components/dashboard/QuickAdd.tsx`

**Step 1: Write test `__tests__/components/SummaryCard.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react-native'
import { SummaryCard } from '@/components/dashboard/SummaryCard'

describe('SummaryCard', () => {
  it('renders title and value', () => {
    render(<SummaryCard title="Steps" value="8,432" icon="activity" color="blue" />)
    expect(screen.getByText('Steps')).toBeTruthy()
    expect(screen.getByText('8,432')).toBeTruthy()
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/components/SummaryCard.test.tsx
```

**Step 3: Create `components/dashboard/SummaryCard.tsx`**

```tsx
import { View, Text } from 'react-native'

interface SummaryCardProps {
  title: string
  value: string
  subtitle?: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const colorMap = {
  blue: 'bg-blue-50 border-blue-100',
  green: 'bg-green-50 border-green-100',
  purple: 'bg-purple-50 border-purple-100',
  orange: 'bg-orange-50 border-orange-100',
  red: 'bg-red-50 border-red-100',
}

export function SummaryCard({ title, value, subtitle, color }: SummaryCardProps) {
  return (
    <View className={`flex-1 rounded-2xl border p-4 ${colorMap[color]}`}>
      <Text className="text-xs text-gray-500 mb-1">{title}</Text>
      <Text className="text-xl font-bold text-gray-900">{value}</Text>
      {subtitle && <Text className="text-xs text-gray-400 mt-1">{subtitle}</Text>}
    </View>
  )
}
```

**Step 4: Run test — expect PASS**

```bash
npx jest __tests__/components/SummaryCard.test.tsx
```

**Step 5: Build full Dashboard screen `app/(tabs)/index.tsx`**

```tsx
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SummaryCard } from '@/components/dashboard/SummaryCard'

export default function HomeScreen() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-gray-500 text-sm">{today}</Text>
        <Text className="text-2xl font-bold text-gray-900 mt-1 mb-6">Good morning</Text>

        {/* Row 1: Finance + Steps */}
        <View className="flex-row gap-3 mb-3">
          <SummaryCard title="Spent Today" value="$0.00" color="blue" />
          <SummaryCard title="Steps" value="—" color="green" />
        </View>

        {/* Row 2: Calories + Water */}
        <View className="flex-row gap-3 mb-3">
          <SummaryCard title="Calories" value="0 / 2000" color="orange" />
          <SummaryCard title="Water" value="0 / 2500ml" color="blue" />
        </View>

        {/* Row 3: Mood + Active Habits */}
        <View className="flex-row gap-3 mb-6">
          <SummaryCard title="Mood" value="—" color="purple" />
          <SummaryCard title="Habits" value="0 done" color="green" />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add dashboard with summary cards"
```

---

## Phase 5: Finance Module

### Task 9: Finance Store + Manual Transaction Entry

**Files:**
- Create: `stores/financeStore.ts`
- Create: `app/(tabs)/finance.tsx`
- Create: `components/finance/AddTransactionModal.tsx`
- Create: `__tests__/stores/financeStore.test.ts`

**Step 1: Write failing test**

```ts
import { useFinanceStore } from '@/stores/financeStore'

describe('financeStore', () => {
  it('starts with empty transactions', () => {
    expect(useFinanceStore.getState().transactions).toEqual([])
  })

  it('adds a transaction', () => {
    const store = useFinanceStore.getState()
    store.addTransaction({ type: 'expense', amount: 10, category: 'food', date: Date.now(), source: 'manual' })
    expect(useFinanceStore.getState().transactions).toHaveLength(1)
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/stores/financeStore.test.ts
```

**Step 3: Create `stores/financeStore.ts`**

```ts
import { create } from 'zustand'

export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  merchant?: string
  date: number
  source: 'plaid' | 'manual' | 'receipt'
  receiptImageUrl?: string
  notes?: string
}

interface FinanceState {
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  removeTransaction: (id: string) => void
}

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  addTransaction: (t) =>
    set((state) => ({
      transactions: [...state.transactions, { ...t, id: Date.now().toString() }],
    })),
  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),
}))
```

**Step 4: Run test — expect PASS**

```bash
npx jest __tests__/stores/financeStore.test.ts
```

**Step 5: Build Finance screen `app/(tabs)/finance.tsx`**

```tsx
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { Plus } from 'lucide-react-native'
import { useFinanceStore } from '@/stores/financeStore'
import { AddTransactionModal } from '@/components/finance/AddTransactionModal'

export default function FinanceScreen() {
  const [showAdd, setShowAdd] = useState(false)
  const transactions = useFinanceStore((s) => s.transactions)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-6 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Finance</Text>
        <View className="flex-row gap-3 mt-4">
          <View className="flex-1 bg-green-50 rounded-2xl p-4">
            <Text className="text-xs text-gray-500">Income</Text>
            <Text className="text-lg font-bold text-green-600">${totalIncome.toFixed(2)}</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-2xl p-4">
            <Text className="text-xs text-gray-500">Expenses</Text>
            <Text className="text-lg font-bold text-red-500">${totalExpenses.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mx-4 mb-2 bg-white rounded-xl p-4 flex-row justify-between">
            <View>
              <Text className="font-medium text-gray-800">{item.merchant || item.category}</Text>
              <Text className="text-xs text-gray-400">{item.category}</Text>
            </View>
            <Text className={`font-semibold ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
              {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-gray-400">No transactions yet</Text>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute bottom-8 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => setShowAdd(true)}
      >
        <Plus color="white" size={24} />
      </TouchableOpacity>

      <AddTransactionModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </SafeAreaView>
  )
}
```

**Step 6: Create `components/finance/AddTransactionModal.tsx`**

```tsx
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { useState } from 'react'
import { useFinanceStore } from '@/stores/financeStore'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other']

interface Props { visible: boolean; onClose: () => void }

export function AddTransactionModal({ visible, onClose }: Props) {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [merchant, setMerchant] = useState('')
  const addTransaction = useFinanceStore((s) => s.addTransaction)

  const handleSave = () => {
    if (!amount) return
    addTransaction({ type, amount: parseFloat(amount), category, merchant, date: Date.now(), source: 'manual' })
    setAmount('')
    setMerchant('')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white px-6 pt-8">
        <Text className="text-xl font-bold text-gray-900 mb-6">Add Transaction</Text>

        {/* Type toggle */}
        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              className={`flex-1 py-2 rounded-lg items-center ${type === t ? 'bg-white shadow' : ''}`}
              onPress={() => setType(t)}
            >
              <Text className={`font-medium ${type === t ? 'text-gray-900' : 'text-gray-400'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-2xl font-bold"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4"
          placeholder="Merchant (optional)"
          value={merchant}
          onChangeText={setMerchant}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              className={`mr-2 px-4 py-2 rounded-full border ${category === cat ? 'bg-primary border-primary' : 'border-gray-200'}`}
              onPress={() => setCategory(cat)}
            >
              <Text className={category === cat ? 'text-white' : 'text-gray-600'}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity className="bg-primary rounded-xl py-4 items-center" onPress={handleSave}>
          <Text className="text-white font-semibold">Save</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-3 items-center" onPress={onClose}>
          <Text className="text-gray-400">Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add finance screen with manual transaction entry"
```

---

### Task 10: Receipt Scanner (OCR)

**Files:**
- Create: `components/finance/ReceiptScanner.tsx`
- Create: `lib/ocr.ts`
- Create: `__tests__/lib/ocr.test.ts`

**Step 1: Install camera dependency**

```bash
npx expo install expo-camera expo-image-picker
```

**Step 2: Write failing test `__tests__/lib/ocr.test.ts`**

```ts
import { parseReceiptResponse } from '@/lib/ocr'

describe('parseReceiptResponse', () => {
  it('extracts total from OCR text', () => {
    const text = 'TOTAL: $24.99\nThank you'
    const result = parseReceiptResponse(text)
    expect(result.total).toBe(24.99)
  })

  it('returns null total if not found', () => {
    const result = parseReceiptResponse('no price here')
    expect(result.total).toBeNull()
  })
})
```

**Step 3: Run test — expect FAIL**

```bash
npx jest __tests__/lib/ocr.test.ts
```

**Step 4: Create `lib/ocr.ts`**

```ts
export interface OcrReceiptResult {
  total: number | null
  merchant: string | null
  date: string | null
  rawText: string
}

export function parseReceiptResponse(text: string): OcrReceiptResult {
  const totalMatch = text.match(/total[:\s]+\$?([\d.]+)/i)
  const merchantMatch = text.split('\n')[0]?.trim() || null
  const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)

  return {
    total: totalMatch ? parseFloat(totalMatch[1]) : null,
    merchant: merchantMatch,
    date: dateMatch ? dateMatch[0] : null,
    rawText: text,
  }
}

export async function scanReceiptImage(base64Image: string): Promise<OcrReceiptResult> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'TEXT_DETECTION' }],
        }],
      }),
    }
  )
  const data = await response.json()
  const text = data.responses?.[0]?.fullTextAnnotation?.text || ''
  return parseReceiptResponse(text)
}
```

**Step 5: Run test — expect PASS**

```bash
npx jest __tests__/lib/ocr.test.ts
```

**Step 6: Create `components/finance/ReceiptScanner.tsx`**

```tsx
import { View, TouchableOpacity, Text, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { scanReceiptImage } from '@/lib/ocr'

interface Props {
  onResult: (result: { total: number | null; merchant: string | null }) => void
}

export function ReceiptScanner({ onResult }: Props) {
  const handleScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return Alert.alert('Permission needed', 'Camera access is required to scan receipts')

    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
    if (result.canceled || !result.assets[0].base64) return

    const parsed = await scanReceiptImage(result.assets[0].base64)
    onResult({ total: parsed.total, merchant: parsed.merchant })
  }

  return (
    <TouchableOpacity
      className="flex-row items-center gap-2 border border-gray-200 rounded-xl px-4 py-3"
      onPress={handleScan}
    >
      <Camera size={18} color="#6366f1" />
      <Text className="text-primary font-medium">Scan Receipt</Text>
    </TouchableOpacity>
  )
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add receipt scanner with Google Vision OCR"
```

---

### Task 11: Impulse Buy Feature

**Files:**
- Create: `stores/impulseBuyStore.ts`
- Create: `components/finance/ImpulseBuyVault.tsx`
- Create: `components/finance/AddImpulseBuyModal.tsx`
- Create: `__tests__/stores/impulseBuyStore.test.ts`

**Step 1: Write failing test**

```ts
import { useImpulseBuyStore } from '@/stores/impulseBuyStore'

describe('impulseBuyStore', () => {
  it('calculates remind_at from wait_days', () => {
    const store = useImpulseBuyStore.getState()
    const before = Date.now()
    store.addImpulseBuy({ itemName: 'AirPods', price: 179, waitDays: 7 })
    const item = useImpulseBuyStore.getState().items[0]
    const expectedMin = before + 7 * 24 * 60 * 60 * 1000
    expect(item.remindAt).toBeGreaterThanOrEqual(expectedMin - 1000)
    expect(item.status).toBe('pending')
  })
})
```

**Step 2: Run test — expect FAIL**

**Step 3: Create `stores/impulseBuyStore.ts`**

```ts
import { create } from 'zustand'

export interface ImpulseBuy {
  id: string
  itemName: string
  price: number
  waitDays: number
  createdAt: number
  remindAt: number
  status: 'pending' | 'bought' | 'skipped'
}

interface ImpulseBuyState {
  items: ImpulseBuy[]
  addImpulseBuy: (input: { itemName: string; price: number; waitDays: number }) => void
  updateStatus: (id: string, status: ImpulseBuy['status']) => void
  snooze: (id: string, extraDays: number) => void
}

export const useImpulseBuyStore = create<ImpulseBuyState>((set) => ({
  items: [],
  addImpulseBuy: ({ itemName, price, waitDays }) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: Date.now().toString(),
          itemName,
          price,
          waitDays,
          createdAt: Date.now(),
          remindAt: Date.now() + waitDays * 24 * 60 * 60 * 1000,
          status: 'pending',
        },
      ],
    })),
  updateStatus: (id, status) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, status } : item)),
    })),
  snooze: (id, extraDays) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, remindAt: item.remindAt + extraDays * 24 * 60 * 60 * 1000 }
          : item
      ),
    })),
}))
```

**Step 4: Run test — expect PASS**

**Step 5: Create `components/finance/AddImpulseBuyModal.tsx`**

```tsx
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import { useImpulseBuyStore } from '@/stores/impulseBuyStore'

const WAIT_OPTIONS = [{ label: '3 days', days: 3 }, { label: '1 week', days: 7 }, { label: '2 weeks', days: 14 }, { label: '1 month', days: 30 }]

interface Props { visible: boolean; onClose: () => void }

export function AddImpulseBuyModal({ visible, onClose }: Props) {
  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [waitDays, setWaitDays] = useState(7)
  const addImpulseBuy = useImpulseBuyStore((s) => s.addImpulseBuy)

  const handleSave = () => {
    if (!itemName || !price) return
    addImpulseBuy({ itemName, price: parseFloat(price), waitDays })
    setItemName('')
    setPrice('')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white px-6 pt-8">
        <Text className="text-xl font-bold text-gray-900 mb-2">Add Impulse Buy</Text>
        <Text className="text-gray-500 text-sm mb-6">Set a waiting period before deciding to buy</Text>

        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4"
          placeholder="What do you want to buy?"
          value={itemName}
          onChangeText={setItemName}
        />
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-6"
          placeholder="Price ($)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        <Text className="font-medium text-gray-700 mb-3">Wait how long?</Text>
        <View className="flex-row flex-wrap gap-2 mb-8">
          {WAIT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.days}
              className={`px-4 py-2 rounded-full border ${waitDays === opt.days ? 'bg-primary border-primary' : 'border-gray-200'}`}
              onPress={() => setWaitDays(opt.days)}
            >
              <Text className={waitDays === opt.days ? 'text-white' : 'text-gray-600'}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity className="bg-primary rounded-xl py-4 items-center" onPress={handleSave}>
          <Text className="text-white font-semibold">Start Waiting Period</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-3 items-center" onPress={onClose}>
          <Text className="text-gray-400">Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}
```

**Step 6: Create `components/finance/ImpulseBuyVault.tsx`** — lists pending impulse buys with countdown, Buy/Skip/Snooze buttons using `useImpulseBuyStore`

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add impulse buy vault with cooling-off period"
```

---

### Task 12: Plaid Bank Sync

**Files:**
- Create: `lib/plaid.ts`
- Create: `components/finance/PlaidConnectButton.tsx`
- Create: `supabase/functions/plaid-link-token/index.ts`
- Create: `supabase/functions/plaid-exchange-token/index.ts`

**Step 1: Install Plaid SDK**

```bash
npm install react-native-plaid-link-sdk
```

**Step 2: Create Supabase Edge Function `supabase/functions/plaid-link-token/index.ts`**

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'npm:plaid'

const plaid = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments.sandbox, // change to production when ready
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID'),
      'PLAID-SECRET': Deno.env.get('PLAID_SECRET'),
    },
  },
}))

serve(async (req) => {
  const { userId } = await req.json()
  const response = await plaid.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'EveryDayApp',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  })
  return new Response(JSON.stringify({ link_token: response.data.link_token }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

**Step 3: Create Supabase Edge Function `supabase/functions/plaid-exchange-token/index.ts`**

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { Configuration, PlaidApi, PlaidEnvironments } from 'npm:plaid'
import { createClient } from 'npm:@supabase/supabase-js'

const plaid = new PlaidApi(/* same config */)

serve(async (req) => {
  const { publicToken, userId } = await req.json()
  const { data } = await plaid.itemPublicTokenExchange({ public_token: publicToken })
  const accessToken = data.access_token

  // Store encrypted access token in Supabase
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  await supabase.from('plaid_tokens').upsert({ user_id: userId, access_token: accessToken })

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
})
```

**Step 4: Create `components/finance/PlaidConnectButton.tsx`**

```tsx
import { TouchableOpacity, Text, Alert } from 'react-native'
import { PlaidLink, LinkSuccess, LinkExit } from 'react-native-plaid-link-sdk'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function PlaidConnectButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null)

  useEffect(() => {
    const fetchToken = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.functions.invoke('plaid-link-token', { body: { userId: user?.id } })
      setLinkToken(data.link_token)
    }
    fetchToken()
  }, [])

  if (!linkToken) return null

  return (
    <PlaidLink
      tokenConfig={{ token: linkToken }}
      onSuccess={async (success: LinkSuccess) => {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.functions.invoke('plaid-exchange-token', {
          body: { publicToken: success.publicToken, userId: user?.id },
        })
        Alert.alert('Success', 'Bank account connected!')
      }}
      onExit={(_exit: LinkExit) => {}}
    >
      <TouchableOpacity className="bg-green-500 rounded-xl py-3 px-6 items-center">
        <Text className="text-white font-semibold">Connect Bank Account</Text>
      </TouchableOpacity>
    </PlaidLink>
  )
}
```

**Step 5: Create Supabase Edge Function for transaction sync `supabase/functions/plaid-sync-transactions/index.ts`** — fetches transactions from Plaid and upserts into Supabase `transactions` table

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Plaid bank sync via Supabase Edge Functions"
```

---

## Phase 6: Fitness Module

### Task 13: Garmin Health API Integration

**Files:**
- Create: `supabase/functions/garmin-sync/index.ts`
- Create: `stores/fitnessStore.ts`
- Create: `app/(tabs)/fitness.tsx`

**Step 1: Create Garmin sync Edge Function `supabase/functions/garmin-sync/index.ts`**

```ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js'

serve(async (req) => {
  const { userId } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Fetch stored Garmin OAuth token
  const { data: tokenRow } = await supabase.from('garmin_tokens').select('*').eq('user_id', userId).single()
  if (!tokenRow) return new Response(JSON.stringify({ error: 'No Garmin token' }), { status: 401 })

  // Fetch daily summary from Garmin Health API
  const today = new Date().toISOString().split('T')[0]
  const garminRes = await fetch(
    `https://healthapi.garmin.com/wellness-api/rest/dailies?uploadStartTimeInSeconds=${Math.floor(Date.now() / 1000) - 86400}&uploadEndTimeInSeconds=${Math.floor(Date.now() / 1000)}`,
    { headers: { Authorization: `Bearer ${tokenRow.access_token}` } }
  )
  const garminData = await garminRes.json()
  const daily = garminData.dailies?.[0]

  if (daily) {
    await supabase.from('garmin_syncs').upsert({
      user_id: userId,
      date: today,
      steps: daily.totalSteps,
      heart_rate: daily.averageHeartRateInBeatsPerMinute,
      calories_burned: daily.activeKilocalories,
      active_minutes: daily.moderateIntensityMinutes + daily.vigorousIntensityMinutes,
      sleep_hours: daily.sleepingSeconds / 3600,
      stress: daily.averageStressLevel,
      body_battery: daily.bodyBatteryHighestValue,
      raw_json: JSON.stringify(daily),
    })
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
})
```

**Step 2: Write failing test `__tests__/stores/fitnessStore.test.ts`**

```ts
import { useFitnessStore } from '@/stores/fitnessStore'

describe('fitnessStore', () => {
  it('starts with no data', () => {
    expect(useFitnessStore.getState().todayStats).toBeNull()
  })

  it('sets today stats', () => {
    useFitnessStore.getState().setTodayStats({ steps: 8000, heartRate: 72, caloriesBurned: 400 })
    expect(useFitnessStore.getState().todayStats?.steps).toBe(8000)
  })
})
```

**Step 3: Run test — expect FAIL**

**Step 4: Create `stores/fitnessStore.ts`**

```ts
import { create } from 'zustand'

interface TodayStats {
  steps: number
  heartRate: number
  caloriesBurned: number
  activeMinutes?: number
  sleepHours?: number
  sleepScore?: number
  stress?: number
  hrv?: number
  spo2?: number
  bodyBattery?: number
}

interface FitnessState {
  todayStats: TodayStats | null
  lastSyncAt: number | null
  setTodayStats: (stats: TodayStats) => void
  setLastSyncAt: (ts: number) => void
}

export const useFitnessStore = create<FitnessState>((set) => ({
  todayStats: null,
  lastSyncAt: null,
  setTodayStats: (stats) => set({ todayStats: stats }),
  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),
}))
```

**Step 5: Run test — expect PASS**

**Step 6: Build `app/(tabs)/fitness.tsx`**

```tsx
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFitnessStore } from '@/stores/fitnessStore'
import { supabase } from '@/lib/supabase'

export default function FitnessScreen() {
  const { todayStats, setTodayStats } = useFitnessStore()

  const syncGarmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.functions.invoke('garmin-sync', { body: { userId: user?.id } })
    // After sync, fetch latest from Supabase
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('garmin_syncs').select('*').eq('date', today).single()
    if (data) setTodayStats({ steps: data.steps, heartRate: data.heart_rate, caloriesBurned: data.calories_burned, activeMinutes: data.active_minutes, sleepHours: data.sleep_hours, stress: data.stress, bodyBattery: data.body_battery })
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Fitness</Text>

        <View className="flex-row flex-wrap gap-3 mb-6">
          {[
            { label: 'Steps', value: todayStats?.steps?.toLocaleString() ?? '—' },
            { label: 'Heart Rate', value: todayStats?.heartRate ? `${todayStats.heartRate} bpm` : '—' },
            { label: 'Calories', value: todayStats?.caloriesBurned ? `${todayStats.caloriesBurned} kcal` : '—' },
            { label: 'Active Min', value: todayStats?.activeMinutes ? `${todayStats.activeMinutes}m` : '—' },
            { label: 'Sleep', value: todayStats?.sleepHours ? `${todayStats.sleepHours.toFixed(1)}h` : '—' },
            { label: 'Stress', value: todayStats?.stress?.toString() ?? '—' },
            { label: 'Body Battery', value: todayStats?.bodyBattery?.toString() ?? '—' },
          ].map((stat) => (
            <View key={stat.label} className="bg-white rounded-2xl p-4 w-[47%]">
              <Text className="text-xs text-gray-500">{stat.label}</Text>
              <Text className="text-xl font-bold text-gray-900 mt-1">{stat.value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity className="bg-primary rounded-xl py-4 items-center" onPress={syncGarmin}>
          <Text className="text-white font-semibold">Sync Garmin Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Garmin sync Edge Function and fitness dashboard"
```

---

### Task 14: Apple HealthKit + Google Health Connect

**Files:**
- Create: `lib/healthSync.ts`
- Create: `__tests__/lib/healthSync.test.ts`

**Step 1: Install health libraries**

```bash
npm install react-native-health react-native-health-connect
npx expo install expo-dev-client
```

Note: These libraries require a development build (not Expo Go). Run `npx expo run:ios` and `npx expo run:android`.

**Step 2: Write failing test**

```ts
import { normalizeHealthData } from '@/lib/healthSync'

describe('normalizeHealthData', () => {
  it('normalizes HealthKit step data', () => {
    const raw = { value: 8432, startDate: '2026-03-24', endDate: '2026-03-24' }
    const result = normalizeHealthData('steps', raw)
    expect(result.value).toBe(8432)
    expect(result.type).toBe('steps')
  })
})
```

**Step 3: Run test — expect FAIL**

**Step 4: Create `lib/healthSync.ts`**

```ts
import { Platform } from 'react-native'

export interface HealthDataPoint {
  type: string
  value: number
  date: string
}

export function normalizeHealthData(type: string, raw: any): HealthDataPoint {
  return { type, value: raw.value ?? raw.quantity ?? 0, date: raw.startDate ?? raw.date }
}

export async function fetchTodayHealthData(): Promise<Partial<{
  steps: number; heartRate: number; caloriesBurned: number; sleepHours: number
}>> {
  if (Platform.OS === 'ios') {
    return fetchHealthKitData()
  } else {
    return fetchHealthConnectData()
  }
}

async function fetchHealthKitData() {
  // Dynamically import to avoid Android import errors
  const AppleHealthKit = (await import('react-native-health')).default
  return new Promise<any>((resolve) => {
    AppleHealthKit.initHealthKit({ permissions: { read: ['Steps', 'HeartRate', 'ActiveEnergyBurned', 'SleepAnalysis'] } }, () => {
      AppleHealthKit.getStepCount({ date: new Date().toISOString() }, (_err: any, results: any) => {
        resolve({ steps: results.value })
      })
    })
  })
}

async function fetchHealthConnectData() {
  const { initialize, readRecords } = await import('react-native-health-connect')
  await initialize()
  const today = new Date().toISOString().split('T')[0]
  const steps = await readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime: `${today}T00:00:00Z`, endTime: `${today}T23:59:59Z` } })
  return { steps: steps.records.reduce((sum: number, r: any) => sum + r.count, 0) }
}
```

**Step 5: Run test — expect PASS**

```bash
npx jest __tests__/lib/healthSync.test.ts
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add HealthKit and Health Connect sync abstraction"
```

---

## Phase 7: Nutrition Module

### Task 15: Calorie + Macro Tracker UI

**Files:**
- Create: `stores/nutritionStore.ts`
- Create: `app/(tabs)/nutrition.tsx`
- Create: `components/nutrition/CalorieRing.tsx`
- Create: `__tests__/stores/nutritionStore.test.ts`

**Step 1: Write failing test**

```ts
import { useNutritionStore } from '@/stores/nutritionStore'

describe('nutritionStore', () => {
  it('calculates total calories for today', () => {
    const store = useNutritionStore.getState()
    const today = new Date().toISOString().split('T')[0]
    store.addFoodEntry({ mealType: 'breakfast', foodName: 'Oats', calories: 300, protein: 10, carbs: 50, fat: 5, date: today, source: 'manual' })
    store.addFoodEntry({ mealType: 'lunch', foodName: 'Chicken', calories: 400, protein: 40, carbs: 0, fat: 8, date: today, source: 'manual' })
    expect(useNutritionStore.getState().getTotalCalories(today)).toBe(700)
  })
})
```

**Step 2: Run test — expect FAIL**

**Step 3: Create `stores/nutritionStore.ts`**

```ts
import { create } from 'zustand'

export interface FoodEntry {
  id: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foodName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  date: string  // YYYY-MM-DD
  source: 'barcode' | 'search' | 'photo' | 'manual'
}

interface NutritionGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
  waterMl: number
}

interface NutritionState {
  entries: FoodEntry[]
  waterEntries: { id: string; amountMl: number; date: string; time: number }[]
  goals: NutritionGoals
  addFoodEntry: (entry: Omit<FoodEntry, 'id'>) => void
  removeFoodEntry: (id: string) => void
  addWater: (amountMl: number) => void
  getTotalCalories: (date: string) => number
  getTotalWater: (date: string) => number
  getMacros: (date: string) => { protein: number; carbs: number; fat: number }
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  entries: [],
  waterEntries: [],
  goals: { calories: 2000, protein: 150, carbs: 250, fat: 65, waterMl: 2500 },
  addFoodEntry: (entry) =>
    set((state) => ({ entries: [...state.entries, { ...entry, id: Date.now().toString() }] })),
  removeFoodEntry: (id) =>
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
  addWater: (amountMl) =>
    set((state) => ({
      waterEntries: [...state.waterEntries, { id: Date.now().toString(), amountMl, date: new Date().toISOString().split('T')[0], time: Date.now() }],
    })),
  getTotalCalories: (date) =>
    get().entries.filter((e) => e.date === date).reduce((sum, e) => sum + e.calories, 0),
  getTotalWater: (date) =>
    get().waterEntries.filter((e) => e.date === date).reduce((sum, e) => sum + e.amountMl, 0),
  getMacros: (date) => {
    const dayEntries = get().entries.filter((e) => e.date === date)
    return {
      protein: dayEntries.reduce((s, e) => s + e.protein, 0),
      carbs: dayEntries.reduce((s, e) => s + e.carbs, 0),
      fat: dayEntries.reduce((s, e) => s + e.fat, 0),
    }
  },
}))
```

**Step 4: Run test — expect PASS**

**Step 5: Create `components/nutrition/CalorieRing.tsx`**

```tsx
import { View, Text } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

interface Props { consumed: number; goal: number }

export function CalorieRing({ consumed, goal }: Props) {
  const progress = Math.min(consumed / goal, 1)
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <View className="items-center">
      <Svg width={150} height={150}>
        <Circle cx={75} cy={75} r={radius} stroke="#e5e7eb" strokeWidth={12} fill="none" />
        <Circle
          cx={75} cy={75} r={radius}
          stroke="#6366f1"
          strokeWidth={12}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin="75, 75"
        />
      </Svg>
      <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center">
        <Text className="text-2xl font-bold text-gray-900">{consumed}</Text>
        <Text className="text-xs text-gray-400">of {goal} kcal</Text>
      </View>
    </View>
  )
}
```

**Step 6: Build `app/(tabs)/nutrition.tsx`**

Full nutrition screen with CalorieRing, macro bars, meal sections (breakfast/lunch/dinner/snack), water tracker with quick-add buttons, and FAB to open AddFoodModal.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add nutrition tracker with calorie ring and water tracking"
```

---

### Task 16: Food Search + Barcode Scanner

**Files:**
- Create: `lib/foodSearch.ts`
- Create: `components/nutrition/AddFoodModal.tsx`
- Create: `components/nutrition/BarcodeScanner.tsx`
- Create: `__tests__/lib/foodSearch.test.ts`

**Step 1: Install barcode scanner**

```bash
npx expo install expo-barcode-scanner
```

**Step 2: Write failing test**

```ts
import { parseOpenFoodFactsProduct } from '@/lib/foodSearch'

describe('parseOpenFoodFactsProduct', () => {
  it('extracts nutrition from OFF product', () => {
    const raw = {
      product_name: 'Oat Milk',
      nutriments: { 'energy-kcal_100g': 50, proteins_100g: 1, carbohydrates_100g: 6.5, fat_100g: 1.5 },
      serving_size: '200ml',
    }
    const result = parseOpenFoodFactsProduct(raw, 200)
    expect(result.name).toBe('Oat Milk')
    expect(result.calories).toBe(100)
  })
})
```

**Step 3: Run test — expect FAIL**

**Step 4: Create `lib/foodSearch.ts`**

```ts
export interface FoodItem {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingGrams: number
  barcode?: string
}

export function parseOpenFoodFactsProduct(product: any, servingGrams = 100): FoodItem {
  const factor = servingGrams / 100
  const n = product.nutriments || {}
  return {
    name: product.product_name || 'Unknown',
    calories: Math.round((n['energy-kcal_100g'] || 0) * factor),
    protein: Math.round((n.proteins_100g || 0) * factor * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g || 0) * factor * 10) / 10,
    fat: Math.round((n.fat_100g || 0) * factor * 10) / 10,
    servingGrams,
  }
}

export async function searchFood(query: string): Promise<FoodItem[]> {
  const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`)
  const data = await res.json()
  return (data.products || []).map((p: any) => parseOpenFoodFactsProduct(p))
}

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
  const data = await res.json()
  if (data.status !== 1) return null
  return parseOpenFoodFactsProduct(data.product)
}
```

**Step 5: Run test — expect PASS**

**Step 6: Create `components/nutrition/BarcodeScanner.tsx`**

```tsx
import { View, Text, TouchableOpacity } from 'react-native'
import { BarCodeScanner } from 'expo-barcode-scanner'
import { useState, useEffect } from 'react'
import { lookupBarcode, FoodItem } from '@/lib/foodSearch'

interface Props { onFound: (item: FoodItem) => void; onClose: () => void }

export function BarcodeScanner({ onFound, onClose }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => setHasPermission(status === 'granted'))
  }, [])

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return
    setScanned(true)
    const item = await lookupBarcode(data)
    if (item) onFound(item)
    else setScanned(false)
  }

  if (hasPermission === null) return <View />
  if (!hasPermission) return <Text className="text-center p-4">Camera permission required</Text>

  return (
    <View className="flex-1">
      <BarCodeScanner onBarCodeScanned={handleScan} style={{ flex: 1 }} />
      <TouchableOpacity className="absolute bottom-8 self-center bg-white px-6 py-3 rounded-full" onPress={onClose}>
        <Text className="font-semibold text-gray-800">Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}
```

**Step 7: Create `components/nutrition/AddFoodModal.tsx`** — modal with three tabs: Search (text input calling `searchFood`), Barcode (renders `BarcodeScanner`), Photo (uses camera + Claude Vision). On selection, shows confirmation with editable macros, then calls `useNutritionStore.addFoodEntry`.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add food search and barcode scanner via OpenFoodFacts"
```

---

### Task 17: AI Meal Photo Recognition

**Files:**
- Create: `lib/mealPhotoAI.ts`
- Create: `__tests__/lib/mealPhotoAI.test.ts`

**Step 1: Write failing test**

```ts
import { parseMealAIResponse } from '@/lib/mealPhotoAI'

describe('parseMealAIResponse', () => {
  it('parses structured AI response', () => {
    const response = `MEAL: Chicken salad with croutons\nCALORIES: 450\nPROTEIN: 35g\nCARBS: 30g\nFAT: 15g`
    const result = parseMealAIResponse(response)
    expect(result.calories).toBe(450)
    expect(result.protein).toBe(35)
    expect(result.name).toBe('Chicken salad with croutons')
  })
})
```

**Step 2: Run test — expect FAIL**

**Step 3: Create `lib/mealPhotoAI.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY })

export interface MealEstimate {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function parseMealAIResponse(text: string): MealEstimate {
  const meal = text.match(/MEAL:\s*(.+)/i)?.[1]?.trim() || 'Unknown meal'
  const calories = parseInt(text.match(/CALORIES:\s*(\d+)/i)?.[1] || '0')
  const protein = parseInt(text.match(/PROTEIN:\s*(\d+)/i)?.[1] || '0')
  const carbs = parseInt(text.match(/CARBS:\s*(\d+)/i)?.[1] || '0')
  const fat = parseInt(text.match(/FAT:\s*(\d+)/i)?.[1] || '0')
  return { name: meal, calories, protein, carbs, fat }
}

export async function analyzeMealPhoto(base64Image: string): Promise<MealEstimate> {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
        },
        {
          type: 'text',
          text: `Analyze this meal photo and estimate its nutritional content. Respond in exactly this format:
MEAL: [meal name]
CALORIES: [number]
PROTEIN: [number in grams]
CARBS: [number in grams]
FAT: [number in grams]

Be concise and use your best estimate based on typical portion sizes.`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return parseMealAIResponse(text)
}
```

**Step 4: Run test — expect PASS**

```bash
npx jest __tests__/lib/mealPhotoAI.test.ts
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Claude Vision AI meal photo recognition"
```

---

## Phase 8: Me Tab (Habits, Tasks, Mood, Journal)

### Task 18: Habit Tracker with Streaks

**Files:**
- Create: `stores/habitStore.ts`
- Create: `components/me/HabitList.tsx`
- Create: `__tests__/stores/habitStore.test.ts`

**Step 1: Write failing test**

```ts
import { useHabitStore } from '@/stores/habitStore'

describe('habitStore', () => {
  beforeEach(() => useHabitStore.setState({ habits: [], logs: [] }))

  it('calculates streak correctly', () => {
    const store = useHabitStore.getState()
    store.addHabit({ name: 'Exercise', icon: '🏋️', frequency: 'daily' })
    const habit = useHabitStore.getState().habits[0]

    // Log for last 3 days
    const today = new Date()
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      store.logHabit(habit.id, d.toISOString().split('T')[0])
    }

    expect(useHabitStore.getState().getStreak(habit.id)).toBe(3)
  })
})
```

**Step 2: Run test — expect FAIL**

**Step 3: Create `stores/habitStore.ts`**

```ts
import { create } from 'zustand'

export interface Habit {
  id: string
  name: string
  icon?: string
  frequency: 'daily' | 'weekly'
  createdAt: number
  archived: boolean
}

interface HabitLog {
  id: string
  habitId: string
  date: string  // YYYY-MM-DD
  completedAt: number
}

interface HabitState {
  habits: Habit[]
  logs: HabitLog[]
  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'archived'>) => void
  archiveHabit: (id: string) => void
  logHabit: (habitId: string, date: string) => void
  unlogHabit: (habitId: string, date: string) => void
  isCompleted: (habitId: string, date: string) => boolean
  getStreak: (habitId: string) => number
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  logs: [],
  addHabit: (h) =>
    set((state) => ({
      habits: [...state.habits, { ...h, id: Date.now().toString(), createdAt: Date.now(), archived: false }],
    })),
  archiveHabit: (id) =>
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, archived: true } : h)),
    })),
  logHabit: (habitId, date) => {
    if (get().isCompleted(habitId, date)) return
    set((state) => ({
      logs: [...state.logs, { id: Date.now().toString(), habitId, date, completedAt: Date.now() }],
    }))
  },
  unlogHabit: (habitId, date) =>
    set((state) => ({
      logs: state.logs.filter((l) => !(l.habitId === habitId && l.date === date)),
    })),
  isCompleted: (habitId, date) =>
    get().logs.some((l) => l.habitId === habitId && l.date === date),
  getStreak: (habitId) => {
    const logs = get().logs.filter((l) => l.habitId === habitId).map((l) => l.date).sort().reverse()
    if (!logs.length) return 0
    let streak = 0
    let current = new Date()
    for (let i = 0; i < 365; i++) {
      const dateStr = current.toISOString().split('T')[0]
      if (logs.includes(dateStr)) {
        streak++
        current.setDate(current.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  },
}))
```

**Step 4: Run test — expect PASS**

**Step 5: Create `components/me/HabitList.tsx`**

```tsx
import { View, Text, TouchableOpacity, FlatList } from 'react-native'
import { useHabitStore } from '@/stores/habitStore'
import { Check } from 'lucide-react-native'

export function HabitList() {
  const { habits, isCompleted, logHabit, unlogHabit, getStreak } = useHabitStore()
  const today = new Date().toISOString().split('T')[0]
  const activeHabits = habits.filter((h) => !h.archived)

  return (
    <FlatList
      data={activeHabits}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const done = isCompleted(item.id, today)
        const streak = getStreak(item.id)
        return (
          <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-2">
            <TouchableOpacity
              className={`w-8 h-8 rounded-full border-2 items-center justify-center mr-3 ${done ? 'bg-primary border-primary' : 'border-gray-300'}`}
              onPress={() => done ? unlogHabit(item.id, today) : logHabit(item.id, today)}
            >
              {done && <Check size={16} color="white" />}
            </TouchableOpacity>
            <View className="flex-1">
              <Text className={`font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                {item.icon} {item.name}
              </Text>
            </View>
            {streak > 0 && (
              <View className="bg-orange-100 px-2 py-1 rounded-full">
                <Text className="text-orange-600 text-xs font-bold">🔥 {streak}</Text>
              </View>
            )}
          </View>
        )
      }}
    />
  )
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add habit tracker with streak calculation"
```

---

### Task 19: Tasks, Mood, Journal + Me Screen

**Files:**
- Create: `stores/taskStore.ts`
- Create: `stores/moodStore.ts`
- Create: `app/(tabs)/me.tsx`
- Create: `__tests__/stores/taskStore.test.ts`

**Step 1: Create `stores/taskStore.ts`**

```ts
import { create } from 'zustand'

export interface Task {
  id: string
  title: string
  completed: boolean
  dueDate?: number
  createdAt: number
}

interface TaskState {
  tasks: Task[]
  addTask: (title: string, dueDate?: number) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  addTask: (title, dueDate) =>
    set((state) => ({
      tasks: [...state.tasks, { id: Date.now().toString(), title, completed: false, dueDate, createdAt: Date.now() }],
    })),
  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
}))
```

**Step 2: Create `stores/moodStore.ts`**

```ts
import { create } from 'zustand'

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄']

export interface MoodLog {
  id: string
  mood: number  // 1-5
  emoji: string
  note?: string
  date: string  // YYYY-MM-DD
}

export interface JournalEntry {
  id: string
  content: string
  date: string
  createdAt: number
}

interface MoodState {
  moodLogs: MoodLog[]
  journalEntries: JournalEntry[]
  logMood: (mood: number, note?: string) => void
  addJournalEntry: (content: string) => void
  getTodayMood: () => MoodLog | null
}

export const useMoodStore = create<MoodState>((set, get) => ({
  moodLogs: [],
  journalEntries: [],
  logMood: (mood, note) => {
    const today = new Date().toISOString().split('T')[0]
    set((state) => ({
      moodLogs: [
        ...state.moodLogs.filter((m) => m.date !== today),
        { id: Date.now().toString(), mood, emoji: MOOD_EMOJIS[mood - 1], note, date: today },
      ],
    }))
  },
  addJournalEntry: (content) =>
    set((state) => ({
      journalEntries: [...state.journalEntries, { id: Date.now().toString(), content, date: new Date().toISOString().split('T')[0], createdAt: Date.now() }],
    })),
  getTodayMood: () => {
    const today = new Date().toISOString().split('T')[0]
    return get().moodLogs.find((m) => m.date === today) || null
  },
}))
```

**Step 3: Build `app/(tabs)/me.tsx`**

```tsx
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { HabitList } from '@/components/me/HabitList'
import { useMoodStore } from '@/stores/moodStore'
import { useTaskStore } from '@/stores/taskStore'

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞' }, { value: 2, emoji: '😕' }, { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' }, { value: 5, emoji: '😄' },
]

export default function MeScreen() {
  const [tab, setTab] = useState<'habits' | 'tasks' | 'mood' | 'journal'>('habits')
  const [newTask, setNewTask] = useState('')
  const [journalText, setJournalText] = useState('')
  const { logMood, addJournalEntry, getTodayMood } = useMoodStore()
  const { tasks, addTask, toggleTask } = useTaskStore()
  const todayMood = getTodayMood()

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-6 pb-2">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Me</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['habits', 'tasks', 'mood', 'journal'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              className={`mr-3 px-4 py-2 rounded-full ${tab === t ? 'bg-primary' : 'bg-white border border-gray-200'}`}
              onPress={() => setTab(t)}
            >
              <Text className={tab === t ? 'text-white font-medium' : 'text-gray-600'}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {tab === 'habits' && <HabitList />}

        {tab === 'tasks' && (
          <View>
            <View className="flex-row mb-4">
              <TextInput
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 mr-2"
                placeholder="Add a task..."
                value={newTask}
                onChangeText={setNewTask}
              />
              <TouchableOpacity className="bg-primary rounded-xl px-4 items-center justify-center" onPress={() => { if (newTask) { addTask(newTask); setNewTask('') } }}>
                <Text className="text-white font-bold text-lg">+</Text>
              </TouchableOpacity>
            </View>
            {tasks.map((task) => (
              <TouchableOpacity key={task.id} className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-2" onPress={() => toggleTask(task.id)}>
                <View className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${task.completed ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                  {task.completed && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className={task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}>{task.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'mood' && (
          <View>
            <Text className="font-medium text-gray-700 mb-4">How are you feeling today?</Text>
            <View className="flex-row justify-around mb-6">
              {MOOD_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.value} className={`w-14 h-14 rounded-full items-center justify-center ${todayMood?.mood === opt.value ? 'bg-primary' : 'bg-white border border-gray-200'}`} onPress={() => logMood(opt.value)}>
                  <Text className="text-2xl">{opt.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {todayMood && <Text className="text-center text-gray-500">Today: {todayMood.emoji} (mood {todayMood.mood}/5)</Text>}
          </View>
        )}

        {tab === 'journal' && (
          <View>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3 min-h-[120px]"
              placeholder="Write your thoughts..."
              value={journalText}
              onChangeText={setJournalText}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity className="bg-primary rounded-xl py-3 items-center" onPress={() => { if (journalText) { addJournalEntry(journalText); setJournalText('') } }}>
              <Text className="text-white font-semibold">Save Entry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add tasks, mood logging, and journal to Me tab"
```

---

## Phase 9: Notifications

### Task 20: Push Notifications Setup

**Files:**
- Create: `lib/notifications.ts`
- Create: `__tests__/lib/notifications.test.ts`

**Step 1: Install notifications**

```bash
npx expo install expo-notifications expo-device
```

**Step 2: Write failing test**

```ts
import { scheduleImpulseBuyReminder, formatReminderMessage } from '@/lib/notifications'

describe('notifications', () => {
  it('formats impulse buy reminder message', () => {
    const msg = formatReminderMessage('AirPods', 179)
    expect(msg).toContain('AirPods')
    expect(msg).toContain('$179')
  })
})
```

**Step 3: Run test — expect FAIL**

**Step 4: Create `lib/notifications.ts`**

```ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
})

export function formatReminderMessage(itemName: string, price: number): string {
  return `Do you still want ${itemName} for $${price}? Now's the time to decide!`
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleImpulseBuyReminder(id: string, itemName: string, price: number, remindAt: number): Promise<void> {
  const granted = await requestNotificationPermission()
  if (!granted) return
  await Notifications.scheduleNotificationAsync({
    identifier: `impulse-${id}`,
    content: {
      title: 'Impulse Buy Check-In',
      body: formatReminderMessage(itemName, price),
      data: { type: 'impulse_buy', id },
    },
    trigger: { date: new Date(remindAt) },
  })
}

export async function scheduleWaterReminder(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Hydration Reminder', body: "Don't forget to hit your water goal today!" },
    trigger: { hour: 20, minute: 0, repeats: true },
  })
}

export async function scheduleHabitReminder(habitName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Habit Reminder', body: `Don't break your ${habitName} streak!` },
    trigger: { hour: 21, minute: 0, repeats: true },
  })
}

export async function scheduleMoodCheckIn(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Daily Check-In', body: 'How are you feeling today?' },
    trigger: { hour: 20, minute: 0, repeats: true },
  })
}
```

**Step 5: Run test — expect PASS**

**Step 6: Wire `scheduleImpulseBuyReminder` into `impulseBuyStore.addImpulseBuy`**

In `stores/impulseBuyStore.ts`, after adding the item, call `scheduleImpulseBuyReminder(...)`.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add push notifications for impulse buys, water, habits, and mood"
```

---

## Phase 10: Settings + Cloud Sync

### Task 21: Settings Screen + Cloud Sync Toggle

**Files:**
- Create: `app/settings.tsx`
- Create: `stores/settingsStore.ts`
- Create: `lib/cloudSync.ts`

**Step 1: Create `stores/settingsStore.ts`**

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SettingsState {
  cloudSyncEnabled: boolean
  plaidConnected: boolean
  garminConnected: boolean
  healthKitConnected: boolean
  dailyCalorieGoal: number
  dailyWaterGoalMl: number
  toggleCloudSync: () => void
  setPlaidConnected: (v: boolean) => void
  setGarminConnected: (v: boolean) => void
  setHealthKitConnected: (v: boolean) => void
  updateGoals: (calories: number, waterMl: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cloudSyncEnabled: false,
      plaidConnected: false,
      garminConnected: false,
      healthKitConnected: false,
      dailyCalorieGoal: 2000,
      dailyWaterGoalMl: 2500,
      toggleCloudSync: () => set((state) => ({ cloudSyncEnabled: !state.cloudSyncEnabled })),
      setPlaidConnected: (v) => set({ plaidConnected: v }),
      setGarminConnected: (v) => set({ garminConnected: v }),
      setHealthKitConnected: (v) => set({ healthKitConnected: v }),
      updateGoals: (calories, waterMl) => set({ dailyCalorieGoal: calories, dailyWaterGoalMl: waterMl }),
    }),
    { name: 'settings', storage: createJSONStorage(() => AsyncStorage) }
  )
)
```

**Step 2: Build `app/settings.tsx`**

```tsx
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { PlaidConnectButton } from '@/components/finance/PlaidConnectButton'

export default function SettingsScreen() {
  const { cloudSyncEnabled, toggleCloudSync, plaidConnected, garminConnected } = useSettingsStore()
  const { signOut } = useAuthStore()

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Settings</Text>

        <View className="bg-white rounded-2xl mb-4 overflow-hidden">
          <Text className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sync & Backup</Text>
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
            <View className="flex-1">
              <Text className="font-medium text-gray-800">Cloud Sync</Text>
              <Text className="text-xs text-gray-400">Back up data to Supabase</Text>
            </View>
            <Switch value={cloudSyncEnabled} onValueChange={toggleCloudSync} />
          </View>
        </View>

        <View className="bg-white rounded-2xl mb-4 overflow-hidden">
          <Text className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Connected Services</Text>
          <View className="px-4 py-3 border-b border-gray-100">
            <Text className="font-medium text-gray-800 mb-2">Bank Account (Plaid)</Text>
            {plaidConnected
              ? <Text className="text-green-600 text-sm">✓ Connected</Text>
              : <PlaidConnectButton />}
          </View>
          <View className="px-4 py-3">
            <Text className="font-medium text-gray-800 mb-1">Garmin</Text>
            <Text className={`text-sm ${garminConnected ? 'text-green-600' : 'text-gray-400'}`}>
              {garminConnected ? '✓ Connected' : 'Not connected — configure OAuth in Garmin Connect app'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className="bg-red-50 border border-red-100 rounded-2xl px-4 py-4 items-center mt-4"
          onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Sign Out', style: 'destructive', onPress: signOut }])}
        >
          <Text className="text-red-500 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
```

**Step 3: Add settings link to Me tab**

In `app/(tabs)/me.tsx`, add a gear icon in the header that navigates to `/settings`.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add settings screen with cloud sync toggle and connected services"
```

---

### Task 22: Wire Dashboard to Live Data

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Step 1: Connect stores to dashboard**

Update `app/(tabs)/index.tsx` to read from all stores:

```tsx
import { useFinanceStore } from '@/stores/financeStore'
import { useNutritionStore } from '@/stores/nutritionStore'
import { useFitnessStore } from '@/stores/fitnessStore'
import { useHabitStore } from '@/stores/habitStore'
import { useMoodStore } from '@/stores/moodStore'
import { useSettingsStore } from '@/stores/settingsStore'

// Inside component:
const today = new Date().toISOString().split('T')[0]
const transactions = useFinanceStore((s) => s.transactions)
const todayExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date).toISOString().split('T')[0] === today).reduce((sum, t) => sum + t.amount, 0)
const calories = useNutritionStore((s) => s.getTotalCalories(today))
const water = useNutritionStore((s) => s.getTotalWater(today))
const goals = useSettingsStore((s) => ({ calories: s.dailyCalorieGoal, water: s.dailyWaterGoalMl }))
const steps = useFitnessStore((s) => s.todayStats?.steps)
const habits = useHabitStore((s) => s.habits.filter(h => !h.archived))
const completedHabits = useHabitStore((s) => habits.filter(h => s.isCompleted(h.id, today)).length)
const todayMood = useMoodStore((s) => s.getTodayMood())
```

Then pass live values to `SummaryCard` components.

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: connect dashboard to live store data"
```

---

### Task 23: Supabase Database Tables Migration

**Step 1: Open Supabase SQL editor and run migration**

```sql
-- Users profile
create table profiles (
  id uuid references auth.users primary key,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Plaid tokens (encrypted at rest by Supabase)
create table plaid_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  access_token text not null,
  created_at timestamptz default now(),
  unique(user_id)
);

-- Garmin tokens
create table garmin_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  unique(user_id)
);

-- Garmin sync data
create table garmin_syncs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null,
  steps int, heart_rate int, calories_burned int, active_minutes int,
  sleep_hours numeric, sleep_score int, stress int, hrv int, spo2 int, body_battery int,
  raw_json jsonb,
  unique(user_id, date)
);

-- Transactions (synced from WatermelonDB)
create table transactions (
  id text primary key,
  user_id uuid references auth.users not null,
  type text not null, amount numeric not null, category text,
  merchant text, date timestamptz, source text,
  receipt_image_url text, notes text,
  created_at timestamptz default now()
);

-- Enable Row Level Security on all tables
alter table profiles enable row level security;
alter table plaid_tokens enable row level security;
alter table garmin_tokens enable row level security;
alter table garmin_syncs enable row level security;
alter table transactions enable row level security;

-- RLS policies: users can only access their own data
create policy "Own data only" on profiles for all using (auth.uid() = id);
create policy "Own data only" on plaid_tokens for all using (auth.uid() = user_id);
create policy "Own data only" on garmin_tokens for all using (auth.uid() = user_id);
create policy "Own data only" on garmin_syncs for all using (auth.uid() = user_id);
create policy "Own data only" on transactions for all using (auth.uid() = user_id);
```

**Step 2: Commit the migration as a file**

```bash
mkdir -p supabase/migrations
# save the SQL above to supabase/migrations/20260324000000_initial.sql
git add -A
git commit -m "feat: add Supabase database migration with RLS policies"
```

---

### Task 24: Final Integration + Development Build

**Step 1: Create development build config `eas.json`**

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

**Step 2: Install EAS CLI**

```bash
npm install -g eas-cli
eas login
eas build:configure
```

**Step 3: Build for local device testing**

```bash
# iOS simulator
npx expo run:ios

# Android emulator
npx expo run:android
```

**Step 4: Run all tests**

```bash
npx jest --coverage
```

Expected: All tests pass

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: add EAS build config and complete integration"
```

---

## Summary of All Files Created

```
app/
  _layout.tsx              # Root layout with auth listener
  (auth)/
    _layout.tsx
    sign-in.tsx
    sign-up.tsx
  (tabs)/
    _layout.tsx            # Bottom tab navigator
    index.tsx              # Dashboard
    finance.tsx            # Finance tracker
    fitness.tsx            # Fitness tracker
    nutrition.tsx          # Nutrition tracker
    me.tsx                 # Habits/tasks/mood/journal
  settings.tsx

components/
  dashboard/
    SummaryCard.tsx
    QuickAdd.tsx
  finance/
    AddTransactionModal.tsx
    ReceiptScanner.tsx
    ImpulseBuyVault.tsx
    AddImpulseBuyModal.tsx
    PlaidConnectButton.tsx
  fitness/
    (fitness display components)
  nutrition/
    CalorieRing.tsx
    AddFoodModal.tsx
    BarcodeScanner.tsx
  me/
    HabitList.tsx

stores/
  authStore.ts
  financeStore.ts
  impulseBuyStore.ts
  fitnessStore.ts
  nutritionStore.ts
  habitStore.ts
  taskStore.ts
  moodStore.ts
  settingsStore.ts

lib/
  supabase.ts
  ocr.ts
  plaid.ts
  foodSearch.ts
  mealPhotoAI.ts
  healthSync.ts
  notifications.ts
  cloudSync.ts

db/
  schema.ts
  index.ts
  models/
    Transaction.ts
    ImpulseBuy.ts
    FoodEntry.ts
    WaterEntry.ts
    GarminSync.ts
    Habit.ts  HabitLog.ts
    MoodLog.ts
    JournalEntry.ts
    Task.ts

supabase/
  functions/
    plaid-link-token/index.ts
    plaid-exchange-token/index.ts
    plaid-sync-transactions/index.ts
    garmin-sync/index.ts
  migrations/
    20260324000000_initial.sql
```
