import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { EnhancedVideoRoom } from '../../components/livekit/EnhancedVideoRoom';

export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Mock Session Data
  const sessionData = {
    id: id,
    title: "Webyalaya Brainstorming",
    date: new Date().toISOString(),
    duration: 60,
    sessionType: 'studyRoom',
  };

  const handleEndSession = () => {
    // Navigate back to the study room detail page
    router.back();
  };

  return (
    <View className="flex-1 bg-black">
      {/* Hide the navigation header for immersive video experience */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <EnhancedVideoRoom 
        token="mock-token-123"
        serverUrl="wss://mock-livekit-server.io"
        channelId={`room-${id}`}
        sessionData={sessionData}
        isHost={true} // For demo purposes, let's say user is host
        onEndSession={handleEndSession}
      />
    </View>
  );
}
