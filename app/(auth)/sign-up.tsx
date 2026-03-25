import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function SignUpScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!name || !email || !password) return Alert.alert('Error', 'Please fill in all fields')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    setLoading(false)
    if (error) return Alert.alert('Error', error.message)
    Alert.alert('Check your email', 'Check your email for confirmation', [
      { text: 'OK', onPress: () => router.replace('/(auth)/sign-in') },
    ])
  }

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <Text className="text-3xl font-bold text-gray-900 mb-2">Create account</Text>
      <Text className="text-gray-500 mb-8">Start your everyday journey</Text>
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-900"
        placeholder="Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
      />
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
        autoComplete="password-new"
      />
      <TouchableOpacity
        className="bg-primary rounded-xl py-4 items-center"
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Sign Up</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity className="mt-4 items-center" onPress={() => router.replace('/(auth)/sign-in')}>
        <Text className="text-primary text-sm">Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  )
}
