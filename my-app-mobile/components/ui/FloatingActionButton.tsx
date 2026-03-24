import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function FloatingActionButton() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    if (!isSignedIn) {
      router.push({
        pathname: '/sign-in',
        params: { redirectTo: '/create-study-room' },
      });
      return;
    }

    router.push("/create-study-room");
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { bottom: Math.max(insets.bottom + 16, 32) }]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        className="w-14 h-14 rounded-full bg-green-100 items-center justify-center shadow-lg border border-green-200"
        style={{ elevation: 5 }}
        hitSlop={8}
      >
        <Plus color="#166534" size={28} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
  },
});
