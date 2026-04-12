import { useAuth, useOAuth, useSignIn } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Github } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useWarmUpBrowser } from '../hooks/useWarmUpBrowser';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  useWarmUpBrowser();

  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const oauthRedirectUrl = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: 'webyalaya',
        path: 'oauth-native-callback',
      }),
    [],
  );
  const googleOAuth = useOAuth({ strategy: 'oauth_google', redirectUrl: oauthRedirectUrl });
  const githubOAuth = useOAuth({ strategy: 'oauth_github', redirectUrl: oauthRedirectUrl });
  const nextRoute = useMemo(() => redirectTo || '/dashboard', [redirectTo]);

  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.replace(nextRoute as any);
    }
  }, [isAuthLoaded, isSignedIn, nextRoute, router]);

  const onSignInPress = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    setIsSigningIn(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace(nextRoute as any);
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      alert(err.errors?.[0]?.message || 'An error occurred during sign in');
    } finally {
      setIsSigningIn(false);
    }
  }, [emailAddress, isLoaded, nextRoute, password, router, setActive, signIn]);

  const onSelectAuth = useCallback(
    async (strategy: 'oauth_google' | 'oauth_github') => {
      const selectedAuth = strategy === 'oauth_google' ? googleOAuth : githubOAuth;

      try {
        const { createdSessionId, setActive: setOAuthActive } =
          await selectedAuth.startOAuthFlow({ redirectUrl: oauthRedirectUrl });

        if (createdSessionId) {
          if (setOAuthActive) {
            await setOAuthActive({ session: createdSessionId });
          }
          router.replace(nextRoute as any);
          return;
        }

        Alert.alert(
          'Sign in not completed',
          'The authentication flow finished without creating a session. Please try again.',
        );
      } catch (err) {
        console.error('OAuth error', err);
        Alert.alert(
          'Sign in failed',
          'We could not complete the sign-in flow in this build. Please try again.',
        );
      }
    },
    [githubOAuth, googleOAuth, nextRoute, oauthRedirectUrl, router],
  );

  return (
    <View className="flex-1 justify-center px-8 pt-8 pb-16">
      <View className="mb-12 items-center">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Welcome Back</Text>
        <Text className="text-center text-base text-gray-500">
          Sign in to verify your account and continue your progress
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="mb-1 ml-1 text-gray-700 font-medium">Email Address</Text>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Enter your email"
            placeholderTextColor="#9CA3AF"
            onChangeText={setEmailAddress}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-900 shadow-sm focus:border-green-500"
          />
        </View>

        <View>
          <Text className="mb-1 ml-1 text-gray-700 font-medium">Password</Text>
          <TextInput
            value={password}
            placeholder="Enter your password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            onChangeText={setPassword}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-900 shadow-sm focus:border-green-500"
          />
        </View>

        <TouchableOpacity
          onPress={() => void onSignInPress()}
          className="mt-2 w-full rounded-xl bg-green-600 py-4 active:bg-green-700 shadow-md shadow-green-200"
        >
          <Text className="text-center text-lg font-semibold text-white">
            {isSigningIn ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="my-8 flex-row items-center">
        <View className="h-[1px] flex-1 bg-gray-200" />
        <Text className="mx-4 font-medium text-gray-400">Or continue with</Text>
        <View className="h-[1px] flex-1 bg-gray-200" />
      </View>

      <View className="mb-8 flex-row gap-4">
        <TouchableOpacity
          onPress={() => void onSelectAuth('oauth_google')}
          className="flex-1 flex-row items-center justify-center rounded-xl border border-gray-200 bg-white py-3.5 shadow-sm active:bg-gray-50"
        >
          <Text className="ml-2 text-base font-semibold text-gray-700">Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void onSelectAuth('oauth_github')}
          className="flex-1 flex-row items-center justify-center rounded-xl border border-gray-200 bg-white py-3.5 shadow-sm active:bg-gray-50"
        >
          <Github size={20} color="#374151" />
          <Text className="ml-2 text-base font-semibold text-gray-700">GitHub</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center">
        <Text className="text-base text-gray-500">Don't have an account? </Text>
        <Link
          href={{
            pathname: '/sign-up',
            params: redirectTo ? { redirectTo } : undefined,
          }}
          asChild
        >
          <TouchableOpacity>
            <Text className="text-base font-semibold text-green-600">Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
