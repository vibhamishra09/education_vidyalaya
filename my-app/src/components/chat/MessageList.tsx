'use client'
import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Message = { 
	id: string
	senderId: string | null
	audienceType?: 'EVERYONE' | 'HOST' | 'USER'
	targetUserId?: string | null
	content: string
	createdAt: string
	guestEmail?: string | null
	guestSenderId?: string | null
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
	viewerIsGuest = false,
	viewerGuestEmail,
}: {
	messages: Message[]
	currentUserId?: string
	hostUserId?: string | null
	viewerIsGuest?: boolean
	viewerGuestEmail?: string
}) {
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
		if (Number.isNaN(date.getTime())) return '—'
		const now = new Date()
		const isSameDay = now.toDateString() === date.toDateString()

		if (isSameDay) {
			return date.toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
			})
		}

		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	return (
		<div ref={containerRef} className="h-full overflow-y-auto p-3 md:p-4 space-y-3 custom-scrollbar">
			{messages.length === 0 ? (
				<div className="text-center py-12 md:py-16">
					<p className="text-sm text-white/40 font-medium">No messages yet. Start the conversation!</p>
				</div>
			) : (
				messages.map((m) => {
					const fromGuestSelf =
						viewerIsGuest &&
						!!viewerGuestEmail &&
						!!m.guestEmail &&
						m.guestEmail === viewerGuestEmail
					const senderName =
						m.sender?.name ||
						(m.guestEmail ? m.guestEmail.split('@')[0] || 'Guest' : 'Guest')
					const senderAvatar = m.sender?.avatar
					const initials = (senderName.charAt(0) || '?').toUpperCase()
					const audienceType = m.audienceType || 'EVERYONE'
					const isHostMessage =
						!!hostUserId &&
						(m.senderId === hostUserId ||
							(typeof m.sender?.id === 'string' && m.sender.id === hostUserId))
					const targetLabel =
						audienceType === 'EVERYONE'
							? 'Everyone'
							: audienceType === 'HOST'
								? 'Host'
								: m.targetUser?.name || 'User'
					const isPrivateToCurrentUser =
						audienceType !== 'EVERYONE' &&
						(currentUserId === m.senderId ||
							currentUserId === m.targetUserId ||
							fromGuestSelf)

					return (
						<div key={m.id} className="flex gap-3 hover:bg-white/5 rounded-lg p-2 transition-colors group">
							<Avatar className="h-8 w-8 flex-shrink-0 border border-white/10 shadow-sm">
								<AvatarImage src={senderAvatar || undefined} alt={senderName} />
								<AvatarFallback className="text-xs bg-gradient-to-br from-primary to-secondary text-white font-semibold">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 min-w-0">
								<div className="flex items-baseline gap-2 mb-1">
									<span className="font-semibold text-sm text-white/95 truncate">
										{senderName}
										{isHostMessage ? ' (Host)' : ''}
									</span>
									<span className="text-[10px] text-white/50 flex-shrink-0">{formatTime(m.createdAt)}</span>
								</div>
								<div className="flex items-center gap-2 mb-1">
									<span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
										To {targetLabel}
									</span>
									{isPrivateToCurrentUser && (
										<span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">
											Private
										</span>
									)}
								</div>
								<div className="text-sm text-white/85 break-words leading-relaxed">
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


