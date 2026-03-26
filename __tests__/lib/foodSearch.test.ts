import { parseOpenFoodFactsProduct } from '@/lib/foodSearch'

describe('parseOpenFoodFactsProduct', () => {
  it('extracts nutrition from OFF product', () => {
    const raw = {
      product_name: 'Oat Milk',
      nutriments: { 'energy-kcal_100g': 50, proteins_100g: 1, carbohydrates_100g: 6.5, fat_100g: 1.5 },
      serving_size: '200ml',
    }
    const result = parseOpenFoodFactsProduct(raw, 200)
    expect(result.name).toBe('Oat Milk')
    expect(result.calories).toBe(100)
  })

  it('returns Unknown for missing product name', () => {
    const result = parseOpenFoodFactsProduct({}, 100)
    expect(result.name).toBe('Unknown')
    expect(result.calories).toBe(0)
  })

  it('rounds calories correctly', () => {
    const raw = { product_name: 'Test', nutriments: { 'energy-kcal_100g': 33.333 } }
    const result = parseOpenFoodFactsProduct(raw, 100)
    expect(result.calories).toBe(33)
  })
})
