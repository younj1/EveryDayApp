import { parseReceiptResponse } from '@/lib/ocr'

describe('parseReceiptResponse', () => {
  it('extracts total from OCR text', () => {
    const text = 'TOTAL: $24.99\nThank you'
    const result = parseReceiptResponse(text)
    expect(result.total).toBe(24.99)
  })

  it('returns null total if not found', () => {
    const result = parseReceiptResponse('no price here')
    expect(result.total).toBeNull()
  })
})
