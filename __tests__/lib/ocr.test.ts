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

  it('does not match subtotal as total', () => {
    const text = 'SUBTOTAL: $12.00\nTOTAL: $15.50'
    const result = parseReceiptResponse(text)
    expect(result.total).toBe(15.50)
  })

  it('extracts date from OCR text', () => {
    const text = 'Store\n03/25/2026\nTOTAL: $10.00'
    const result = parseReceiptResponse(text)
    expect(result.date).toBe('03/25/2026')
  })

  it('returns null date if not found', () => {
    const result = parseReceiptResponse('TOTAL: $5.00')
    expect(result.date).toBeNull()
  })

  it('handles empty string input', () => {
    const result = parseReceiptResponse('')
    expect(result.total).toBeNull()
    expect(result.merchant).toBeNull()
    expect(result.rawText).toBe('')
  })
})
