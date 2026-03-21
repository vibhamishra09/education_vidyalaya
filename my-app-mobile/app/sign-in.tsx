import { useSignIn } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { useWarmUpBrowser } from '../hooks/useWarmUpBrowser'
import * as WebBrowser from 'expo-web-browser'
import { useOAuth } from '@clerk/clerk-expo'
import { Github } from 'lucide-react-native'

WebBrowser.maybeCompleteAuthSession()

export default function SignInScreen() {
  useWarmUpBrowser()

  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isSigningIn, setIsSigningIn] = React.useState(false)

  // OAuth hooks
  const googleOAuth = useOAuth({ strategy: 'oauth_google' })
  const githubOAuth = useOAuth({ strategy: 'oauth_github' })

  const onSignInPress = React.useCallback(async () => {
    if (!isLoaded) {
      return
    }

    setIsSigningIn(true)
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId })
        router.replace('/')
      } else {
        // See https://clerk.com/docs/custom-flows/error-handling
        // for more info on error handling
        console.error(JSON.stringify(signInAttempt, null, 2))
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2))
      alert(err.errors?.[0]?.message || 'An error occurred during sign in')
    } finally {
      setIsSigningIn(false)
    }
  }, [isLoaded, emailAddress, password, router, setActive, signIn])

  const onSelectAuth = React.useCallback(async (strategy: 'oauth_google' | 'oauth_github') => {
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

  return (
    <View className="flex-1 justify-center px-8 pt-8 pb-16">
      {/* Header */}
      <View className="mb-12 items-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</Text>
        <Text className="text-gray-500 text-center text-base">
          Sign in to verify your account and continue your progress
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
            placeholder="Enter your password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={true}
            onChangeText={(password) => setPassword(password)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 shadow-sm focus:border-green-500"
          />
        </View>

        <TouchableOpacity onPress={onSignInPress} className="w-full bg-green-600 rounded-xl py-4 active:bg-green-700 shadow-md shadow-green-200 mt-2">
            <Text className="text-white text-center font-semibold text-lg">
                {isSigningIn ? 'Signing In...' : 'Sign In'}
            </Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View className="flex-row items-center my-8">
        <View className="flex-1 h-[1px] bg-gray-200" />
        <Text className="text-gray-400 mx-4 font-medium">Or continue with</Text>
        <View className="flex-1 h-[1px] bg-gray-200" />
      </View>

      {/* Social Buttons */}
      <View className="flex-row gap-4 mb-8">
        <TouchableOpacity 
          onPress={() => onSelectAuth('oauth_google')}
          className="flex-1 flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3.5 shadow-sm active:bg-gray-50"
        >
          {/* Simple G icon representation or svg if available. Using text for now as icon is tricky without assets */}
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
        <Text className="text-gray-500 text-base">Don't have an account? </Text>
        <Link href="/sign-up" asChild>
          <TouchableOpacity>
            <Text className="text-green-600 font-semibold text-base">Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  )
}
