import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Clock, AlertTriangle, X } from "lucide-react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

interface SessionEndWarningDialogProps {
  open: boolean;
  minutesRemaining: number;
  onClose?: () => void;
}

export function SessionEndWarningDialog({
  open,
  minutesRemaining,
  onClose,
}: SessionEndWarningDialogProps) {
  const [countdown, setCountdown] = useState(minutesRemaining * 60);

  useEffect(() => {
    if (open) {
      setCountdown(minutesRemaining * 60);
    }
  }, [open, minutesRemaining]);

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  if (!open) return null;

  return (
    <Animated.View 
        entering={FadeInUp.springify()} 
        exiting={FadeOutUp}
        className="absolute top-16 right-4 left-4 z-50 items-center"
    >
      <View className="bg-gray-900/95 border border-amber-500/30 rounded-2xl p-4 w-full shadow-lg shadow-black/50">
        
        <View className="flex-row items-center justify-between mb-3">
             <View className="flex-row items-center space-x-3">
                <View className="h-10 w-10 rounded-full bg-amber-500/15 items-center justify-center">
                    <AlertTriangle size={20} color="#f59e0b" />
                </View>
                <View>
                    <Text className="text-white font-bold text-base">Session Ending Soon</Text>
                    <Text className="text-gray-400 text-xs">Please wrap up your discussion</Text>
                </View>
             </View>
             <TouchableOpacity onPress={onClose} className="bg-white/10 p-1.5 rounded-full">
                 <X size={16} color="white" />
             </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-center bg-black/40 rounded-lg py-2 mb-3">
            <Clock size={16} color="#f59e0b" style={{ marginRight: 8 }} />
            <Text className="text-2xl font-mono font-bold text-amber-500">
                {minutes}:{seconds.toString().padStart(2, "0")}
            </Text>
        </View>

        <TouchableOpacity 
          onPress={onClose}
          className="bg-amber-500/20 py-2.5 rounded-lg border border-amber-500/30 items-center"
        >
          <Text className="text-amber-500 font-bold">Dismiss Warning</Text>
        </TouchableOpacity>

      </View>
    </Animated.View>
  );
}
