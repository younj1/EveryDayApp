import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, TextInput, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useNutritionStore } from '@/stores/nutritionStore'
import { PlaidConnectButton } from '@/components/finance/PlaidConnectButton'

export default function SettingsScreen() {
  const router = useRouter()
  const { cloudSyncEnabled, toggleCloudSync, plaidConnected, garminConnected } = useSettingsStore()
  const { signOut } = useAuthStore()
  const goals = useNutritionStore((s) => s.goals)
  const updateGoals = useNutritionStore((s) => s.updateGoals)

  const [calories, setCalories] = useState(String(goals.calories))
  const [waterMl, setWaterMl] = useState(String(goals.waterMl))
  const [protein, setProtein] = useState(String(goals.protein))
  const [carbs, setCarbs] = useState(String(goals.carbs))
  const [fat, setFat] = useState(String(goals.fat))

  const saveGoals = () => {
    const c = parseInt(calories), w = parseInt(waterMl), p = parseInt(protein), cb = parseInt(carbs), f = parseInt(fat)
    if ([c, w, p, cb, f].some((n) => !Number.isFinite(n) || n <= 0)) {
      Alert.alert('Invalid values', 'All goals must be positive numbers.')
      return
    }
    updateGoals({ calories: c, waterMl: w, protein: p, carbs: cb, fat: f })
    Alert.alert('Saved', 'Your daily goals have been updated.')
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <ChevronLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Settings</Text>
        </View>

        {/* Daily Goals */}
        <View className="bg-white rounded-2xl mb-4 overflow-hidden">
          <Text className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Daily Goals</Text>
          {[
            { label: 'Calories (kcal)', value: calories, onChange: setCalories },
            { label: 'Water (ml)', value: waterMl, onChange: setWaterMl },
            { label: 'Protein (g)', value: protein, onChange: setProtein },
            { label: 'Carbs (g)', value: carbs, onChange: setCarbs },
            { label: 'Fat (g)', value: fat, onChange: setFat },
          ].map(({ label, value, onChange }) => (
            <View key={label} style={s.goalRow}>
              <Text style={s.goalLabel}>{label}</Text>
              <TextInput
                style={s.goalInput}
                value={value}
                onChangeText={onChange}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            </View>
          ))}
          <TouchableOpacity className="mx-4 mb-4 mt-2 bg-primary rounded-xl py-3 items-center" onPress={saveGoals}>
            <Text className="text-white font-semibold">Save Goals</Text>
          </TouchableOpacity>
        </View>

        {/* Sync & Backup */}
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

        {/* Connected Services */}
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

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  goalLabel: { fontSize: 14, color: '#374151' },
  goalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 90, textAlign: 'right', fontSize: 14, color: '#111827' },
})
