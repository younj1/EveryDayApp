jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}))

import { parseMealAIResponse } from '@/lib/mealPhotoAI'

describe('parseMealAIResponse', () => {
  it('parses structured AI response', () => {
    const response = `MEAL: Chicken salad with croutons\nCALORIES: 450\nPROTEIN: 35g\nCARBS: 30g\nFAT: 15g`
    const result = parseMealAIResponse(response)
    expect(result.calories).toBe(450)
    expect(result.protein).toBe(35)
    expect(result.name).toBe('Chicken salad with croutons')
  })

  it('handles missing fields gracefully', () => {
    const result = parseMealAIResponse('nothing useful here')
    expect(result.calories).toBe(0)
    expect(result.name).toBe('Unknown meal')
  })

  it('parses grams with or without g suffix', () => {
    const response = `MEAL: Pasta\nCALORIES: 600\nPROTEIN: 20g\nCARBS: 80\nFAT: 10`
    const result = parseMealAIResponse(response)
    expect(result.carbs).toBe(80)
    expect(result.fat).toBe(10)
  })
})
