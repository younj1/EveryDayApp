import { View, Text, Modal, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { X, Image as ImageIcon, Send } from 'lucide-react-native'
import { useFriendStore, Friend } from '@/stores/friendStore'
import { supabase } from '@/lib/supabase'

interface Props { visible: boolean; onClose: () => void }

function decode(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function SendPartnerImageModal({ visible, onClose }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [sending, setSending] = useState(false)
  const { friends } = useFriendStore()

  const handleClose = () => {
    setImageUri(null)
    setCaption('')
    setSelectedFriend(null)
    onClose()
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
    if (!result.canceled) setImageUri(result.assets[0].uri)
  }

  const handleSend = async () => {
    if (!imageUri || !selectedFriend) return
    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const fileName = `${user.id}/${Date.now()}.jpg`
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' })
      const { error: uploadError } = await supabase.storage
        .from('partner-images')
        .upload(fileName, decode(base64), { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('partner-images').getPublicUrl(fileName)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-partner-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ recipientId: selectedFriend.userId, imageUrl: publicUrl, caption: caption.trim() || null }),
      })
      if (!res.ok) throw new Error('Failed to send')
      handleClose()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-gray-50">
        <View className="flex-row justify-between items-center px-4 pt-6 pb-4 bg-white border-b border-gray-100">
          <Text className="text-lg font-bold text-gray-900">Send Photo</Text>
          <TouchableOpacity onPress={handleClose}><X size={22} color="#6b7280" /></TouchableOpacity>
        </View>
        <ScrollView className="flex-1 px-4 pt-4">
          <TouchableOpacity onPress={pickImage} className="bg-white rounded-2xl h-48 items-center justify-center mb-4 border-2 border-dashed border-gray-200 overflow-hidden">
            {imageUri
              ? <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
              : <View className="items-center"><ImageIcon size={32} color="#9ca3af" /><Text className="text-gray-400 mt-2">Tap to pick a photo</Text></View>}
          </TouchableOpacity>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 mb-4 border border-gray-200"
            placeholder="Add a caption..."
            value={caption}
            onChangeText={setCaption}
            maxLength={120}
          />
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Send to</Text>
          {friends.length === 0
            ? <Text className="text-gray-400 text-sm mb-4">Add friends first in Settings.</Text>
            : (
              <View className="bg-white rounded-2xl overflow-hidden mb-4">
                {friends.map((friend) => (
                  <TouchableOpacity key={friend.id} onPress={() => setSelectedFriend(friend)}
                    className={`flex-row items-center px-4 py-3 border-b border-gray-100 ${selectedFriend?.id === friend.id ? 'bg-indigo-50' : ''}`}>
                    <View className="w-8 h-8 bg-indigo-100 rounded-full items-center justify-center mr-3">
                      <Text className="text-indigo-600 font-bold">{friend.name[0]}</Text>
                    </View>
                    <Text className="flex-1 font-medium text-gray-800">{friend.name}</Text>
                    {selectedFriend?.id === friend.id && (
                      <View className="w-5 h-5 bg-indigo-600 rounded-full items-center justify-center">
                        <Text className="text-white text-xs">✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
        </ScrollView>
        <View className="px-4 pb-8">
          <TouchableOpacity onPress={handleSend} disabled={!imageUri || !selectedFriend || sending}
            className="bg-indigo-600 rounded-xl py-4 items-center flex-row justify-center disabled:opacity-50">
            {sending ? <ActivityIndicator color="white" /> : <><Send size={18} color="white" /><Text className="text-white font-semibold ml-2">Send Photo</Text></>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
