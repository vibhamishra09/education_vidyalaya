import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Modal, FlatList } from 'react-native';
import { Send, ChevronDown, Check } from 'lucide-react-native';

export type MessageAudienceType = 'EVERYONE' | 'HOST' | 'USER'

export interface ChatRecipient {
	id: string
	name: string
	avatar?: string | null
}

export function MessageInput({
	onSend,
	disabled = false,
	recipients = [],
	hostUserId,
	currentUserDbId,
	allowedAudiences,
}: {
	onSend: (text: string, audienceType: MessageAudienceType, targetUserId?: string) => void
	disabled?: boolean
	recipients?: ChatRecipient[]
	hostUserId?: string | null
	currentUserDbId?: string | null
	allowedAudiences?: Partial<Record<MessageAudienceType, boolean>>
}) {
	const [text, setText] = useState('')
	const [audienceType, setAudienceType] = useState<MessageAudienceType>('EVERYONE')
	const [targetUserId, setTargetUserId] = useState('')
    const [showAudienceSelector, setShowAudienceSelector] = useState(false);

    // Filter recipients similar to web
    const availableRecipients = recipients.filter(
		(recipient) => recipient.id !== currentUserDbId && recipient.id !== hostUserId,
	)
    const canUseSpecificUser = availableRecipients.length > 0;
    
    // Determine loop/options for audiece
    const options = [
        { type: 'EVERYONE', label: 'Everyone', allowed: allowedAudiences?.EVERYONE !== false },
        { type: 'HOST', label: 'Host Only', allowed: allowedAudiences?.HOST !== false && !!hostUserId },
        ...availableRecipients.map(r => ({ type: 'USER', label: r.name, id: r.id, allowed: allowedAudiences?.USER !== false }))
    ].filter(o => o.allowed);
    
    const currentOptionLabel = audienceType === 'USER' 
        ? availableRecipients.find(r => r.id === targetUserId)?.name || "Select User" 
        : (audienceType === 'HOST' ? 'Host Only' : 'Everyone');

	const handleSubmit = () => {
		if (disabled) return
		const t = text.trim()
		if (t) {
			onSend(t, audienceType, targetUserId)
			setText('')
		}
	}

	return (
		<View className="bg-gray-800 p-2 border-t border-gray-700">
             
             {/* Audience Selector Button */}
             <TouchableOpacity 
                className="bg-gray-700 rounded-lg px-3 py-2 mb-2 flex-row justify-between items-center"
                onPress={() => setShowAudienceSelector(true)}
                disabled={disabled}
            >
                <Text className="text-gray-300 text-xs">To: <Text className="text-white font-bold">{currentOptionLabel}</Text></Text>
                <ChevronDown size={14} color="#9ca3af" />
             </TouchableOpacity>

            {/* Input Row */}
			<View className="flex-row items-center gap-2">
			    <TextInput
                    className="flex-1 bg-gray-900 text-white rounded-full px-4 py-2 border border-gray-700 max-h-24"
                    placeholder="Type a message..."
                    placeholderTextColor="#6b7280"
                    multiline
                    value={text}
                    onChangeText={setText}
                    editable={!disabled}
                />
                <TouchableOpacity 
                    className={`p-3 rounded-full ${!text.trim() || disabled ? 'bg-gray-700' : 'bg-blue-600'}`}
                    disabled={!text.trim() || disabled}
                    onPress={handleSubmit}
                >
                    <Send size={18} color="white" />
                </TouchableOpacity>
			</View>

            {/* Audience Picker Modal */}
            <Modal
                transparent={true}
                visible={showAudienceSelector}
                animationType="fade"
                onRequestClose={() => setShowAudienceSelector(false)}
            >
                <TouchableOpacity 
                    className="flex-1 bg-black/50 justify-center items-center px-4"
                    activeOpacity={1}
                    onPress={() => setShowAudienceSelector(false)}
                >
                    <View className="bg-gray-800 w-full max-w-sm rounded-xl p-4 shadow-xl border border-gray-700">
                        <Text className="text-white font-bold text-lg mb-4">Send message to</Text>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.type + (item.id || '')}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    className="flex-row items-center py-3 border-b border-gray-700"
                                    onPress={() => {
                                        setAudienceType(item.type as MessageAudienceType);
                                        if (item.type === 'USER' && item.id) {
                                            setTargetUserId(item.id);
                                        } else {
                                            setTargetUserId('');
                                        }
                                        setShowAudienceSelector(false);
                                    }}
                                >
                                    <View className="flex-1">
                                        <Text className="text-white text-base">{item.label}</Text>
                                        {item.type === 'HOST' && <Text className="text-xs text-gray-500">Only the host will see this</Text>}
                                        {item.type === 'EVERYONE' && <Text className="text-xs text-gray-500">Visible to all participants</Text>}
                                    </View>
                                    {(audienceType === item.type && (item.type !== 'USER' || targetUserId === item.id)) && (
                                        <Check size={20} color="#3b82f6" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

		</View>
	)
}
