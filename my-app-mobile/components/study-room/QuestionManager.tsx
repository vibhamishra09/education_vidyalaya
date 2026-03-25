import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Alert } from 'react-native';
import { 
    Plus, Trash2, GripVertical, Upload, Send, ChevronDown, ChevronUp, Edit2, Check, X, Play, Zap 
} from 'lucide-react-native';

export interface FlashQuestion {
  id: string;
  text: string;
  duration?: number;      // seconds (0 = manual dismiss)
  position?: 'top' | 'center' | 'bottom';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  bgColor?: string;
}

interface QuestionManagerProps {
	questions: FlashQuestion[]
	onUpdateQuestion: (questionId: string, updates: Partial<Omit<FlashQuestion, 'id'>>) => void
	onDeleteQuestion: (questionId: string) => void
    onAddQuestion: (text: string) => void
	onFlashQuestion: (questionId: string) => void
	onFlashAdHoc: (text: string, meta?: Omit<FlashQuestion, 'id' | 'text'>) => void
    onClose: () => void
    visible: boolean
}

// Generate a simple unique ID
function uid() {
	return `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const FONT_SIZE_OPTIONS: Array<{ value: FlashQuestion['fontSize']; label: string }> = [
	{ value: 'sm', label: 'Small' },
	{ value: 'md', label: 'Medium' },
	{ value: 'lg', label: 'Large' },
	{ value: 'xl', label: 'XL' },
]

const POSITION_OPTIONS: Array<{ value: FlashQuestion['position']; label: string }> = [
	{ value: 'top', label: 'Top' },
	{ value: 'center', label: 'Center' },
	{ value: 'bottom', label: 'Bottom' },
]

export function QuestionManager({
    questions,
    onUpdateQuestion,
    onDeleteQuestion,
    onAddQuestion,
    onFlashQuestion,
    onFlashAdHoc,
    onClose,
    visible
}: QuestionManagerProps) {
    const [adHocText, setAdHocText] = useState('');
    const [activeTab, setActiveTab] = useState<'adhoc' | 'saved'>('adhoc');
    
    // For editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    const handleAdHocSend = () => {
        if (!adHocText.trim()) return;
        onFlashAdHoc(adHocText, { duration: 10, position: 'center', fontSize: 'lg' });
        setAdHocText('');
        onClose(); // Optional: close after sending
    };

    const handleAdd = () => {
        if (!adHocText.trim()) return;
        onAddQuestion(adHocText);
        setAdHocText('');
        setActiveTab('saved');
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <TouchableOpacity className="absolute inset-0" onPress={onClose} />
                
                <View className="bg-gray-900 h-[80%] rounded-t-3xl border-t border-gray-700 w-full overflow-hidden shadow-2xl">
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-800 bg-gray-900">
                        <View className="flex-row items-center">
                            <Zap size={20} color="#facc15" className="mr-2" />
                            <Text className="text-white font-bold text-lg">Flash Messages</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-1 bg-gray-800 rounded-full">
                            <X size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View className="flex-row border-b border-gray-800">
                        <TouchableOpacity 
                            onPress={() => setActiveTab('adhoc')}
                            className={`flex-1 py-3 items-center ${activeTab === 'adhoc' ? 'border-b-2 border-yellow-500' : ''}`}
                        >
                            <Text className={`${activeTab === 'adhoc' ? 'text-yellow-500 font-bold' : 'text-gray-400'}`}>Quick Message</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => setActiveTab('saved')}
                            className={`flex-1 py-3 items-center ${activeTab === 'saved' ? 'border-b-2 border-yellow-500' : ''}`}
                        >
                             <Text className={`${activeTab === 'saved' ? 'text-yellow-500 font-bold' : 'text-gray-400'}`}>Saved ({questions.length})</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-1 p-4">
                        {activeTab === 'adhoc' ? (
                            <View className="flex-1">
                                <Text className="text-gray-400 mb-2">Type a message to flash to all participants immediately.</Text>
                                <TextInput
                                    className="bg-gray-800 text-white p-4 rounded-xl mb-4 text-lg border border-gray-700"
                                    placeholder="Enter message..."
                                    placeholderTextColor="#6b7280"
                                    multiline
                                    numberOfLines={4}
                                    style={{ textAlignVertical: 'top' }}
                                    value={adHocText}
                                    onChangeText={setAdHocText}
                                />
                                
                                <View className="flex-row gap-3">
                                    <TouchableOpacity 
                                        onPress={handleAdd}
                                        className="flex-1 bg-gray-800 py-3 rounded-xl border border-gray-700 items-center justify-center flex-row"
                                    >
                                        <Plus size={18} color="white" className="mr-2" />
                                        <Text className="text-white font-medium">Save to List</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        onPress={handleAdHocSend}
                                        className="flex-1 bg-yellow-600 py-3 rounded-xl items-center justify-center flex-row shadow-lg shadow-yellow-900/40"
                                    >
                                        <Zap size={18} color="white" className="mr-2" />
                                        <Text className="text-white font-bold">Flash Now</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <ScrollView className="flex-1">
                                {questions.length === 0 ? (
                                    <View className="items-center justify-center py-10">
                                        <Text className="text-gray-500 italic">No saved messages.</Text>
                                    </View>
                                ) : (
                                    questions.map((q, index) => (
                                        <View key={q.id} className="bg-gray-800 mb-3 rounded-xl border border-gray-700 p-3">
                                            {editingId === q.id ? (
                                                <View>
                                                    <TextInput 
                                                        value={editText}
                                                        onChangeText={setEditText}
                                                        className="bg-gray-900 text-white p-2 rounded mb-2 border border-gray-600"
                                                    />
                                                    <View className="flex-row justify-end space-x-2">
                                                        <TouchableOpacity onPress={() => setEditingId(null)} className="p-2">
                                                            <X size={18} color="gray" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity 
                                                            onPress={() => {
                                                                onUpdateQuestion(q.id, { text: editText });
                                                                setEditingId(null);
                                                            }} 
                                                            className="p-2"
                                                        >
                                                            <Check size={18} color="#22c55e" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ) : (
                                                <View className="flex-row items-center justify-between">
                                                    <View className="flex-1 mr-3">
                                                        <View className="flex-row items-center mb-1">
                                                            <Text className="text-xs text-gray-500 font-mono mr-2">#{index + 1}</Text>
                                                        </View>
                                                        <Text className="text-white text-base" numberOfLines={2}>{q.text}</Text>
                                                    </View>
                                                    
                                                    <View className="flex-row items-center space-x-1">
                                                        <TouchableOpacity 
                                                            onPress={() => {
                                                                setEditingId(q.id);
                                                                setEditText(q.text);
                                                            }}
                                                            className="p-2 bg-gray-700/50 rounded-lg"
                                                        >
                                                            <Edit2 size={16} color="white" />
                                                        </TouchableOpacity>
                                                        
                                                        <TouchableOpacity 
                                                            onPress={() => onFlashQuestion(q.id)}
                                                            className="p-2 bg-yellow-600/20 border border-yellow-600/50 rounded-lg ml-1"
                                                        >
                                                            <Play size={16} color="#facc15" fill="#facc15" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}
