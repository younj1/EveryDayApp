import { Platform } from 'react-native'

export type WidgetType = 'fitness' | 'nutrition' | 'finance' | 'habits' | 'mood' | 'partner'

export interface WidgetPayload {
  type: WidgetType
  data: Record<string, unknown>
  updatedAt: string
}

export function buildWidgetPayload(type: WidgetType, data: Record<string, unknown>): WidgetPayload {
  return { type, data, updatedAt: new Date().toISOString() }
}

export let latestWidgetData: WidgetPayload[] = []

export async function writeWidgetData(payloads: WidgetPayload[]): Promise<void> {
  latestWidgetData = payloads
  if (Platform.OS === 'ios') {
    try {
      const SharedGroupPreferences = require('react-native-shared-group-preferences').default
      const APP_GROUP = 'group.com.yourname.everydayapp' // replace with your bundle ID
      await SharedGroupPreferences.setItem('widgetData', JSON.stringify(payloads), APP_GROUP)
    } catch {
      // silently fail — widget shows stale data
    }
  }
}
