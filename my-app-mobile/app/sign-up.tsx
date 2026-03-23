import { useAuth, useOAuth, useSignUp } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Github } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useWarmUpBrowser } from '../hooks/useWarmUpBrowser';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  useWarmUpBrowser();

  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const oauthRedirectUrl = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: 'myappmobile',
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

  const onSignUpPress = async () => {
    if (!isLoaded) {
      return;
    }

    setIsLoading(true);
    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      alert(err.errors?.[0]?.message || 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) {
      return;
    }

    setIsLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace(nextRoute as any);
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      alert(err.errors?.[0]?.message || 'An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

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
          'Sign up not completed',
          'The authentication flow finished without creating a session. Please try again.',
        );
      } catch (err) {
        console.error('OAuth error', err);
        Alert.alert(
          'Sign up failed',
          'We could not complete the sign-up flow in this build. Please try again.',
        );
      }
    },
    [githubOAuth, googleOAuth, nextRoute, oauthRedirectUrl, router],
  );

  if (pendingVerification) {
    return (
      <View className="flex-1 justify-center px-8">
        <View className="mb-8 items-center">
          <Text className="mb-2 text-3xl font-bold text-gray-900">Verify Email</Text>
          <Text className="text-base text-gray-500">
            We sent a code to <Text className="font-semibold text-gray-700">{emailAddress}</Text>.
          </Text>
        </View>

        <View className="space-y-4">
          <TextInput
            value={code}
            placeholder="Enter verification code"
            placeholderTextColor="#9CA3AF"
            onChangeText={setCode}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-center text-lg tracking-widest text-gray-900 shadow-sm focus:border-green-500"
            keyboardType="number-pad"
          />

          <TouchableOpacity
            onPress={() => void onPressVerify()}
            className="mt-4 w-full rounded-xl bg-green-600 py-4 active:bg-green-700 shadow-md shadow-green-200"
          >
            <Text className="text-center text-lg font-semibold text-white">
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center px-8 pt-8 pb-16">
      <View className="mb-12 items-center">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Create Account</Text>
        <Text className="text-center text-base text-gray-500">
          Sign up to track your progress and join the community
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
            placeholder="Create a password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            onChangeText={setPassword}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-900 shadow-sm focus:border-green-500"
          />
        </View>

        <TouchableOpacity
          onPress={() => void onSignUpPress()}
          className="mt-2 w-full rounded-xl bg-green-600 py-4 active:bg-green-700 shadow-md shadow-green-200"
        >
          <Text className="text-center text-lg font-semibold text-white">
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="my-8 flex-row items-center">
        <View className="h-[1px] flex-1 bg-gray-200" />
        <Text className="mx-4 font-medium text-gray-400">Or sign up with</Text>
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
        <Text className="text-base text-gray-500">Already have an account? </Text>
        <Link
          href={{
            pathname: '/sign-in',
            params: redirectTo ? { redirectTo } : undefined,
          }}
          asChild
        >
          <TouchableOpacity>
            <Text className="text-base font-semibold text-green-600">Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
