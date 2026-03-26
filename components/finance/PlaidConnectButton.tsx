import { TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'
import { createLinkToken, exchangePublicToken, syncTransactions } from '@/lib/plaid'

WebBrowser.maybeCompleteAuthSession()

export function PlaidConnectButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const linkToken = await createLinkToken(user.id)

      // Open Plaid Link in browser — Plaid hosted link page
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
      const redirectUri = `${supabaseUrl}/functions/v1/plaid-oauth-redirect`
      const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}&redirect_uri=${encodeURIComponent(redirectUri)}`

      const result = await WebBrowser.openAuthSessionAsync(plaidUrl, redirectUri)

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url)
        const publicToken = url.searchParams.get('public_token')
        if (publicToken) {
          await exchangePublicToken(publicToken, user.id)
          await syncTransactions(user.id)
          setIsConnected(true)
          Alert.alert('Success', 'Bank account connected and transactions synced!')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      Alert.alert('Connection failed', message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isConnected) {
    return (
      <TouchableOpacity
        className="bg-gray-100 rounded-xl py-3 px-6 items-center flex-row justify-center gap-2"
        onPress={handleConnect}
        disabled={isLoading}
      >
        <Text className="text-green-700 font-semibold">✓ Bank Connected — Sync Again</Text>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      className="bg-green-500 rounded-xl py-3 px-6 items-center flex-row justify-center gap-2"
      onPress={handleConnect}
      disabled={isLoading}
    >
      {isLoading && <ActivityIndicator color="white" size="small" />}
      <Text className="text-white font-semibold">{isLoading ? 'Connecting...' : 'Connect Bank Account'}</Text>
    </TouchableOpacity>
  )
}
