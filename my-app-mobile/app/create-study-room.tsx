import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  Pressable, 
  Switch, 
  Image, 
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft, 
  Layers, 
  Image as ImageIcon, 
  Upload, 
  X, 
  Calendar, 
  Sparkles, 
  Clock, 
  Users, 
  Banknote,
  RotateCcw,
  Plus,
  CheckCircle2
} from "lucide-react-native";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LinearGradient } from "expo-linear-gradient";
import { getErrorMessage } from "../lib/api";
import { useApi } from "../lib/use-api";
import { useBackendUser } from "../lib/backend-user-context";
import { useProtectedRoute } from "../lib/use-protected-route";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalTime(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildLocalDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

// Enum for recurrence (matching web)
enum StudyRoomRecurrenceMode {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  CUSTOM_DATES = "CUSTOM_DATES",
}

interface StudyRoomFormData {
  title: string;
  description: string;
  imageUrl?: string;
  skills: string[];
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: string;
  maxParticipants: string;
  joiningFee: string;
  recurrenceEnabled: boolean;
  recurrenceMode: StudyRoomRecurrenceMode;
  recurrenceInterval: string;
  recurrenceWeekdays: number[];
  recurrenceCustomDates: string;
  recurrenceRepeatUntil: string;
}

const initialFormData: StudyRoomFormData = {
  title: "",
  description: "",
  skills: [],
  date: "",
  time: "",
  duration: "60",
  maxParticipants: "5",
  joiningFee: "0",
  recurrenceEnabled: false,
  recurrenceMode: StudyRoomRecurrenceMode.DAILY,
  recurrenceInterval: "1",
  recurrenceWeekdays: [],
  recurrenceCustomDates: "",
  recurrenceRepeatUntil: "",
};

const weekdayOptions = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const recurrenceOptions = [
  { label: "Daily", value: StudyRoomRecurrenceMode.DAILY },
  { label: "Weekly", value: StudyRoomRecurrenceMode.WEEKLY },
  { label: "Custom", value: StudyRoomRecurrenceMode.CUSTOM_DATES },
] as const;

const durationOptions = ["30", "45", "60", "90"] as const;

export default function CreateStudyRoomScreen() {
  const router = useRouter();
  const { request } = useApi();
  const {
    ready: backendReady,
    loading: backendBootstrapLoading,
    error: backendBootstrapError,
    refresh: refreshBackendUser,
  } = useBackendUser();
  const { shouldBlock } = useProtectedRoute(true, "/create-study-room");
  const [formData, setFormData] = useState<StudyRoomFormData>(initialFormData);
  const [isInstantRoom, setIsInstantRoom] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retryingBackendBootstrap, setRetryingBackendBootstrap] = useState(false);

  // Sync instant room time
  useEffect(() => {
    if (isInstantRoom) {
      const now = new Date();
      setFormData((prev) => ({
        ...prev,
        date: formatLocalDate(now),
        time: formatLocalTime(now),
        recurrenceEnabled: false,
      }));
    }
  }, [isInstantRoom]);

  const updateField = (field: keyof StudyRoomFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      if (formData.skills.length >= 10) {
        Alert.alert("Limit Reached", "You can add up to 10 skills.");
        return;
      }
      if (!formData.skills.includes(skillInput.trim())) {
        updateField("skills", [...formData.skills, skillInput.trim()]);
      }
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    updateField("skills", formData.skills.filter((s) => s !== skillToRemove));
  };

  const handleImageUploadPlaceholder = () => {
    Alert.alert("Image Upload", "Image upload functionality requires distinct permissions/library setup. Placeholder for now.");
    // In a real implementation: use expo-image-picker
  };

  const handleSubmit = async () => {
    // Validation logic (simplified from web)
    if (!formData.title) {
        Alert.alert("Required", "Please enter a room name");
        return;
    }
    if (formData.skills.length === 0) {
        Alert.alert("Required", "Please add at least one skill");
        return;
    }
    if (!isInstantRoom && (!formData.date || !formData.time)) {
        Alert.alert("Required", "Please select date and time (e.g., YYYY-MM-DD and HH:mm)");
        return;
    }

    const scheduledStart = buildLocalDateTime(formData.date, formData.time);
    if (!scheduledStart) {
      Alert.alert("Invalid schedule", "Please enter a valid date and time.");
      return;
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (scheduledStart.getTime() < twoMinutesAgo.getTime()) {
      Alert.alert(
        "Invalid schedule",
        "Study rooms cannot be scheduled in the past.",
      );
      return;
    }

    if (!backendReady) {
      let backendReadyAfterRetry = backendReady;

      if (!backendBootstrapLoading) {
        setRetryingBackendBootstrap(true);
        try {
          backendReadyAfterRetry = await refreshBackendUser();
        } finally {
          setRetryingBackendBootstrap(false);
        }
      }

      if (!backendReadyAfterRetry) {
        Alert.alert(
          "Account setup pending",
          backendBootstrapError || "We could not finish syncing your profile with the backend yet. Please try again in a moment.",
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      const recurrence = formData.recurrenceEnabled
        ? {
            mode: formData.recurrenceMode,
            interval: Number(formData.recurrenceInterval || 1),
            weekdays:
              formData.recurrenceMode === StudyRoomRecurrenceMode.WEEKLY
                ? formData.recurrenceWeekdays
                : undefined,
            customDates:
              formData.recurrenceMode === StudyRoomRecurrenceMode.CUSTOM_DATES
                ? formData.recurrenceCustomDates
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : undefined,
            repeatUntil: formData.recurrenceRepeatUntil,
          }
        : undefined;

      const createdRoom = await request<{ id: string }>(
        "/api/study-rooms",
        {
          method: "POST",
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            imageUrl: formData.imageUrl,
            skills: formData.skills,
            date: formData.date,
            time: formData.time,
            duration: Number(formData.duration),
            maxParticipants: Number(formData.maxParticipants),
            joiningFee: Number(formData.joiningFee || 0),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
            recurrence:
              recurrence && recurrence.repeatUntil
                ? recurrence
                : undefined,
          }),
        },
        { auth: true },
      );

      router.replace({
        pathname: "/study-room/[id]",
        params: { id: createdRoom.id },
      });
    } catch (error) {
      Alert.alert("Could not create room", getErrorMessage(error, "Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const potentialEarnings = (parseInt(formData.maxParticipants) || 0) * (parseInt(formData.joiningFee) || 0);

  if (shouldBlock) {
    return (
      <LinearGradient colors={['#f7fefb', '#fafffd', '#ffffff']} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text className="text-base text-slate-500">Redirecting to sign in...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#f7fefb', '#fafffd', '#ffffff']} style={{flex: 1}}>
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <View className="px-5 pt-2 pb-6">
          <Pressable 
            onPress={() => router.back()} 
            className="flex-row items-center self-start py-2 mb-2"
          >
            <ArrowLeft size={16} color="#64748b" />
            <Text className="text-sm font-medium text-slate-500 ml-1.5">
              Back to Dashboard
            </Text>
          </Pressable>
          
          <Text className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
            Create Study Room
          </Text>
          <Text className="text-lg text-slate-500 leading-6 font-normal">
            Share your expertise, host a session, and earn crypto.
          </Text>
        </View>

        {/* Form Content */}
        <View className="px-4 space-y-8">
          {!backendBootstrapLoading && backendBootstrapError ? (
            <View className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <Text className="font-semibold text-rose-700">{backendBootstrapError}</Text>
              <Text className="mt-2 text-rose-700">
                If you are testing on a physical phone, the app now prefers your Expo host IP over `localhost` for backend calls.
              </Text>
            </View>
          ) : null}

          {/* Title Input */}
          <View className="space-y-3">
            <Text className="text-xs font-bold text-slate-500 tracking-widest uppercase ml-1">
              Room Name
            </Text>
            <View className="bg-white border-2 border-dashed border-slate-200 rounded-xl px-5 py-4 shadow-sm shadow-slate-100">
              <TextInput
                placeholder="Enter a catchy title..."
                placeholderTextColor="#cbd5e1"
                className="text-2xl font-bold text-slate-900 h-auto p-0"
                value={formData.title}
                onChangeText={(text) => updateField("title", text)}
                multiline
              />
            </View>
          </View>

          {/* Room Details Card */}
          <View className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50 p-6 space-y-6">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-full bg-blue-100 items-center justify-center">
                <Layers size={20} color="#3b82f6" />
              </View>
              <Text className="text-lg font-semibold text-slate-800">
                What's this room about?
              </Text>
            </View>

            {/* Description */}
            <View className="space-y-2">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                Description
              </Text>
              <View className="bg-white border border-slate-200 rounded-lg p-1">
                <TextInput
                  placeholder="Provide a brief agenda or learning outcomes..."
                  placeholderTextColor="#94a3b8"
                  className="bg-transparent p-3 text-slate-800 min-h-[100px] align-top text-base font-normal leading-relaxed"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={formData.description}
                  onChangeText={(text) => updateField("description", text)}
                />
              </View>
            </View>

            {/* Image Upload */}
            <View className="space-y-2">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                Cover Image <Text className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] lowercase text-slate-500 font-normal ml-2">Optional</Text>
              </Text>
              
              <View className="border-2 border-dashed border-slate-100 rounded-xl p-8 items-center bg-slate-50/30">
                {formData.imageUrl ? (
                  <View className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-100">
                    <Image source={{ uri: formData.imageUrl }} className="w-full h-full" resizeMode="cover" />
                    <Pressable 
                      onPress={() => updateField("imageUrl", undefined)}
                      className="absolute top-2 right-2 bg-rose-500 p-1.5 rounded-full shadow-sm"
                    >
                      <X size={14} color="white" />
                    </Pressable>
                  </View>
                ) : (
                  <View className="items-center w-full">
                    <View className="h-14 w-14 rounded-full bg-emerald-50 items-center justify-center mb-3">
                      <ImageIcon size={28} color="#10b981" />
                    </View>
                    <Text className="text-base font-semibold text-slate-900 mb-1">Upload cover image</Text>
                    <Text className="text-xs text-slate-500 mb-4 text-center">JPEG, PNG, WebP, or GIF (max 5MB)</Text>
                    
                    <Pressable 
                      onPress={handleImageUploadPlaceholder}
                      className="flex-row items-center border border-emerald-500 rounded-lg px-4 py-2 bg-white"
                    >
                      <View style={{ marginRight: 8 }}>
                        <Upload size={16} color="#10b981" />
                      </View>
                      <Text className="text-sm font-semibold text-emerald-600">Choose Image</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* Tags & Skills */}
            <View className="space-y-2">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                Tags & Skills
              </Text>
              <View className="bg-white border border-slate-300 rounded-lg flex-row items-center pr-2 shadow-sm shadow-slate-100/50">
                <TextInput
                  placeholder="Type a skill (e.g. React, Math) and press Enter"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 p-3.5 text-slate-800 text-base"
                  value={skillInput}
                  onChangeText={setSkillInput}
                  onSubmitEditing={handleAddSkill}
                  returnKeyType="done"
                />
              </View>
              <Text className="text-[10px] text-slate-400 ml-1">{formData.skills.length}/10 skills selected</Text>
              
              <View className="flex-row flex-wrap gap-2 mt-2">
                {formData.skills.map((skill, index) => (
                  <Pressable 
                    key={index} 
                    onPress={() => handleRemoveSkill(skill)}
                    className="flex-row items-center bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full"
                  >
                    <Text className="text-emerald-700 text-sm font-medium mr-1.5">{skill}</Text>
                    <X size={12} color="#059669" />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Schedule Card */}
          <View className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50 p-6 space-y-6">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-full bg-amber-50 items-center justify-center">
                <Calendar size={20} color="#d97706" />
              </View>
              <Text className="text-lg font-semibold text-slate-800">
                When & Where
              </Text>
            </View>

            {/* Instant Session Toggle */}
            <View className="flex-row items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <View className="space-y-1 flex-1 pr-4">
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Sparkles size={16} color={isInstantRoom ? "#f59e0b" : "#64748b"} fill={isInstantRoom ? "#f59e0b" : "transparent"} />
                  <Text className="text-base font-semibold text-slate-900">Instant Session</Text>
                </View>
                <Text className="text-xs text-slate-500 leading-4">Start immediately. No scheduling required.</Text>
              </View>
              <Switch 
                value={isInstantRoom} 
                onValueChange={setIsInstantRoom}
                trackColor={{ false: "#e2e8f0", true: "#f59e0b" }} 
                thumbColor={Platform.OS === 'ios' ? '#ffffff' : '#ffffff'}
              />
            </View>

            {/* Date Time Inputs */}
            {!isInstantRoom && (
              <View className="space-y-5">
                 <View className="space-y-2">
                    <Text className="text-xs font-bold text-slate-400 uppercase ml-1">Date</Text>
                    <View className="relative bg-white border border-slate-300 rounded-lg">
                      <View className="absolute left-3.5 top-3.5 z-10 pointer-events-none">
                        <Calendar size={18} color="#64748b" />
                      </View>
                      <TextInput
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#cbd5e1"
                        className="pl-11 pr-3 py-3 text-slate-800 text-base"
                        value={formData.date}
                        onChangeText={(text) => updateField("date", text)}
                      />
                    </View>
                 </View>
                  
                 <View className="space-y-2">
                    <Text className="text-xs font-bold text-slate-400 uppercase ml-1">Time</Text>
                    <View className="relative bg-white border border-slate-300 rounded-lg">
                      <View className="absolute left-3.5 top-3.5 z-10 pointer-events-none">
                        <Clock size={18} color="#64748b" />
                      </View>
                      <TextInput
                        placeholder="HH:MM"
                        placeholderTextColor="#cbd5e1"
                        className="pl-11 pr-3 py-3 text-slate-800 text-base"
                        value={formData.time}
                        onChangeText={(text) => updateField("time", text)}
                      />
                    </View>
                 </View>

                 {/* Repeat Schedule Toggle */}
                 <View className="pt-6 border-t border-dashed border-slate-200">
                    <View className="flex-row items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <View>
                        <Text className="text-sm font-semibold text-slate-900 mb-0.5">Repeat Schedule</Text>
                        <Text className="text-xs text-slate-500">Daily, weekly, or custom dates up to one year</Text>
                      </View>
                      <Switch 
                        value={formData.recurrenceEnabled} 
                        onValueChange={(val) => updateField("recurrenceEnabled", val)} 
                        trackColor={{ false: "#e2e8f0", true: "#3b82f6" }}
                      />
                    </View>

                    {formData.recurrenceEnabled && (
                      <View className="mt-4 p-5 rounded-xl border border-slate-200 bg-white space-y-5">
                        <View className="space-y-2">
                           <Text className="text-xs font-bold text-slate-400 uppercase">Repeat Type</Text>
                           <View className="flex-row gap-2">
                              {recurrenceOptions.map((mode) => (
                                <Pressable
                                  key={mode.value}
                                  onPress={() => updateField("recurrenceMode", mode.value)}
                                  style={[
                                    styles.segmentButton,
                                    formData.recurrenceMode === mode.value
                                      ? styles.segmentButtonActive
                                      : styles.segmentButtonInactive,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.segmentButtonText,
                                      formData.recurrenceMode === mode.value
                                        ? styles.segmentButtonTextActive
                                        : styles.segmentButtonTextInactive,
                                    ]}
                                  >
                                    {mode.label}
                                  </Text>
                                </Pressable>
                              ))}
                           </View>
                        </View>

                        <View className="flex-row gap-4">
                           <View className="flex-1 space-y-2">
                              <Text className="text-xs font-bold text-slate-400 uppercase">Every (Weeks/Days)</Text>
                              <TextInput 
                                keyboardType="numeric"
                                value={formData.recurrenceInterval}
                                onChangeText={(val) => updateField("recurrenceInterval", val)}
                                className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 font-medium"
                              />
                           </View>
                           <View className="flex-1 space-y-2">
                              <Text className="text-xs font-bold text-slate-400 uppercase">Repeat Until</Text>
                              <TextInput 
                                placeholder="YYYY-MM-DD"
                                value={formData.recurrenceRepeatUntil}
                                onChangeText={(val) => updateField("recurrenceRepeatUntil", val)}
                                className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 font-medium"
                              />
                           </View>
                        </View>
                      </View>
                    )}
                 </View>
              </View>
            )}
          </View>

           {/* Configuration Card */}
           <View className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50 p-6 space-y-7 mb-8">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-full bg-emerald-50 items-center justify-center">
                <Users size={20} color="#10b981" />
              </View>
              <Text className="text-lg font-semibold text-slate-800">
                Configuration
              </Text>
            </View>

            {/* Duration */}
            <View className="space-y-3">
              <Text className="text-sm font-semibold text-slate-900">Session Duration</Text>
              <View className="flex-row gap-2">
                {durationOptions.map((mins) => (
                  <Pressable 
                    key={mins}
                    onPress={() => updateField("duration", mins)}
                    style={[
                      styles.durationButton,
                      formData.duration === mins
                        ? styles.durationButtonActive
                        : styles.durationButtonInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationButtonText,
                        formData.duration === mins
                          ? styles.durationButtonTextActive
                          : styles.durationButtonTextInactive,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Max Participants */}
            <View className="space-y-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-semibold text-slate-900">Max Participants</Text>
                <View className="bg-slate-100 px-3 py-1 rounded-md min-w-[36px] items-center justify-center">
                   <Text className="text-sm font-bold text-slate-800">{formData.maxParticipants}</Text>
                </View>
              </View>
              
              <View className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                 <View 
                    className="absolute bg-blue-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, (parseInt(formData.maxParticipants) / 100) * 100)}%` }}
                 />
              </View>
              <View className="flex-row justify-between text-xs text-slate-400 px-1">
                 <Text className="text-xs text-slate-400">2</Text>
                 <Text className="text-xs text-slate-400">100</Text>
              </View>
               <View className="flex-row items-center gap-2 mt-1">
                 <Pressable 
                    onPress={() => updateField("maxParticipants", Math.max(2, parseInt(formData.maxParticipants) - 1).toString())}
                    className="h-10 w-10 border border-slate-200 rounded-lg items-center justify-center bg-white active:bg-slate-50"
                 >
                    <Text className="text-lg font-bold text-slate-700">-</Text>
                 </Pressable>
                  <TextInput 
                    className="flex-1 h-10 border border-slate-200 rounded-lg text-center font-bold bg-white text-slate-900"
                    keyboardType="numeric"
                    value={formData.maxParticipants}
                    onChangeText={(val) => updateField("maxParticipants", val)}
                  />
                  <Pressable 
                    onPress={() => updateField("maxParticipants", Math.min(100, parseInt(formData.maxParticipants) + 1).toString())}
                    className="h-10 w-10 border border-slate-200 rounded-lg items-center justify-center bg-white active:bg-slate-50"
                 >
                    <Text className="text-lg font-bold text-slate-700">+</Text>
                 </Pressable>
              </View>
            </View>

            {/* Entry Fee */}
            <View className="space-y-3 pt-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-slate-900">Entry Fee</Text>
                <View className="bg-amber-100 px-2.5 py-1 rounded-full flex-row items-center gap-1.5">
                   <Banknote size={12} color="#92400e" />
                   <Text className="text-xs font-bold text-amber-800 uppercase tracking-wide">Coins</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                  <Pressable 
                    onPress={() => {
                        const val = parseInt(formData.joiningFee) || 0;
                        if (val > 0) updateField("joiningFee", (val - 5).toString());
                    }}
                    className="h-12 w-12 border border-slate-200 rounded-xl items-center justify-center bg-white active:bg-slate-50 shadow-sm"
                 >
                    <Text className="text-2xl font-bold text-slate-700 pb-1">−</Text>
                 </Pressable>

                 <View className="flex-1 relative">
                    <View className="absolute left-4 top-3.5 z-10 pointer-events-none">
                      <Banknote size={20} color="#94a3b8" />
                    </View>
                    <TextInput 
                       value={formData.joiningFee}
                       onChangeText={(val) => updateField("joiningFee", val)}
                       keyboardType="numeric"
                       className="h-12 border border-slate-200 rounded-xl pl-12 pr-4 bg-white text-lg font-bold text-center text-slate-900"
                    />
                 </View>

                 <Pressable 
                    onPress={() => {
                        const val = parseInt(formData.joiningFee) || 0;
                        updateField("joiningFee", (val + 5).toString());
                    }}
                    className="h-12 w-12 border border-slate-200 rounded-xl items-center justify-center bg-white active:bg-slate-50 shadow-sm"
                 >
                    <Text className="text-2xl font-bold text-slate-700 pb-1">+</Text>
                 </Pressable>
              </View>
              <Text className="text-xs text-slate-500 font-medium ml-1">
                 Set to 0 for a free session.
              </Text>
            </View>

           </View>
        </View>

        {/* Floating Action / Submit Button */}
        <View className="mb-8 mx-4 p-5 bg-white border border-slate-100 rounded-3xl mt-4 relative shadow-sm">
          
          {/* Earnings Preview */}
          <View className="flex-row items-center justify-between bg-white rounded-xl p-4 mb-4 border border-slate-100 shadow-sm">
              <View className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full bg-emerald-400 opacity-60 ml-1" />
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest">Est. Earnings</Text>
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-4xl font-extrabold text-slate-900">{potentialEarnings}</Text>
                <Text className="text-lg font-bold text-amber-500">Coins</Text>
              </View>
          </View>

          <Pressable 
              onPress={() => void handleSubmit()}
              disabled={submitting || retryingBackendBootstrap}
              className="w-full bg-emerald-100 h-14 rounded-xl flex-row items-center justify-center border border-emerald-200"
          >
              <Text className="text-emerald-900 font-bold text-lg mr-2">
                {submitting ? "Launching..." : retryingBackendBootstrap ? "Syncing..." : "Launch Session"}
              </Text>
              <CheckCircle2 size={20} color="#065f46" strokeWidth={2.5} />
          </Pressable>
          
          <Text className="text-[10px] text-slate-400 text-center mt-3">
              By launching, you agree to the <Text className="underline">host guidelines</Text>.
          </Text>

          {/* Plus button floating */}
          <View className="absolute -top-7 right-6 shadow-xl shadow-emerald-500/20 z-10">
              <View className="bg-emerald-100 h-14 w-14 rounded-full items-center justify-center border-4 border-white">
                  <Plus size={24} color="#065f46" />
              </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  segmentButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentButtonInactive: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  segmentButtonTextActive: {
    color: "#ffffff",
  },
  segmentButtonTextInactive: {
    color: "#475569",
  },
  durationButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingVertical: 10,
  },
  durationButtonActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  durationButtonInactive: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  durationButtonTextActive: {
    color: "#1d4ed8",
  },
  durationButtonTextInactive: {
    color: "#475569",
  },
});
