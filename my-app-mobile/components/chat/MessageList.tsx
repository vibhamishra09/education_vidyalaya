import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';

type Message = { 
	id: string
	senderId: string
	audienceType?: 'EVERYONE' | 'HOST' | 'USER'
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

export function MessageList({
	messages,
	currentUserId,
	hostUserId,
}: {
	messages: Message[]
	currentUserId?: string
	hostUserId?: string | null
}) {
	const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

	const formatTime = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMins = Math.floor(diffMs / 60000)
		
		if (diffMins < 1) return 'Just now'
		if (diffMins < 60) return `${diffMins}m ago`
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
		
		return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
	}

    if (messages.length === 0) {
        return (
            <View className="flex-1 justify-center items-center p-8 opacity-50">
                <Text className="text-white text-center">No messages yet. Start the conversation!</Text>
            </View>
        );
    }

	return (
		<ScrollView 
            ref={scrollViewRef}
            className="flex-1 px-4 py-2"
            contentContainerStyle={{ paddingBottom: 20 }}
        >
            {messages.map((m) => {
                const senderName = m.sender?.name || 'Unknown User'
                const senderAvatar = m.sender?.avatar
                const audienceType = m.audienceType || 'EVERYONE'
                const targetLabel =
                    audienceType === 'EVERYONE'
                        ? 'Everyone'
                        : audienceType === 'HOST'
                            ? 'Host'
                            : m.targetUser?.name || 'User'
                const isPrivateToCurrentUser =
                    audienceType !== 'EVERYONE' &&
                    (currentUserId === m.senderId || currentUserId === m.targetUserId)

                return (
                    <View key={m.id} className="mb-4 flex-row">
                        {/* Avatar */}
                        <View className="mr-3 mt-1">
                             {senderAvatar ? (
                                <Image 
                                    source={{ uri: senderAvatar }} 
                                    className="w-8 h-8 rounded-full bg-slate-700" 
                                />
                             ) : (
                                <View className="w-8 h-8 rounded-full bg-slate-700 items-center justify-center">
                                    <Text className="text-white font-bold text-xs">{senderName[0]}</Text>
                                </View>
                             )}
                        </View>
                        
                        {/* Message Content */}
                        <View className="flex-1">
                            <View className="flex-row items-baseline mb-1">
                                <Text className="text-white font-bold text-sm mr-2">
                                    {senderName}
                                    {hostUserId && m.senderId === hostUserId ? ' (Host)' : ''}
                                </Text>
                                <Text className="text-gray-500 text-[10px]">{formatTime(m.createdAt)}</Text>
                            </View>
                            
                            <View className="flex-row items-center mb-1 flex-wrap gap-1">
                                <View className="bg-white/10 px-2 py-0.5 rounded-full self-start">
                                    <Text className="text-white/70 text-[10px]">To {targetLabel}</Text>
                                </View>
                                {isPrivateToCurrentUser && (
                                     <View className="bg-sky-500/20 px-2 py-0.5 rounded-full self-start">
                                        <Text className="text-sky-300 text-[10px]">Private</Text>
                                    </View>
                                )}
                            </View>

                            <Text className="text-white/90 text-sm leading-5">{m.content}</Text>
                        </View>
                    </View>
                );
            })}
		</ScrollView>
	);
}
