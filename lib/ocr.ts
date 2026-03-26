export interface OcrReceiptResult {
  total: number | null
  merchant: string | null
  date: string | null
  rawText: string
}

export function parseReceiptResponse(text: string): OcrReceiptResult {
  const totalMatch = text.match(/\btotal[:\s]+\$?([\d.]+)/i)
  // NOTE: assumes merchant name appears on first line of receipt text
  const merchantMatch = text.split('\n')[0].trim() || null
  const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)

  return {
    total: totalMatch ? (isNaN(parseFloat(totalMatch[1])) ? null : parseFloat(totalMatch[1])) : null,
    merchant: merchantMatch,
    date: dateMatch ? dateMatch[0] : null,
    rawText: text,
  }
}

export async function scanReceiptImage(base64Image: string): Promise<OcrReceiptResult> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error('Supabase URL is not configured')

  let response: Response
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/scan-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    })
  } catch (err) {
    throw new Error('Network error while scanning receipt')
  }

  if (!response.ok) throw new Error(`Receipt scan failed: ${response.status}`)

  const data = await response.json()
  const text: string = data.text ?? ''
  return parseReceiptResponse(text)
}
