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
