import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import clsx from 'clsx';
import { StatusBar } from 'expo-status-bar';

// --- TYPES ---
// Aligned with my-app/src/types/api.types.ts
interface SessionFeedbackAnswers {
  valueScore?: number; // 1-10, mapped from 1-5 rating * 2
  whatMakeMustUse?: string; // Mapped from positive feedback
  whatWouldChange?: string; // Mapped from improvement feedback
  finalThoughts?: string; // Combined?
}

interface SessionFeedbackSubmission {
  sessionId: string;
  sessionType: 'studyRoom' | 'peerSession';
  isHost: boolean;
  answers: SessionFeedbackAnswers;
  submittedAt?: string;
}

export default function SessionFeedbackScreen() {
  const { id, sessionType = 'peerSession', isHost = 'false' } = useLocalSearchParams<{ id: string, sessionType?: string, isHost?: string }>();
  const router = useRouter();
  
  const [rating, setRating] = useState(0);
  const [positiveFeedback, setPositiveFeedback] = useState('');
  const [improvementFeedback, setImprovementFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating to continue.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const answers: SessionFeedbackAnswers = {
        valueScore: rating * 2, // Map 5-star to 10-point scale
        whatMakeMustUse: positiveFeedback,
        whatWouldChange: improvementFeedback,
        finalThoughts: `Positive: ${positiveFeedback} | Improved: ${improvementFeedback}`
      };

      const payload: SessionFeedbackSubmission = {
        sessionId: id as string,
        sessionType: sessionType as 'studyRoom' | 'peerSession',
        isHost: isHost === 'true',
        answers,
        submittedAt: new Date().toISOString()
      };
      
      console.log('Feedback submitted:', JSON.stringify(payload, null, 2));
      
      Alert.alert(
        'Feedback Submitted',
        'Thank you for your feedback!',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View className="flex-row justify-center space-x-2 my-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            activeOpacity={0.7}
          >
            <Star
              size={40}
              color={star <= rating ? "#F59E0B" : "#D1D5DB"} // Amber-500 matches web's yellow/orange
              fill={star <= rating ? "#F59E0B" : "none"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack.Screen options={{ title: 'Session Feedback', headerBackTitle: 'Back' }} />
      
      <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
          How was the session?
        </Text>
        <Text className="text-base text-gray-500 text-center mb-6">
          Your feedback helps us improve the learning experience.
        </Text>

        <View className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8">
          {renderStars()}
          <Text className="text-center text-gray-600 font-medium mt-2">
            {rating === 0 ? 'Tap to rate' : 
             rating === 1 ? 'Poor' :
             rating === 2 ? 'Fair' :
             rating === 3 ? 'Good' :
             rating === 4 ? 'Very Good' : 'Excellent'}
          </Text>
        </View>

        <View className="space-y-6">
          <View>
            <Text className="text-base font-semibold text-gray-900 mb-2">
              What went well?
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-900 min-h-[100px]"
              placeholder="e.g., The explanation was clear, good examples..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={positiveFeedback}
              onChangeText={setPositiveFeedback}
            />
          </View>

          <View>
            <Text className="text-base font-semibold text-gray-900 mb-2">
              What could be improved?
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-900 min-h-[100px]"
              placeholder="e.g., Audio quality, pace/speed..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={improvementFeedback}
              onChangeText={setImprovementFeedback}
            />
          </View>
        </View>

        <TouchableOpacity
          className={clsx(
            "mt-8 py-4 rounded-xl flex-row justify-center items-center shadow-sm",
            isSubmitting ? "bg-gray-400" : "bg-black"
          )}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg">Submitting...</Text>
            </>
          ) : (
            <Text className="text-white font-bold text-lg">Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
