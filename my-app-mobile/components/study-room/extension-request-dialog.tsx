import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Clock, UserPlus, X } from 'lucide-react-native';

interface ExtensionRequestDialogProps {
  open: boolean;
  requesterName: string;
  onApprove: () => void;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export function ExtensionRequestDialog({
  open,
  requesterName,
  onApprove,
  onDismiss,
}: ExtensionRequestDialogProps) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!open) {
      setCountdown(30);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onDismiss();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, onDismiss]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={open}
      onRequestClose={onDismiss}
    >
      <View className="flex-1 justify-center items-center bg-black/60 p-6">
        <View className="bg-gray-900 rounded-2xl w-full max-w-sm border border-yellow-500/30 overflow-hidden shadow-2xl">
            {/* Header with decorative strip */}
            <View className="bg-yellow-500/10 p-4 border-b border-yellow-500/20 flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-yellow-500/20 items-center justify-center mr-3">
                    <UserPlus size={20} color="#facc15" />
                </View>
                <View className="flex-1">
                    <Text className="text-white font-bold text-lg">Time Extension</Text>
                    <Text className="text-yellow-500 text-xs font-medium">Auto-dismiss in {countdown}s</Text>
                </View>
                <TouchableOpacity onPress={onDismiss}>
                    <X size={20} color="gray" />
                </TouchableOpacity>
            </View>

            <View className="p-5">
                <Text className="text-gray-300 text-base mb-6 leading-6">
                    <Text className="font-bold text-white">{requesterName}</Text> has requested to extend the session by <Text className="font-bold text-white">15 minutes</Text>.
                </Text>

                <View className="flex-row space-x-3">
                    <TouchableOpacity 
                        onPress={onDismiss}
                        className="flex-1 bg-gray-800 py-3 rounded-xl border border-gray-700 items-center"
                    >
                        <Text className="text-gray-400 font-medium">Decline</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={onApprove}
                        className="flex-1 bg-yellow-600 py-3 rounded-xl items-center shadow-lg shadow-yellow-900/40"
                    >
                        <Text className="text-white font-bold">Approve</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            {/* Countdown progress bar at bottom (optional visual flair) */}
            <View className="h-1 bg-gray-800 w-full">
                <View 
                    style={{ width: `${(countdown / 30) * 100}%` }} 
                    className="h-full bg-yellow-500 transition-all duration-1000"
                />
            </View>
        </View>
      </View>
    </Modal>
  );
}
