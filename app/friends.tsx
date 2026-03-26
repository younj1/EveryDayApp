import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { useFriendStore } from '@/stores/friendStore'
import { ChevronLeft, UserPlus, Check, X } from 'lucide-react-native'

export default function FriendsScreen() {
  const router = useRouter()
  const { friends, pendingRequests, loadFriends, loadPendingRequests, acceptRequest, declineRequest } = useFriendStore()

  useEffect(() => {
    loadFriends()
    loadPendingRequests()
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-6">
          <ChevronLeft size={20} color="#6b7280" />
          <Text className="text-gray-500 ml-1">Back</Text>
        </TouchableOpacity>
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900">Friends</Text>
          {friends.length < 5 && (
            <TouchableOpacity onPress={() => router.push('/add-friend')} className="flex-row items-center bg-indigo-600 rounded-xl px-3 py-2">
              <UserPlus size={16} color="white" />
              <Text className="text-white font-medium ml-1">Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {pendingRequests.length > 0 && (
          <View className="bg-white rounded-2xl mb-4 overflow-hidden">
            <Text className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Requests ({pendingRequests.length})</Text>
            {pendingRequests.map((req) => (
              <View key={req.id} className="flex-row items-center px-4 py-3 border-t border-gray-100">
                <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-indigo-600 font-bold">{req.senderName?.[0] ?? '?'}</Text>
                </View>
                <Text className="flex-1 font-medium text-gray-800">{req.senderName ?? 'Someone'}</Text>
                <TouchableOpacity onPress={() => acceptRequest(req.id)} className="bg-green-100 rounded-full p-2 mr-2">
                  <Check size={16} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => declineRequest(req.id)} className="bg-red-100 rounded-full p-2">
                  <X size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View className="bg-white rounded-2xl overflow-hidden">
          <Text className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Friends ({friends.length}/5)</Text>
          {friends.length === 0 ? (
            <View className="px-4 py-6 items-center">
              <Text className="text-gray-400 text-sm">No friends yet. Add someone!</Text>
            </View>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} className="flex-row items-center px-4 py-3 border-t border-gray-100">
                <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-indigo-600 font-bold">{friend.name[0]}</Text>
                </View>
                <Text className="flex-1 font-medium text-gray-800">{friend.name}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
