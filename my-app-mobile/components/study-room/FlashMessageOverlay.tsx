import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';

export interface FlashQuestion {
  id: string;
  text: string;
  duration?: number;      // seconds (0 = manual dismiss)
  position?: 'top' | 'center' | 'bottom';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  bgColor?: string;
}

export interface ActiveFlashMessage extends FlashQuestion {
  hostId: string;
}

interface FlashMessageOverlayProps {
	message: ActiveFlashMessage
	/** Called when the participant closes the overlay locally (participant-only dismiss) */
	onDismiss: () => void
	/** Whether the current user is a host (hosts get a "Dismiss for all" button) */
	isHost?: boolean
	/** Called by host to dismiss for everyone */
	onDismissForAll?: () => void
}

const { width, height } = Dimensions.get('window');

const FONT_SIZE_MAP: Record<string, number> = {
	sm: 16,
	md: 20,
	lg: 24,
	xl: 30,
};

export function FlashMessageOverlay({
	message,
	onDismiss,
	isHost = false,
	onDismissForAll,
}: FlashMessageOverlayProps) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// If duration is set, auto-dismiss locally after duration
	useEffect(() => {
		if (message.duration && message.duration > 0) {
			timerRef.current = setTimeout(onDismiss, message.duration * 1000)
		}
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		}
	}, [message.id, message.duration, onDismiss])

	const fontSize = FONT_SIZE_MAP[message.fontSize ?? 'lg'] ?? FONT_SIZE_MAP.lg
    const bgColor = message.bgColor || 'rgba(0,0,0,0.85)';

    // Position logic
    let justifyStyle: 'flex-start' | 'center' | 'flex-end' = 'center';
    let topOffset = 0;
    let bottomOffset = 0;

    if (message.position === 'top') {
        justifyStyle = 'flex-start';
        topOffset = 100; // Below header
    } else if (message.position === 'bottom') {
        justifyStyle = 'flex-end';
        bottomOffset = 100; // Above footer controls
    }

	return (
        <View 
            className="absolute inset-x-0 inset-y-0 z-50 pointer-events-none items-center"
            style={{ 
                justifyContent: justifyStyle, 
                paddingTop: topOffset, 
                paddingBottom: bottomOffset 
            }}
            pointerEvents="box-none" // Allow touches to pass through empty space
        >
            <View 
                style={{ backgroundColor: bgColor }}
                className="mx-4 p-6 rounded-2xl shadow-lg border border-white/10 max-w-lg w-[90%] relative"
            >
                {/* Close Button */}
                <TouchableOpacity 
                    className="absolute top-2 right-2 p-2 bg-white/10 rounded-full"
                    onPress={onDismiss}
                >
                    <X size={20} color="white" />
                </TouchableOpacity>

                {/* Message Text */}
                <Text 
                    style={{ fontSize, lineHeight: fontSize * 1.4 }}
                    className="text-white font-bold text-center mb-4"
                >
                    {message.text}
                </Text>

                {/* Host Controls */}
                {isHost && onDismissForAll && (
                    <TouchableOpacity 
                        className="mt-4 bg-red-600 py-2 px-4 rounded-lg self-center"
                        onPress={onDismissForAll}
                    >
                        <Text className="text-white font-medium text-sm">Dismiss for Everyone</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
	);
}
