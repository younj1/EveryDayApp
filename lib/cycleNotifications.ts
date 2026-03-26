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
