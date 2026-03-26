import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useFriendStore } from '@/stores/friendStore'
import { ChevronLeft } from 'lucide-react-native'

export default function AddFriendScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sent, setSent] = useState(false)
  const { sendFriendRequest, isLoading, error } = useFriendStore()

  const handleSend = async () => {
    if (!query.trim()) return
    await sendFriendRequest(query.trim())
    if (!useFriendStore.getState().error) setSent(true)
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-6">
          <ChevronLeft size={20} color="#6b7280" />
          <Text className="text-gray-500 ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900 mb-2">Add Friend</Text>
        <Text className="text-gray-500 mb-6">Search by username or email</Text>
        {sent ? (
          <View className="bg-green-50 rounded-2xl p-6 items-center">
            <Text className="text-green-700 font-semibold text-lg">Request sent!</Text>
            <TouchableOpacity onPress={() => router.back()} className="mt-4">
              <Text className="text-indigo-600 font-medium">Go back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-3"
              placeholder="username or email"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {error ? <Text className="text-red-500 text-sm mb-3">{error}</Text> : null}
            <TouchableOpacity
              onPress={handleSend}
              disabled={isLoading || !query.trim()}
              className="bg-indigo-600 rounded-xl py-3 items-center"
            >
              {isLoading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-semibold">Send Request</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
