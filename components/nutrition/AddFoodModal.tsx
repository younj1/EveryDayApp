import { View, Text, Modal, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet } from 'react-native'
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
    } catch {
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
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Add Food</Text>

          <View style={s.mealRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.mealBtn, selectedMeal === m && s.mealBtnActive]}
                onPress={() => setSelectedMeal(m)}
              >
                <Text style={[s.mealBtnText, selectedMeal === m && s.mealBtnTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.tabRow}>
            {(['search', 'barcode', 'photo'] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.tabBtn, tab === t && s.tabBtnActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[s.tabBtnText, tab === t && s.tabBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {tab === 'search' && (
          <View style={s.searchContainer}>
            <View style={s.searchRow}>
              <TextInput
                style={s.searchInput}
                placeholder="Search foods..."
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={s.goBtn} onPress={handleSearch} disabled={isSearching}>
                {isSearching ? <ActivityIndicator color="white" size="small" /> : <Text style={s.goBtnText}>Go</Text>}
              </TouchableOpacity>
            </View>
            <FlatList
              data={results}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.resultRow} onPress={() => handleAdd(item)}>
                  <View>
                    <Text style={s.resultName}>{item.name}</Text>
                    <Text style={s.resultMacros}>P:{item.protein}g C:{item.carbs}g F:{item.fat}g</Text>
                  </View>
                  <Text style={s.resultCals}>{item.calories} kcal</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.emptyText}>Search for a food to add it</Text>}
            />
          </View>
        )}

        {tab === 'barcode' && (
          <BarcodeScanner onFound={(item) => handleAdd(item)} onClose={handleClose} />
        )}

        {tab === 'photo' && (
          <View style={s.photoContainer}>
            <Text style={s.photoDesc}>Take a photo of your meal and Claude AI will estimate the calories and macros</Text>
            <TouchableOpacity style={s.photoBtn} onPress={handlePhotoAnalysis} disabled={isAnalyzing}>
              {isAnalyzing && <ActivityIndicator color="white" size="small" />}
              <Text style={s.photoBtnText}>{isAnalyzing ? 'Analyzing...' : 'Take Photo'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  mealRow: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  mealBtn: { flex: 1, paddingVertical: 4, borderRadius: 8, alignItems: 'center', backgroundColor: '#f3f4f6' },
  mealBtnActive: { backgroundColor: '#6366f1' },
  mealBtnText: { fontSize: 11, fontWeight: '500', color: '#4b5563', textTransform: 'capitalize' },
  mealBtnTextActive: { color: '#fff' },
  tabRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', elevation: 2 },
  tabBtnText: { fontSize: 14, fontWeight: '500', color: '#9ca3af', textTransform: 'capitalize' },
  tabBtnTextActive: { color: '#111827' },
  searchContainer: { flex: 1, paddingHorizontal: 24 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  goBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: '500' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  resultName: { fontWeight: '500', color: '#1f2937' },
  resultMacros: { fontSize: 12, color: '#9ca3af' },
  resultCals: { color: '#4b5563', fontWeight: '500' },
  emptyText: { color: '#9ca3af', textAlign: 'center', paddingVertical: 32 },
  photoContainer: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  photoDesc: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
  photoBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, flexDirection: 'row', gap: 8, alignItems: 'center' },
  photoBtnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { margin: 24, alignItems: 'center' },
  cancelBtnText: { color: '#9ca3af' },
})
