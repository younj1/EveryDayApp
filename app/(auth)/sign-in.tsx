import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return Alert.alert('Error', error.message)
    router.replace('/(tabs)')
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
        className="bg-primary rounded-xl py-4 items-center"
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Sign In</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity className="mt-4 items-center" onPress={() => router.push('/(auth)/sign-up')}>
        <Text className="text-primary text-sm">Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  )
}
