jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
}))
jest.mock('expo-device', () => ({ isDevice: false }))
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(() => ({ update: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({}) })),
  },
}))

import { formatReminderMessage } from '@/lib/notifications'

describe('notifications', () => {
  it('formats impulse buy reminder message', () => {
    const msg = formatReminderMessage('AirPods', 179)
    expect(msg).toContain('AirPods')
    expect(msg).toContain('$179')
  })

  it('formats water reminder message', () => {
    const msg = formatReminderMessage('water bottle', 0)
    expect(msg).toBeDefined()
    expect(typeof msg).toBe('string')
  })
})
