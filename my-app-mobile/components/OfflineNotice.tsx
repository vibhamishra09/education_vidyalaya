import React, { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineNotice() {
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected && state.isInternetReachable !== false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (isConnected !== false) {
    return null;
  }

  return (
    <View 
      className="absolute top-0 left-0 right-0 bg-red-500 z-50 flex-row items-center justify-center p-2 mb-2"
      style={{ paddingTop: Math.max(insets.top, 20) }}
    >
      <WifiOff size={16} color="white" className="mr-2" />
      <Text className="text-white font-semibold text-sm ml-2">
        No Internet Connection
      </Text>
    </View>
  );
}
