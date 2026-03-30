'use client'

import { useParams } from 'next/navigation'
import { ChatWidget } from '@/components/chat/ChatWidget'

/**
 * Standalone chat route — uses the same socket/reconnect logic as study rooms (ChatWidget).
 */
export default function ChannelPage() {
	const params = useParams<{ channelId: string }>()
	const channelId = params.channelId

	if (!channelId || Array.isArray(channelId)) {
		return (
			<div className="p-4 text-muted-foreground text-sm">No channel selected.</div>
		)
	}

	return (
		<div className="p-4 h-[80vh] flex flex-col gap-3">
			<ChatWidget channelId={channelId} className="flex-1 min-h-0" />
		</div>
	)
}
