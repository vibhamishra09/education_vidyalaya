import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  Alert,
  KeyboardAvoidingView,
  Switch
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  Users, 
  Swords,
  Calendar,
  Shuffle,
  SortAsc
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Helper to format date/time
const formatDate = (date: Date) => {
  return date.toLocaleDateString();
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function CreateDebateRoomScreen() {
  const router = useRouter();
  
  // Form State matching web app
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState(new Date());
  
  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Default values matching web
  const [durationPerParticipant, setDurationPerParticipant] = useState('2'); // minutes
  const [maxParticipantsPerTeam, setMaxParticipantsPerTeam] = useState('3');
  const [prepTime, setPrepTime] = useState(30); // seconds
  const [turnOrder, setTurnOrder] = useState<'FIFO' | 'RANDOM'>('FIFO');

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setScheduledDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setScheduledTime(selectedDate);
    }
  };

  const handleCreate = () => {
    // Validation
    if (!topic.trim()) {
      Alert.alert('Required', 'Topic is required');
      return;
    }

    const duration = parseInt(durationPerParticipant);
    if (isNaN(duration) || duration < 1 || duration > 240) {
      Alert.alert('Invalid Input', 'Duration must be between 1 and 240 minutes');
      return;
    }

    const maxParticipants = parseInt(maxParticipantsPerTeam);
    if (isNaN(maxParticipants) || maxParticipants < 1 || maxParticipants > 6) {
      Alert.alert('Invalid Input', 'Participants must be between 1 and 6 per team');
      return;
    }

    // Schedule check
    if (scheduleForLater) {
      // Logic to combine date & time
       const now = new Date();
       // Simple check if date is in past (simplified)
       if (scheduledDate < new Date(now.setHours(0,0,0,0))) {
          Alert.alert('Invalid Date', 'Cannot schedule in the past');
          return;
       }
    }

    const payload = {
      topic,
      description,
      scheduleForLater,
      scheduledAt: scheduleForLater ? {
        date: scheduledDate,
        time: scheduledTime
      } : null,
      maxParticipantsPerTeam: maxParticipants,
      durationMinutes: duration,
      prepTimeSeconds: prepTime,
      turnOrder
    };

    console.log('Creating Debate Room:', payload);
    
    // Mock Success
    Alert.alert('Debate Room Created', 'Your room is ready!', [
      { text: 'Create Now', onPress: () => router.replace('/debate-room/1') }
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-black">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
        >
          <ArrowLeft size={24} className="text-zinc-900 dark:text-white" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-zinc-900 dark:text-white">Create Debate Room</Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 100 }}>
          
          <View className="mb-6 flex-row items-center gap-4">
             <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center">
                 <Swords size={24} color="#9333ea" />
             </View>
             <View className="flex-1">
                 <Text className="text-xl font-bold text-zinc-900 dark:text-white">
                    Set up a new debate
                 </Text>
                 <Text className="text-sm text-zinc-500">
                    Invite others to join the discussion.
                 </Text>
             </View>
          </View>

          {/* Form Fields */}
          <View className="space-y-6">
            
            {/* Topic */}
            <View>
              <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Topic *
              </Text>
              <TextInput
                value={topic}
                onChangeText={setTopic}
                placeholder="e.g., AI will replace most jobs in 10 years"
                placeholderTextColor="#A1A1AA"
                className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-900 dark:text-white"
              />
            </View>

            {/* Description */}
            <View>
              <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Description
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Optional context or rules for this debate..."
                placeholderTextColor="#A1A1AA"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-900 dark:text-white min-h-[100px]"
              />
            </View>

            {/* Schedule Toggle */}
            <View className="flex-row items-center justify-between py-2">
               <Text className="text-base font-medium text-zinc-900 dark:text-white">
                  Schedule for later
               </Text>
               <Switch 
                  value={scheduleForLater}
                  onValueChange={setScheduleForLater}
                  trackColor={{ false: "#e4e4e7", true: "#9333ea" }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
               />
            </View>

             {/* Date/Time Pickers (Visible only if scheduled) */}
             {scheduleForLater && (
                <View className="flex-row gap-4 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <View className="flex-1 space-y-2">
                        <Text className="text-xs font-medium text-zinc-500 uppercase">Date *</Text>
                        <TouchableOpacity 
                           onPress={() => setShowDatePicker(true)}
                           className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 items-center"
                        >
                            <Text className="text-zinc-900 dark:text-white">{formatDate(scheduledDate)}</Text>
                        </TouchableOpacity>
                         {showDatePicker && (
                            <DateTimePicker
                              value={scheduledDate}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={onDateChange}
                              minimumDate={new Date()}
                            />
                          )}
                    </View>

                    <View className="flex-1 space-y-2">
                        <Text className="text-xs font-medium text-zinc-500 uppercase">Time *</Text>
                        <TouchableOpacity 
                           onPress={() => setShowTimePicker(true)}
                           className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 items-center"
                        >
                            <Text className="text-zinc-900 dark:text-white">{formatTime(scheduledTime)}</Text>
                        </TouchableOpacity>
                        {showTimePicker && (
                            <DateTimePicker
                              value={scheduledTime}
                              mode="time"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={onTimeChange}
                            />
                          )}
                    </View>
                </View>
             )}

            <View className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />

            {/* Settings Grid */}
            <View className="flex-row gap-4">
               {/* Duration */}
               <View className="flex-1 space-y-2">
                  <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Duration per participant (mins) *
                  </Text>
                  <TextInput
                    value={durationPerParticipant}
                    onChangeText={setDurationPerParticipant}
                    keyboardType="number-pad"
                    className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-900 dark:text-white"
                  />
               </View>

               {/* Max Participants */}
               <View className="flex-1 space-y-2">
                  <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Max per Team *
                  </Text>
                  <TextInput
                    value={maxParticipantsPerTeam}
                    onChangeText={setMaxParticipantsPerTeam}
                    keyboardType="number-pad"
                    className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-900 dark:text-white"
                  />
                  <Text className="text-[10px] text-zinc-500">Between 1 and 6</Text>
               </View>
            </View>

            {/* Prep Time */}
            <View className="space-y-2">
               <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                 Prep Time *
               </Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  {[15, 30, 60, 120].map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setPrepTime(t)}
                      className={cn(
                        "px-4 py-2 rounded-full border",
                        prepTime === t 
                          ? "bg-purple-600 border-purple-600" 
                          : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                      )}
                    >
                      <Text className={cn(
                        "font-medium",
                        prepTime === t ? "text-white" : "text-zinc-700 dark:text-zinc-300"
                      )}>
                        {t < 60 ? `${t} seconds` : `${t / 60} minute${t === 60 ? '' : 's'}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
               </ScrollView>
            </View>

            {/* Turn Order */}
            <View className="space-y-2">
               <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                 Turn Order *
               </Text>
               <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setTurnOrder('FIFO')}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl border flex-row items-center justify-center gap-2",
                      turnOrder === 'FIFO'
                        ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                     <SortAsc size={18} color={turnOrder === 'FIFO' ? "#9333ea" : "#a1a1aa"} />
                     <Text className={cn(
                        "font-medium",
                        turnOrder === 'FIFO' ? "text-purple-700 dark:text-purple-300" : "text-zinc-600 dark:text-zinc-400"
                     )}>
                        First In First Out
                     </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setTurnOrder('RANDOM')}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl border flex-row items-center justify-center gap-2",
                      turnOrder === 'RANDOM'
                        ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                     <Shuffle size={18} color={turnOrder === 'RANDOM' ? "#9333ea" : "#a1a1aa"} />
                     <Text className={cn(
                        "font-medium",
                        turnOrder === 'RANDOM' ? "text-purple-700 dark:text-purple-300" : "text-zinc-600 dark:text-zinc-400"
                     )}>
                        Random
                     </Text>
                  </TouchableOpacity>
               </View>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Buttons */}
      <View className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-black flex-row gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-1 bg-white border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 h-12 rounded-xl items-center justify-center active:bg-zinc-50"
        >
          <Text className="text-zinc-700 dark:text-zinc-300 font-bold">
            Cancel
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleCreate}
          className="flex-1 bg-purple-600 h-12 rounded-xl items-center justify-center shadow-lg shadow-purple-600/20 active:bg-purple-700"
        >
          <Text className="text-white font-bold">
            {scheduleForLater ? 'Schedule' : 'Create Now'}
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
