import React, { useState, useCallback } from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSignUp, useOAuth } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { useWarmUpBrowser } from '../hooks/useWarmUpBrowser'
import * as WebBrowser from 'expo-web-browser'
import { Github } from 'lucide-react-native'

WebBrowser.maybeCompleteAuthSession()

export default function SignUpScreen() {
  useWarmUpBrowser()
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const googleOAuth = useOAuth({ strategy: 'oauth_google' })
  const githubOAuth = useOAuth({ strategy: 'oauth_github' })

  // Handle Sign Up
  const onSignUpPress = async () => {
    if (!isLoaded) return

    setIsLoading(true)
    try {
      await signUp.create({
        emailAddress,
        password,
      })

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      setPendingVerification(true)
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2))
      alert(err.errors?.[0]?.message || 'An error occurred during sign up')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Verification
  const onPressVerify = async () => {
    if (!isLoaded) return

    setIsLoading(true)
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId })
        router.replace('/')
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2))
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2))
      alert(err.errors?.[0]?.message || 'An error occurred during verification')
    } finally {
      setIsLoading(false)
    }
  }

  const onSelectAuth = useCallback(async (strategy: 'oauth_google' | 'oauth_github') => {
    const selectedAuth = strategy === 'oauth_google' ? googleOAuth : githubOAuth
    
    try {
      const { createdSessionId, setActive } = await selectedAuth.startOAuthFlow()

      if (createdSessionId) {
        if (setActive) {
          await setActive({ session: createdSessionId })
        }
        router.replace('/')
      } else {
        // Use signIn or signUp for next steps such as MFA
      }
    } catch (err) {
      console.error('OAuth error', err)
      // alert('OAuth error: ' + (err as Error).message)
    }
  }, [googleOAuth, githubOAuth, router])

  if (pendingVerification) {
    return (
      <View className="flex-1 justify-center px-8">
        <View className="mb-8 items-center">
            <Text className="text-3xl font-bold text-gray-900 mb-2">Verify Email</Text>
            <Text className="text-gray-500 text-base">
                We sent a code to <Text className="font-semibold text-gray-700">{emailAddress}</Text>.
            </Text>
        </View>

        <View className="space-y-4">
            <TextInput
            value={code}
            placeholder="Enter verification code"
            placeholderTextColor="#9CA3AF"
            onChangeText={(code) => setCode(code)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 shadow-sm focus:border-green-500 text-center tracking-widest text-lg"
            keyboardType="number-pad"
            />
            
            <TouchableOpacity onPress={onPressVerify} className="w-full bg-green-600 rounded-xl py-4 active:bg-green-700 shadow-md shadow-green-200 mt-4">
                <Text className="text-white text-center font-semibold text-lg">
                    {isLoading ? 'Verifying...' : 'Verify Email'}
                </Text>
            </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 justify-center px-8 pt-8 pb-16">
      {/* Header */}
      <View className="mb-12 items-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
        <Text className="text-gray-500 text-center text-base">
          Sign up to track your progress and join the community
        </Text>
      </View>

      {/* Form */}
      <View className="space-y-4">
        <View>
          <Text className="text-gray-700 font-medium mb-1 ml-1">Email Address</Text>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Enter your email"
            placeholderTextColor="#9CA3AF"
            onChangeText={(email) => setEmailAddress(email)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 shadow-sm focus:border-green-500"
          />
        </View>

        <View>
          <Text className="text-gray-700 font-medium mb-1 ml-1">Password</Text>
          <TextInput
            value={password}
            placeholder="Create a password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={true}
            onChangeText={(password) => setPassword(password)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 shadow-sm focus:border-green-500"
          />
        </View>

        <TouchableOpacity onPress={onSignUpPress} className="w-full bg-green-600 rounded-xl py-4 active:bg-green-700 shadow-md shadow-green-200 mt-2">
            <Text className="text-white text-center font-semibold text-lg">
                {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View className="flex-row items-center my-8">
        <View className="flex-1 h-[1px] bg-gray-200" />
        <Text className="text-gray-400 mx-4 font-medium">Or sign up with</Text>
        <View className="flex-1 h-[1px] bg-gray-200" />
      </View>

      {/* Social Buttons */}
      <View className="flex-row gap-4 mb-8">
        <TouchableOpacity 
          onPress={() => onSelectAuth('oauth_google')}
          className="flex-1 flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3.5 shadow-sm active:bg-gray-50"
        >
          <Text className="text-gray-700 font-semibold text-base ml-2">Google</Text>
        </TouchableOpacity>

        <TouchableOpacity 
            onPress={() => onSelectAuth('oauth_github')}
            className="flex-1 flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3.5 shadow-sm active:bg-gray-50"
        >
            <Github size={20} color="#374151" />
            <Text className="text-gray-700 font-semibold text-base ml-2">GitHub</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View className="flex-row justify-center">
        <Text className="text-gray-500 text-base">Already have an account? </Text>
        <Link href="/sign-in" asChild>
          <TouchableOpacity>
            <Text className="text-green-600 font-semibold text-base">Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  )
}
