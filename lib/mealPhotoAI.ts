import { supabase } from '@/lib/supabase'

export interface MealEstimate {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function parseMealAIResponse(text: string): MealEstimate {
  const name = text.match(/MEAL:\s*(.+)/i)?.[1]?.trim() ?? 'Unknown meal'
  const calories = parseInt(text.match(/CALORIES:\s*(\d+)/i)?.[1] ?? '0', 10)
  const protein = parseInt(text.match(/PROTEIN:\s*(\d+)/i)?.[1] ?? '0', 10)
  const carbs = parseInt(text.match(/CARBS:\s*(\d+)/i)?.[1] ?? '0', 10)
  const fat = parseInt(text.match(/FAT:\s*(\d+)/i)?.[1] ?? '0', 10)
  return { name, calories, protein, carbs, fat }
}

export async function analyzeMealPhoto(base64Image: string): Promise<MealEstimate> {
  const { data, error } = await supabase.functions.invoke('analyze-meal', {
    body: { image: base64Image },
  })
  if (error) throw new Error(`Meal analysis failed: ${error.message}`)
  if (typeof data?.text !== 'string') throw new Error('Invalid response from meal analysis service')
  return parseMealAIResponse(data.text)
}
