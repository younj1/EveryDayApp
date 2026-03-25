import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function NutritionScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-bold text-gray-800">Nutrition</Text>
      </View>
    </SafeAreaView>
  )
}
