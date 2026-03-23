import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Linking, Alert } from 'react-native';
import { Twitter, Facebook, Linkedin, MessageCircle, Link, Share2, X } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  message?: string;
}

export function ShareSheet({ visible, onClose, url, title, message }: ShareSheetProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(message || title || '');

  const handleShare = async (platform: string) => {
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `whatsapp://send?text=${encodedText} ${encodedUrl}`;
        break;
      case 'copy':
        await Clipboard.setStringAsync(url);
        Alert.alert('Copied', 'Link copied to clipboard!');
        onClose();
        return;
    }

    if (shareUrl) {
      try {
        const supported = await Linking.canOpenURL(shareUrl);
        if (supported || platform === 'facebook' || platform === 'linkedin' || platform === 'twitter') {
             // Web URLs are always supported usually
             await Linking.openURL(shareUrl);
        } else {
            Alert.alert('Error', `Could not open ${platform}`);
        }
      } catch (err) {
        console.error(err);
      }
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-slate-100">
             <View className="flex-row items-center gap-2">
                <Share2 size={20} color="#0f172a" />
                <Text className="text-lg font-bold text-slate-900">Share via...</Text>
             </View>
             <TouchableOpacity onPress={onClose} className="p-1 bg-slate-100 rounded-full">
                <X size={20} color="#64748b" />
             </TouchableOpacity>
          </View>

          {/* Options */}
          <View className="p-4 space-y-4">
            
            <TouchableOpacity 
                className="flex-row items-center gap-4 p-2 active:bg-slate-50 rounded-xl"
                onPress={() => handleShare('twitter')}
            >
                <View className="w-10 h-10 rounded-full bg-sky-50 items-center justify-center">
                    <Twitter size={20} color="#0ea5e9" />
                </View>
                <Text className="text-base font-semibold text-slate-700">Twitter</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                className="flex-row items-center gap-4 p-2 active:bg-slate-50 rounded-xl"
                onPress={() => handleShare('facebook')}
            >
               <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                    <Facebook size={20} color="#2563eb" />
                </View>
                <Text className="text-base font-semibold text-slate-700">Facebook</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                className="flex-row items-center gap-4 p-2 active:bg-slate-50 rounded-xl"
                onPress={() => handleShare('linkedin')}
            >
                <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                    <Linkedin size={20} color="#0a66c2" />
                </View>
                <Text className="text-base font-semibold text-slate-700">LinkedIn</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                className="flex-row items-center gap-4 p-2 active:bg-slate-50 rounded-xl"
                onPress={() => handleShare('whatsapp')}
            >
                <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center">
                    <MessageCircle size={20} color="#22c55e" />
                </View>
                <Text className="text-base font-semibold text-slate-700">WhatsApp</Text>
            </TouchableOpacity>

            <View className="h-[1px] bg-slate-100 my-2" />

            <TouchableOpacity 
                className="flex-row items-center gap-4 p-2 active:bg-slate-50 rounded-xl"
                onPress={() => handleShare('copy')}
            >
                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
                    <Link size={20} color="#475569" />
                </View>
                <Text className="text-base font-semibold text-slate-700">Copy Link</Text>
            </TouchableOpacity>

          </View>
          <View className="h-6" /> 
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});
