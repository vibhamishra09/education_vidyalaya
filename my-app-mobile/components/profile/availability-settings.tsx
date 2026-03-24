import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, TextInput } from 'react-native';
import { Calendar, Save, Clock, Info, Check } from 'lucide-react-native';

interface AvailabilitySlot {
  dayOfWeek: number;
  label: string;
  slots: { start: string; end: string }[];
  isBlocked: boolean; // Renamed from isActive to match the "Block Out" logic
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function AvailabilitySettings() {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    DAYS_OF_WEEK.map(d => ({
      dayOfWeek: d.value,
      label: d.label,
      slots: [{ start: "09:00", end: "17:00" }],
      isBlocked: false
    }))
  );

  const [saving, setSaving] = useState(false);

  const toggleDayBlocked = (index: number) => {
    setAvailability(prev => 
      prev.map((slot, i) => i === index ? { ...slot, isBlocked: !slot.isBlocked } : slot)
    );
  };

  const handleSave = () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  const areAllDaysAvailable = availability.every(slot => !slot.isBlocked);

  return (
    <View className="mb-4">
       {/* Header */}
       <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-1">
                <Calendar size={20} className="text-emerald-600 dark:text-emerald-400" />
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Block Out Unavailable Hours</Text>
            </View>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">
                Manage your weekly schedule for peer sessions.
            </Text>
       </View>

      {/* Main Card */}
      <View className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4 shadow-sm">
          <Text className="text-slate-600 dark:text-slate-300 mb-4 text-sm font-medium">
            You are available 24/7 by default. Add specific times when you are NOT available.
          </Text>

          {/* Status Banner */}
          <View className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3 mb-6 flex-row items-start gap-3">
             <View className="bg-emerald-100 dark:bg-emerald-800 p-1 rounded-full mt-0.5">
                <Check size={14} className="text-emerald-700 dark:text-emerald-300" />
             </View>
             <View className="flex-1">
                <Text className="text-emerald-800 dark:text-emerald-300 font-bold mb-0.5 text-base">
                    {areAllDaysAvailable ? "✓ You're Available 24/7" : "Custom Schedule Active"}
                </Text>
                <Text className="text-emerald-600 dark:text-emerald-400 text-sm leading-5">
                    {areAllDaysAvailable 
                        ? "No blocked hours set - users can book sessions anytime."
                        : "You have marked some times as unavailable."}
                </Text>
             </View>
          </View>

          {/* List Days */}
          <View className="border-t border-slate-100 dark:border-slate-800">
            {availability.map((slot, index) => (
            <View key={slot.dayOfWeek} className="py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <View className="flex-row items-center justify-between mb-2">
                    <View className="gap-1">
                        <Text className="text-base font-bold text-slate-800 dark:text-slate-200">{slot.label}</Text>
                        {!slot.isBlocked ? (
                            <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full self-start overflow-hidden">
                                Available all day
                            </Text>
                        ) : (
                            <Text className="text-rose-600 dark:text-rose-400 text-xs font-medium bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full self-start overflow-hidden">
                                Blocked
                            </Text>
                        )}
                    </View>
                    <Switch
                        value={slot.isBlocked}
                        onValueChange={() => toggleDayBlocked(index)}
                        trackColor={{ false: "#e2e8f0", true: "#f43f5e" }} // Rose for blocked
                        thumbColor={slot.isBlocked ? "#ffffff" : "#f1f5f9"}
                    />
                </View>
                
                {slot.isBlocked && (
                    <View className="mt-3 pl-4 border-l-2 border-rose-100 dark:border-rose-900/50 ml-1">
                        <Text className="text-xs font-medium text-rose-500 mb-2 uppercase tracking-wide">Select Blocked Time Range</Text>
                         <View className="flex-row items-center gap-3">
                            <View className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-3 border border-slate-200 dark:border-slate-700 flex-row items-center gap-2">
                                <Clock size={16} className="text-slate-400" />
                                <TextInput
                                    value={slot.slots[0].start}
                                    placeholder="09:00"
                                    className="flex-1 text-slate-900 dark:text-white font-medium text-base"
                                />
                            </View>
                            <Text className="text-slate-400 font-medium">to</Text>
                            <View className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-3 border border-slate-200 dark:border-slate-700 flex-row items-center gap-2">
                                <Clock size={16} className="text-slate-400" />
                                <TextInput
                                    value={slot.slots[0].end}
                                    placeholder="17:00"
                                    className="flex-1 text-slate-900 dark:text-white font-medium text-base"
                                />
                            </View>
                        </View>
                    </View>
                )}
            </View>
            ))}
          </View>
      </View>

      {/* Tip Box */}
      <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 mb-6 flex-row gap-3">
        <Info size={20} className="text-blue-500 mt-0.5" />
        <Text className="flex-1 text-blue-700 dark:text-blue-300 text-sm leading-5">
            <Text className="font-bold">Tip: </Text>
            Leave all days off to stay available 24/7. Toggle a day ON to block specific hours.
        </Text>
      </View>

       {/* Save Button */}
       <TouchableOpacity 
            onPress={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 shadow-sm mb-8 ${
                saving 
                ? 'bg-emerald-700 opacity-70' 
                : 'bg-emerald-600 active:bg-emerald-700'
            }`}
        >   
            {saving ? (
                <Text className="text-white font-bold text-lg">Saving...</Text>
            ) : (
                <>
                <Save size={20} className="text-white" />
                <Text className="text-white font-bold text-lg">Save Unavailable Hours</Text>
                </>
            )}
        </TouchableOpacity>

      {/* Quick Setup Guide */}
      <View className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
         <Text className="text-base font-bold text-slate-800 dark:text-white mb-4">Quick Setup Guide</Text>
         <View className="gap-4">
            <View className="flex-row gap-3">
                <View className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 items-center justify-center mt-0.5">
                    <Text className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">1</Text>
                </View>
                <Text className="flex-1 text-slate-700 dark:text-slate-300 text-sm leading-5">
                    <Text className="font-bold">Default:</Text> You're available 24/7 - anyone can book you anytime
                </Text>
            </View>
            <View className="flex-row gap-3">
                <View className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900 items-center justify-center mt-0.5">
                    <Text className="text-rose-700 dark:text-rose-400 text-xs font-bold">2</Text>
                </View>
                <Text className="flex-1 text-slate-700 dark:text-slate-300 text-sm leading-5">
                    <Text className="font-bold">Block Hours:</Text> Toggle days ON to block specific unavailable times
                </Text>
            </View>
         </View>
      </View>

    </View>
  );
}
