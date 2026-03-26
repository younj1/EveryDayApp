import { TouchableOpacity, Text, Alert } from 'react-native'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { scanReceiptImage } from '@/lib/ocr'

interface Props {
  onResult: (result: { total: number | null; merchant: string | null }) => void
}

export function ReceiptScanner({ onResult }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan receipts')
      return
    }

    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
    if (result.canceled || !result.assets[0].base64) return

    setIsLoading(true)
    try {
      const parsed = await scanReceiptImage(result.assets[0].base64)
      onResult({ total: parsed.total, merchant: parsed.merchant })
    } catch (err) {
      Alert.alert('Scan failed', 'Could not read receipt. Please try again or enter manually.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TouchableOpacity
      className="flex-row items-center gap-2 border border-gray-200 rounded-xl px-4 py-3"
      onPress={handleScan}
      disabled={isLoading}
    >
      <Camera size={18} color="#6366f1" />
      <Text className="text-primary font-medium">{isLoading ? 'Scanning...' : 'Scan Receipt'}</Text>
    </TouchableOpacity>
  )
}
