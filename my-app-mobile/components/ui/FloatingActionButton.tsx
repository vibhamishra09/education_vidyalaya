import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export function FloatingActionButton() {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to create room or placeholder for now
    router.push("/create-study-room");
  };

  return (
    <View className="absolute bottom-8 right-5 z-50">
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        className="w-14 h-14 rounded-full bg-green-100 items-center justify-center shadow-lg border border-green-200"
        style={{ elevation: 5 }}
      >
        <Plus color="#166534" size={28} />
      </TouchableOpacity>
    </View>
  );
}

