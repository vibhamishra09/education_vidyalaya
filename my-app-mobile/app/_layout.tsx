import "../global.css";
import { Stack, useSegments, usePathname, useRootNavigationState, useRouter } from "expo-router";
import React, { useEffect, useState, Component, ReactNode } from 'react';
import { View } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { tokenCache } from '../lib/tokenCache';
import { OfflineNotice } from '../components/OfflineNotice';
import { SidebarProvider, useSidebar } from '../lib/SidebarContext';
import { Sidebar } from '../components/Sidebar';
import { BackendUserProvider } from '../lib/backend-user-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env',
  )
}

// Error boundary to catch navigation context errors during transitions
class SidebarErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Reset error state after a short delay to retry rendering
    setTimeout(() => this.setState({ hasError: false }), 100);
  }

  render() {
    if (this.state.hasError) {
      return null; // Render nothing during error recovery
    }
    return this.props.children;
  }
}

function LayoutContent() {
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { setPathname, setNavigateFunction } = useSidebar();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    setPathname(pathname);
  }, [pathname]);

  // Set navigation function in context so Sidebar can navigate without needing navigation context
  useEffect(() => {
    setNavigateFunction((path: string) => {
      router.push(path as any);
    });
  }, [router, setNavigateFunction]);

  // Hide FAB on live-session screens (video call UI) and debate-room screens (specific FAB)
  const hideStartButton = segments.includes('live-session') ||
    segments.includes('sign-in') ||
    segments.includes('sign-up') ||
    segments.includes('debate-room');

  // Check if navigation is ready - this properly tracks navigation context availability
  const isNavigationReady = rootNavigationState?.key != null;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#c9fbd7', '#e2fdf0', '#f5fff8']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <OfflineNotice />
      <Stack screenOptions={{ contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="browse" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="how-it-works" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="profile" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="about" options={{ title: 'About', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="terms-of-use" options={{ title: 'Terms of Use', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
      </Stack>
      {!hideStartButton && <FloatingActionButton />}
      <SidebarErrorBoundary>
        {isNavigationReady && <Sidebar />}
      </SidebarErrorBoundary>
    </View>
  );
}

export default function Layout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <BackendUserProvider>
          <SafeAreaProvider>
            <SidebarProvider>
              <LayoutContent />
            </SidebarProvider>
          </SafeAreaProvider>
        </BackendUserProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

