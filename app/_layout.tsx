import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { writeWidgetData, buildWidgetPayload } from '@/lib/widgetSync'
import { registerPushToken } from '@/lib/notifications'
import { useFitnessStore } from '@/stores/fitnessStore'
import { useNutritionStore } from '@/stores/nutritionStore'
import { useFinanceStore } from '@/stores/financeStore'
import { useHabitStore } from '@/stores/habitStore'
import { useMoodStore } from '@/stores/moodStore'
import { useFriendStore } from '@/stores/friendStore'
import '../global.css'

export default function RootLayout() {
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession)
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) registerPushToken()
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const syncWidgets = () => {
      const today = new Date().toISOString().split('T')[0]
      const { todayStats } = useFitnessStore.getState()
      const nutrition = useNutritionStore.getState()
      const { transactions } = useFinanceStore.getState()
      const { habits, logs } = useHabitStore.getState()
      const { getTodayMood } = useMoodStore.getState()
      const { partnerPosts } = useFriendStore.getState()

      const todaySpend = transactions
        .filter((t) => new Date(t.date).toISOString().split('T')[0] === today && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
      const completedHabits = habits.filter((h) => logs.some((l) => l.habitId === h.id && l.date === today)).length
      const latestPost = partnerPosts[0]

      writeWidgetData([
        buildWidgetPayload('fitness', { steps: todayStats?.steps ?? 0, caloriesBurned: todayStats?.caloriesBurned ?? 0, activeMinutes: todayStats?.activeMinutes ?? 0 }),
        buildWidgetPayload('nutrition', { caloriesConsumed: nutrition.getTotalCalories(today), caloriesGoal: nutrition.goals.calories, waterMl: nutrition.getTotalWater(today), waterGoalMl: nutrition.goals.waterMl }),
        buildWidgetPayload('finance', { netSpend: todaySpend, budgetStatus: 'green' }),
        buildWidgetPayload('habits', { activeCount: habits.length, completedCount: completedHabits }),
        buildWidgetPayload('mood', { emoji: getTodayMood()?.mood?.toString() ?? null }),
        buildWidgetPayload('partner', { imageUrl: latestPost?.imageUrl ?? null, caption: latestPost?.caption ?? null, senderName: latestPost?.senderName ?? null, createdAt: latestPost?.createdAt ?? null }),
      ])
    }

    syncWidgets()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncWidgets()
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any
      if (data?.type === 'partner_post' && data?.postId) {
        router.push(`/partner-post?postId=${data.postId}`)
      }
    })
    return () => responseListener.current?.remove()
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
