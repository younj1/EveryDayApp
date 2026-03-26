import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useFriendStore, PartnerPost } from '@/stores/friendStore'
import { ChevronLeft } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'

export default function PartnerPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>()
  const router = useRouter()
  const { markPostSeen } = useFriendStore()
  const [post, setPost] = useState<PartnerPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('partner_posts')
        .select('id, sender_id, recipient_id, image_url, caption, created_at, seen_at, profiles!partner_posts_sender_id_fkey(name, avatar_url)')
        .eq('id', postId)
        .single()
      if (data) {
        const p: PartnerPost = {
          id: data.id, senderId: data.sender_id, recipientId: data.recipient_id,
          imageUrl: data.image_url, caption: data.caption,
          senderName: (data as any).profiles?.name,
          senderAvatarUrl: (data as any).profiles?.avatar_url,
          createdAt: data.created_at, seenAt: data.seen_at,
        }
        setPost(p)
        if (!data.seen_at) markPostSeen(data.id)
      }
      setLoading(false)
    }
    if (postId) load()
  }, [postId])

  if (loading) return <SafeAreaView className="flex-1 bg-black items-center justify-center"><ActivityIndicator color="white" /></SafeAreaView>
  if (!post) return <SafeAreaView className="flex-1 bg-black items-center justify-center"><Text className="text-white">Post not found</Text></SafeAreaView>

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
        <View className="w-8 h-8 bg-indigo-400 rounded-full items-center justify-center mr-2">
          <Text className="text-white font-bold text-sm">{post.senderName?.[0] ?? '?'}</Text>
        </View>
        <View>
          <Text className="text-white font-semibold">{post.senderName ?? 'Friend'}</Text>
          <Text className="text-gray-400 text-xs">{new Date(post.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      <Image source={{ uri: post.imageUrl }} className="w-full flex-1" resizeMode="contain" />
      {post.caption ? <View className="px-4 py-4"><Text className="text-white text-base">{post.caption}</Text></View> : null}
    </SafeAreaView>
  )
}
