import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, Image, SafeAreaView } from 'react-native';
import { X, Send, User } from 'lucide-react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Mock types based on ChatWidget.tsx
interface ChatIdentity {
  id: string;
  name: string;
  avatar?: string | null;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: ChatIdentity;
}

interface MobileChatSheetProps {
  visible: boolean;
  onClose: () => void;
  channelId?: string | null;
  currentUserId?: string | null;
}

export function MobileChatSheet({ visible, onClose, channelId, currentUserId }: MobileChatSheetProps) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Mock data for initial render
  useEffect(() => {
    if (visible) {
      setMessages([
        {
          id: '1',
          senderId: '2',
          content: 'Hello everyone! Welcome to the study session.',
          createdAt: new Date(Date.now() - 300000).toISOString(),
          sender: { id: '2', name: 'Alice', avatar: null }
        },
        {
          id: '2',
          senderId: '3',
          content: 'Hi Alice! Excited to be here.',
          createdAt: new Date(Date.now() - 240000).toISOString(),
          sender: { id: '3', name: 'Bob', avatar: null }
        },
        {
          id: '3',
          senderId: currentUserId || '1',
          content: 'Thanks for hosting this!',
          createdAt: new Date(Date.now() - 120000).toISOString(),
          sender: { id: currentUserId || '1', name: 'You', avatar: null }
        }
      ]);
    }
  }, [visible, currentUserId]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    // Optimistic update
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUserId || '1',
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId || '1', name: 'You', avatar: null }
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    
    // TODO: Socket emission logic would go here
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUserId || item.senderId === '1'; // '1' is mock "You" ID
    
    return (
      <View className={cn("mb-4 max-w-[80%]", isMe ? "self-end" : "self-start")}>
        {!isMe && (
          <Text className="text-white/40 text-[10px] ml-1 mb-1">{item.sender?.name}</Text>
        )}
        <View 
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isMe ? "bg-[#00DC6E] rounded-tr-sm" : "bg-[#252525] rounded-tl-sm"
          )}
        >
          <Text className={cn("text-sm", isMe ? "text-[#002c16]" : "text-white")}>
            {item.content}
          </Text>
        </View>
        <Text className={cn("text-white/20 text-[9px] mt-1", isMe ? "text-right mr-1" : "ml-1")}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-[#141414] h-[80%] rounded-t-3xl overflow-hidden border-t border-white/10">
                    
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/10 bg-[#141414]">
                        <Text className="text-white font-bold text-lg">Chat</Text>
                        <TouchableOpacity 
                            onPress={onClose}
                            className="w-8 h-8 rounded-full bg-white/5 items-center justify-center active:bg-white/10"
                        >
                            <X size={16} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Messages */}
                    <FlatList
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 20 }}
                        className="flex-1 bg-[#09090b]"
                        inverted={false} // Normal chat order for now, often chat lists are inverted but keeping simple
                    />

                    {/* Input Area */}
                    <SafeAreaView className="bg-[#141414] border-t border-white/10">
                        <View className="px-4 py-3 flex-row items-center gap-3">
                            <View className="flex-1 bg-[#252525] rounded-full border border-white/10 flex-row items-center px-4 py-2.5">
                                <TextInput
                                    placeholder="Type a message..."
                                    placeholderTextColor="#6b7280"
                                    value={inputText}
                                    onChangeText={setInputText}
                                    className="flex-1 text-white text-sm h-full"
                                    multiline={false}
                                />
                            </View>
                            <TouchableOpacity 
                                onPress={handleSend}
                                className={cn(
                                    "w-11 h-11 rounded-full items-center justify-center",
                                    inputText.trim() ? "bg-[#00DC6E]" : "bg-white/5"
                                )}
                                disabled={!inputText.trim()}
                            >
                                <Send size={20} color={inputText.trim() ? "#002c16" : "rgba(255,255,255,0.3)"} />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </View>
        </KeyboardAvoidingView>
    </Modal>
  );
}
