import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import '../global.css'

export default function RootLayout() {
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession)
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
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
