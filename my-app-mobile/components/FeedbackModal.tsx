import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import clsx from 'clsx';
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Note: Replicating types locally if @/types/api.types is not available
// Web uses FeedbackCategory = 'bug' | 'feature-request' | ...
type CategoryOption = {
  value: string; // Should match FeedbackCategory
  label: string;
};

const CATEGORIES: CategoryOption[] = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature-request', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
];

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  initialCategory?: string;
}

export function FeedbackModal({ visible, onClose, initialCategory = 'general' }: FeedbackModalProps) {
  const [category, setCategory] = useState<string>(initialCategory);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Empty Feedback', 'Please enter your feedback before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      // In real implementation: await feedbackApi.submitFeedback({...})
      await new Promise(resolve => setTimeout(resolve, 1500));

      const payload = {
        featureArea: "general", // Required by web
        feedbackType: "freeform",
        categories: [category], // Web expects array
        freeformText: feedbackText,
        submittedAt: new Date().toISOString(),
        deviceInfo: {
          browser: "Mobile App", // Web field
          device: `${Platform.OS} ${Platform.Version}`, // Additional context
          screenResolution: "N/A"
        }
      };

      console.log('App Feedback submitted:', JSON.stringify(payload, null, 2));

      setFeedbackText('');
      setCategory(initialCategory); // Reset to default
      onClose();
      Alert.alert('Thank You', 'Your feedback has been received!');

    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end"
      >
        <TouchableOpacity 
           activeOpacity={1} 
           onPress={onClose}
           className="absolute inset-0 bg-black/50"
        />
        
        <View className="bg-white rounded-t-3xl h-[80%] w-full shadow-lg overflow-hidden">
          <View className="flex-row justify-between items-center p-5 border-b border-gray-100 bg-white z-10">
            <Text className="text-xl font-bold text-gray-900">Send Feedback</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 40 }}>
            <Text className="text-gray-600 mb-4">
              We value your input! Let us know if you found a bug, have a feature idea, or just want to share your thoughts.
            </Text>

            <Text className="text-sm font-semibold text-gray-900 mb-3">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  activeOpacity={0.7}
                  onPress={() => setCategory(cat.value)}
                  className={cn(
                    "px-4 py-2 rounded-full border",
                    category === cat.value
                      ? "bg-black border-black"
                      : "bg-white border-gray-300"
                  )}
                >
                  <Text
                    className={cn(
                      "font-medium",
                      category === cat.value ? "text-white" : "text-gray-700"
                    )}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-semibold text-gray-900 mb-3">Your Feedback</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-900 min-h-[150px] mb-6 text-base"
              placeholder="Tell us more clearly..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={feedbackText}
              onChangeText={setFeedbackText}
              style={{ paddingTop: 16 }}
            />

            <TouchableOpacity
              className={cn(
                "py-4 rounded-xl flex-row justify-center items-center shadow-sm mb-8",
                isSubmitting ? "bg-gray-400" : "bg-black"
              )}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="white" className="mr-2" />
                  <Text className="text-white font-bold text-lg">Sending...</Text>
                </>
              ) : (
                <Text className="text-white font-bold text-lg">Submit Feedback</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
