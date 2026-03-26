import { supabase } from '@/lib/supabase'

export async function createLinkToken(userId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('plaid-link-token', {
    body: { userId },
  })
  if (error) throw new Error(`Failed to create link token: ${error.message}`)
  return data.link_token
}

export async function exchangePublicToken(publicToken: string, userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('plaid-exchange-token', {
    body: { publicToken, userId },
  })
  if (error) throw new Error(`Failed to exchange token: ${error.message}`)
}

export async function syncTransactions(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('plaid-sync-transactions', {
    body: { userId },
  })
  if (error) throw new Error(`Failed to sync transactions: ${error.message}`)
}
