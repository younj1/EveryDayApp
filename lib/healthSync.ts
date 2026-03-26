import { Platform } from 'react-native'

export interface HealthDataPoint {
  type: string
  value: number
  date: string
}

/**
 * Normalizes raw data from HealthKit (iOS) or Health Connect (Android) into a
 * unified HealthDataPoint. Handles field name differences between the two platforms.
 */
export function normalizeHealthData(
  type: string,
  raw: Record<string, unknown>
): HealthDataPoint {
  const value =
    typeof raw.value === 'number'
      ? raw.value
      : typeof raw.quantity === 'number'
      ? raw.quantity
      : typeof raw.count === 'number'
      ? raw.count
      : 0

  const date =
    typeof raw.startDate === 'string'
      ? raw.startDate
      : typeof raw.startTime === 'string'
      ? raw.startTime
      : typeof raw.date === 'string'
      ? raw.date
      : new Date().toISOString().split('T')[0]

  return { type, value, date }
}

/**
 * Fetches today's health data from HealthKit (iOS) or Health Connect (Android).
 * Uses dynamic imports to avoid native module errors at build time — these
 * packages require a development build (expo run:ios / expo run:android).
 */
export async function fetchTodayHealthData(): Promise<
  Partial<{ steps: number; heartRate: number; caloriesBurned: number; sleepHours: number }>
> {
  if (Platform.OS === 'ios') {
    return fetchHealthKitData()
  }
  return fetchHealthConnectData()
}

async function fetchHealthKitData(): Promise<
  Partial<{ steps: number; heartRate: number; caloriesBurned: number; sleepHours: number }>
> {
  try {
    const { default: AppleHealthKit } = await import('react-native-health')
    return new Promise((resolve, reject) => {
      AppleHealthKit.initHealthKit(
        {
          permissions: {
            read: ['Steps', 'HeartRate', 'ActiveEnergyBurned', 'SleepAnalysis'],
          },
        },
        (err: unknown) => {
          if (err) return reject(new Error('HealthKit init failed'))
          AppleHealthKit.getStepCount(
            { date: new Date().toISOString() },
            (stepErr: unknown, results: { value: number }) => {
              if (stepErr) return resolve({})
              resolve({ steps: results.value })
            }
          )
        }
      )
    })
  } catch {
    // react-native-health not installed (Expo Go / managed workflow)
    return {}
  }
}

async function fetchHealthConnectData(): Promise<
  Partial<{ steps: number; heartRate: number; caloriesBurned: number; sleepHours: number }>
> {
  try {
    const { initialize, readRecords } = await import('react-native-health-connect')
    await initialize()
    const today = new Date().toISOString().split('T')[0]
    const stepsResult = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: `${today}T00:00:00Z`,
        endTime: `${today}T23:59:59Z`,
      },
    })
    const steps = stepsResult.records.reduce(
      (sum: number, r: Record<string, unknown>) =>
        sum + (typeof r.count === 'number' ? r.count : 0),
      0
    )
    return { steps }
  } catch {
    // react-native-health-connect not installed (Expo Go / managed workflow)
    return {}
  }
}
