import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { EnhancedVideoRoom } from '../../components/livekit/EnhancedVideoRoom';
import { useApi } from '../../lib/use-api';
import { useAuth } from '@clerk/clerk-expo';

export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { request } = useApi();
  const { isSignedIn } = useAuth();
  
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToken = async () => {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        const response = await request<{ token: string; livekitUrl: string }>(
          '/api/livekit/token',
          {
            method: 'POST',
            body: JSON.stringify({ roomName: `studyroom-${id}` }),
          },
          { auth: true }
        );
        setToken(response.token);
        setServerUrl(response.livekitUrl);
      } catch (err) {
        console.error('Failed to fetch LiveKit token:', err);
        Alert.alert('Connection Error', 'Could not connect to the video server. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void fetchToken();
  }, [id, isSignedIn, request]);

  const handleEndSession = () => {
    router.back();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#00DC6E" size="large" />
        <Text className="text-white mt-4 font-medium">Connecting to session...</Text>
      </View>
    );
  }

  if (!token || !serverUrl) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-center mb-6">Unable to establish connection.</Text>
        <Text className="text-blue-400 font-bold" onPress={() => router.back()}>Go Back</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      
      <EnhancedVideoRoom 
        token={token}
        serverUrl={serverUrl}
        channelId={`studyroom-${id}`}
        sessionData={{
          id: id as string,
          date: new Date().toISOString(),
          duration: 60,
          sessionType: 'studyRoom',
          title: "Study Session"
        }}
        isHost={true} 
        onEndSession={handleEndSession}
      />
    </View>
  );
}
