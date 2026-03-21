import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { MessageList } from './MessageList';
import { MessageInput, ChatRecipient, MessageAudienceType } from './MessageInput';

// Mock types
type Message = { 
	id: string
	senderId: string
	audienceType?: MessageAudienceType
	targetUserId?: string | null
	content: string
	createdAt: string
	sender?: {
		id: string
		name: string
		avatar?: string | null
	}
	targetUser?: {
		id: string
		name: string
		avatar?: string | null
	} | null
}

interface ChatWidgetProps {
	channelId: string | null | undefined
	className?: string
	chatDisabled?: boolean
	recipients?: ChatRecipient[]
	hostUserId?: string | null
	currentUserDbId?: string | null
	allowedAudiences?: Partial<Record<MessageAudienceType, boolean>>
}

export function ChatWidget({
	channelId,
	chatDisabled = false,
	recipients = [],
	hostUserId,
	currentUserDbId,
	allowedAudiences,
}: ChatWidgetProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isConnecting, setIsConnecting] = useState(false);

    // Mock initial messages
    useEffect(() => {
        if (channelId) {
            setIsConnecting(true);
            setTimeout(() => {
                setMessages([
                    {
                        id: '1',
                        senderId: 'system',
                        content: 'Welcome to the chat!',
                        createdAt: new Date().toISOString(),
                        sender: { id: 'system', name: 'System' }
                    }
                ]);
                setIsConnecting(false);
            }, 1000);
        }
    }, [channelId]);

    const handleSend = (text: string, audienceType: MessageAudienceType, targetUserId?: string) => {
        // Optimistic update
        const newMessage: Message = {
            id: Date.now().toString(),
            senderId: currentUserDbId || 'me',
            content: text,
            createdAt: new Date().toISOString(),
            audienceType,
            targetUserId,
            sender: {
                id: currentUserDbId || 'me',
                name: 'You',
                avatar: null
            },
            targetUser: targetUserId ? recipients.find(r => r.id === targetUserId) : null
        };
        
        setMessages(prev => [...prev, newMessage]);
    };

    if (isConnecting) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-900">
                <ActivityIndicator color="white" />
                <Text className="text-white mt-2">Connecting to chat...</Text>
            </View>
        );
    }

	return (
        <View className="flex-1 bg-gray-900 flex-col">
            <MessageList 
                messages={messages} 
                currentUserId={currentUserDbId || 'me'}
                hostUserId={hostUserId}
            />
            <MessageInput 
                onSend={handleSend}
                disabled={chatDisabled}
                recipients={recipients}
                hostUserId={hostUserId}
                currentUserDbId={currentUserDbId}
                allowedAudiences={allowedAudiences}
            />
        </View>
	);
}
