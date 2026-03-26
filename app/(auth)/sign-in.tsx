import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSignIn = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return Alert.alert('Error', error.message)
    router.replace('/(tabs)')
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const redirectTo = Linking.createURL('/')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error || !data.url) throw error ?? new Error('No OAuth URL returned')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type !== 'success') return

      const fragment = result.url.split('#')[1] ?? ''
      const params = new URLSearchParams(fragment)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (!access_token || !refresh_token) {
        throw new Error('Missing tokens in redirect URL')
      }

      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token })
      if (sessionError) throw sessionError

      router.replace('/(tabs)')
    } catch (e: any) {
      Alert.alert('Google Sign In Failed', e.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome back</Text>
      <Text className="text-gray-500 mb-8">Sign in to your account</Text>

      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-900"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-900"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />
      <TouchableOpacity
        className="bg-primary rounded-xl py-4 items-center mb-4"
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold text-base">Sign In</Text>}
      </TouchableOpacity>

      <View className="flex-row items-center mb-4">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="text-gray-400 text-sm mx-3">or</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>

      <TouchableOpacity
        className="border border-gray-200 rounded-xl py-4 items-center flex-row justify-center mb-4"
        onPress={handleGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color="#6b7280" />
        ) : (
          <>
            <Text className="text-lg mr-2">G</Text>
            <Text className="text-gray-700 font-semibold text-base">Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity className="items-center" onPress={() => router.push('/(auth)/sign-up')}>
        <Text className="text-primary text-sm">Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  )
}
