import { View, Text } from 'react-native'
import { useFriendStore } from '@/stores/friendStore'

export function FriendRequestBadge() {
  const { pendingRequests } = useFriendStore()
  if (pendingRequests.length === 0) return null
  return (
    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
      <Text className="text-white text-xs font-bold">{pendingRequests.length}</Text>
    </View>
  )
}
