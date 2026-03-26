import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useState } from 'react'
import { lookupBarcode, FoodItem } from '@/lib/foodSearch'

interface Props { onFound: (item: FoodItem) => void; onClose: () => void }

export function BarcodeScanner({ onFound, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [isLooking, setIsLooking] = useState(false)

  if (!permission) return <View />

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-gray-700 text-center mb-4">Camera access is needed to scan barcodes</Text>
        <TouchableOpacity className="bg-primary rounded-xl px-6 py-3" onPress={requestPermission}>
          <Text className="text-white font-semibold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isLooking) return
    setScanned(true)
    setIsLooking(true)
    try {
      const item = await lookupBarcode(data)
      if (item) {
        onFound(item)
      } else {
        setScanned(false) // allow retry if not found
      }
    } catch {
      setScanned(false)
    } finally {
      setIsLooking(false)
    }
  }

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <TouchableOpacity
        className="absolute bottom-8 self-center bg-white px-6 py-3 rounded-full"
        onPress={onClose}
      >
        <Text className="font-semibold text-gray-800">Cancel</Text>
      </TouchableOpacity>
      {isLooking && (
        <View className="absolute top-8 self-center bg-black/60 px-4 py-2 rounded-full">
          <Text className="text-white text-sm">Looking up product...</Text>
        </View>
      )}
    </View>
  )
}
