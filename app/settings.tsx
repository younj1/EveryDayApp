import { View, Text, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { PlaidConnectButton } from '@/components/finance/PlaidConnectButton'
import { Users } from 'lucide-react-native'

export default function SettingsScreen() {
  const router = useRouter()
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
          <View className="px-4 py-3 border-b border-gray-100">
            <Text className="font-medium text-gray-800 mb-1">Garmin</Text>
            <Text className={`text-sm ${garminConnected ? 'text-green-600' : 'text-gray-400'}`}>
              {garminConnected ? '✓ Connected' : 'Not connected — configure OAuth in Garmin Connect app'}
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl mb-4 overflow-hidden">
          <Text className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Friends</Text>
          <TouchableOpacity onPress={() => router.push('/friends')} className="flex-row items-center px-4 py-3">
            <Users size={18} color="#6366f1" />
            <Text className="font-medium text-gray-800 ml-3 flex-1">Manage Friends</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-red-50 border border-red-100 rounded-2xl px-4 py-4 items-center mt-4"
          onPress={() =>
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ])
          }
        >
          <Text className="text-red-500 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
