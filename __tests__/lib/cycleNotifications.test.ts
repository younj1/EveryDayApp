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
