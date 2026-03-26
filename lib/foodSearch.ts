interface OpenFoodFactsProduct {
  product_name?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
  serving_size?: string
}

export interface FoodItem {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingGrams: number
  barcode?: string
}

export function parseOpenFoodFactsProduct(product: OpenFoodFactsProduct, servingGrams = 100): FoodItem {
  const factor = servingGrams / 100
  const n = product.nutriments ?? {}
  return {
    name: product.product_name ?? 'Unknown',
    calories: Math.round((n['energy-kcal_100g'] ?? 0) * factor),
    protein: Math.round((n.proteins_100g ?? 0) * factor * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g ?? 0) * factor * 10) / 10,
    fat: Math.round((n.fat_100g ?? 0) * factor * 10) / 10,
    servingGrams,
  }
}

export async function searchFood(query: string): Promise<FoodItem[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('Network error while searching food')
  }
  if (!response.ok) throw new Error(`Food search failed: ${response.status}`)
  const data = await response.json()
  return ((data.products as OpenFoodFactsProduct[]) ?? []).map((p) => parseOpenFoodFactsProduct(p))
}

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  let response: Response
  try {
    response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
  } catch {
    throw new Error('Network error while looking up barcode')
  }
  if (!response.ok) throw new Error(`Barcode lookup failed: ${response.status}`)
  const data = await response.json()
  if (data.status !== 1) return null
  return parseOpenFoodFactsProduct(data.product as OpenFoodFactsProduct)
}
