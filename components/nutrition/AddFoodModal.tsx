import { View, Text, Modal, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native'
import { useState } from 'react'
import { searchFood, FoodItem } from '@/lib/foodSearch'
import { useNutritionStore } from '@/stores/nutritionStore'
import { BarcodeScanner } from './BarcodeScanner'
import * as ImagePicker from 'expo-image-picker'
import { analyzeMealPhoto } from '@/lib/mealPhotoAI'

type Tab = 'search' | 'barcode' | 'photo'
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface Props { visible: boolean; onClose: () => void }

export function AddFoodModal({ visible, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast')
  const addFoodEntry = useNutritionStore((s) => s.addFoodEntry)
  const today = new Date().toISOString().split('T')[0]

  const handleSearch = async () => {
    if (!query.trim()) return
    setIsSearching(true)
    try {
      const items = await searchFood(query.trim())
      setResults(items)
    } catch {
      Alert.alert('Search failed', 'Could not search foods. Check your connection.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAdd = (item: FoodItem) => {
    addFoodEntry({
      mealType: selectedMeal,
      foodName: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      date: today,
      source: tab === 'barcode' ? 'barcode' : tab === 'photo' ? 'photo' : 'search',
    })
    setQuery('')
    setResults([])
    onClose()
  }

  const handlePhotoAnalysis = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed to photograph your meal.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
      mediaTypes: ['images'],
    })
    if (result.canceled || !result.assets[0]?.base64) return
    setIsAnalyzing(true)
    try {
      const estimate = await analyzeMealPhoto(result.assets[0].base64)
      handleAdd({
        name: estimate.name,
        calories: estimate.calories,
        protein: estimate.protein,
        carbs: estimate.carbs,
        fat: estimate.fat,
        servingGrams: 0,
      })
    } catch (err) {
      Alert.alert('Analysis failed', 'Could not analyse the photo. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleClose = () => {
    setQuery('')
    setResults([])
    setTab('search')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-white">
        <View className="px-6 pt-6 pb-2">
          <Text className="text-xl font-bold text-gray-900 mb-4">Add Food</Text>

          {/* Meal selector */}
          <View className="flex-row gap-1 mb-4">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
              <TouchableOpacity
                key={m}
                className={`flex-1 py-1 rounded-lg items-center ${selectedMeal === m ? 'bg-primary' : 'bg-gray-100'}`}
                onPress={() => setSelectedMeal(m)}
              >
                <Text className={`text-xs font-medium capitalize ${selectedMeal === m ? 'text-white' : 'text-gray-600'}`}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab selector */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
            {(['search', 'barcode', 'photo'] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                className={`flex-1 py-2 rounded-lg items-center ${tab === t ? 'bg-white shadow' : ''}`}
                onPress={() => setTab(t)}
              >
                <Text className={`text-sm font-medium capitalize ${tab === t ? 'text-gray-900' : 'text-gray-400'}`}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {tab === 'search' && (
          <View className="flex-1 px-6">
            <View className="flex-row gap-2 mb-4">
              <TextInput
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3"
                placeholder="Search foods..."
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                className="bg-primary rounded-xl px-4 items-center justify-center"
                onPress={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? <ActivityIndicator color="white" size="small" /> : <Text className="text-white font-medium">Go</Text>}
              </TouchableOpacity>
            </View>
            <FlatList
              data={results}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row justify-between items-center py-3 border-b border-gray-100"
                  onPress={() => handleAdd(item)}
                >
                  <View>
                    <Text className="font-medium text-gray-800">{item.name}</Text>
                    <Text className="text-xs text-gray-400">P:{item.protein}g C:{item.carbs}g F:{item.fat}g</Text>
                  </View>
                  <Text className="text-gray-600 font-medium">{item.calories} kcal</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text className="text-gray-400 text-center py-8">Search for a food to add it</Text>}
            />
          </View>
        )}

        {tab === 'barcode' && (
          <BarcodeScanner
            onFound={(item) => handleAdd(item)}
            onClose={handleClose}
          />
        )}

        {tab === 'photo' && (
          <View className="flex-1 px-6 items-center justify-center gap-4">
            <Text className="text-gray-500 text-sm text-center">Take a photo of your meal and Claude AI will estimate the calories and macros</Text>
            <TouchableOpacity
              className="bg-primary rounded-xl py-4 px-8 items-center flex-row gap-2"
              onPress={handlePhotoAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing && <ActivityIndicator color="white" size="small" />}
              <Text className="text-white font-semibold">{isAnalyzing ? 'Analyzing...' : 'Take Photo'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity className="m-6 items-center" onPress={handleClose}>
          <Text className="text-gray-400">Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}
