'use client'
import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Message = { 
	id: string
	senderId: string
	content: string
	createdAt: string
	sender?: {
		id: string
		name: string
		avatar?: string | null
	}
}

export function MessageList({ messages }: { messages: Message[] }) {
	const bottomRef = useRef<HTMLDivElement | null>(null)
	const containerRef = useRef<HTMLDivElement | null>(null)
	
	useEffect(() => {
		// Scroll to bottom within the chat container only (not the page)
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight
		}
	}, [messages])

	const formatTime = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMins = Math.floor(diffMs / 60000)
		
		if (diffMins < 1) return 'Just now'
		if (diffMins < 60) return `${diffMins}m ago`
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
		
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
	}

	return (
		<div ref={containerRef} className="h-full overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3">
			{messages.length === 0 ? (
				<div className="text-center py-8 md:py-12">
					<p className="text-xs md:text-sm text-white/50">No messages yet. Start the conversation!</p>
				</div>
			) : (
				messages.map((m) => {
					const senderName = m.sender?.name || 'Unknown User'
					const senderAvatar = m.sender?.avatar
					const initials = senderName.charAt(0).toUpperCase()

					return (
						<div key={m.id} className="flex gap-2 md:gap-3 hover:bg-white/5 rounded-lg p-1.5 md:p-2 -mx-1 md:-mx-2 transition-colors">
							<Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 border border-white/20">
								<AvatarImage src={senderAvatar || undefined} alt={senderName} />
								<AvatarFallback className="text-[10px] md:text-xs bg-gradient-to-br from-primary to-secondary text-white">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 min-w-0">
								<div className="flex items-baseline gap-1.5 md:gap-2 mb-0.5 md:mb-1">
								<span className="font-semibold text-xs md:text-sm text-white truncate">{senderName}</span>
								<span className="text-[10px] md:text-xs text-white/60 flex-shrink-0">{formatTime(m.createdAt)}</span>
							</div>
							<div className="text-xs md:text-sm text-white/90 break-words leading-relaxed">
									{m.content}
								</div>
							</div>
						</div>
					)
				})
			)}
			<div ref={bottomRef} />
		</div>
	)
}


