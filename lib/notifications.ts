import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function formatReminderMessage(itemName: string, price: number): string {
  if (price > 0) {
    return `Do you still want ${itemName} for $${price}? Now's the time to decide!`
  }
  return `Reminder: ${itemName}`
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleImpulseBuyReminder(
  id: string,
  itemName: string,
  price: number,
  remindAt: number
): Promise<void> {
  const granted = await requestNotificationPermission()
  if (!granted) return
  await Notifications.scheduleNotificationAsync({
    identifier: `impulse-${id}`,
    content: {
      title: 'Impulse Buy Check-In',
      body: formatReminderMessage(itemName, price),
      data: { type: 'impulse_buy', id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(remindAt) },
  })
}

export async function scheduleWaterReminder(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Hydration Reminder', body: "Don't forget to hit your water goal today!" },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0 },
  })
}

export async function scheduleHabitReminder(habitName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Habit Reminder', body: `Don't break your ${habitName} streak!` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 21, minute: 0 },
  })
}

export async function scheduleMoodCheckIn(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Daily Check-In', body: 'How are you feeling today?' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0 },
  })
}
