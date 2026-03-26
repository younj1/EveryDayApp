export interface OcrReceiptResult {
  total: number | null
  merchant: string | null
  date: string | null
  rawText: string
}

export function parseReceiptResponse(text: string): OcrReceiptResult {
  const totalMatch = text.match(/total[:\s]+\$?([\d.]+)/i)
  const merchantMatch = text.split('\n')[0]?.trim() || null
  const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)

  return {
    total: totalMatch ? parseFloat(totalMatch[1]) : null,
    merchant: merchantMatch,
    date: dateMatch ? dateMatch[0] : null,
    rawText: text,
  }
}

export async function scanReceiptImage(base64Image: string): Promise<OcrReceiptResult> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'TEXT_DETECTION' }],
        }],
      }),
    }
  )
  const data = await response.json()
  const text = data.responses?.[0]?.fullTextAnnotation?.text || ''
  return parseReceiptResponse(text)
}
