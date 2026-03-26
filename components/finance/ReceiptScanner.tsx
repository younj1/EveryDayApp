import { View, TouchableOpacity, Text, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { scanReceiptImage } from '@/lib/ocr'

interface Props {
  onResult: (result: { total: number | null; merchant: string | null }) => void
}

export function ReceiptScanner({ onResult }: Props) {
  const handleScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return Alert.alert('Permission needed', 'Camera access is required to scan receipts')

    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
    if (result.canceled || !result.assets[0].base64) return

    const parsed = await scanReceiptImage(result.assets[0].base64)
    onResult({ total: parsed.total, merchant: parsed.merchant })
  }

  return (
    <TouchableOpacity
      className="flex-row items-center gap-2 border border-gray-200 rounded-xl px-4 py-3"
      onPress={handleScan}
    >
      <Camera size={18} color="#6366f1" />
      <Text className="text-primary font-medium">Scan Receipt</Text>
    </TouchableOpacity>
  )
}
