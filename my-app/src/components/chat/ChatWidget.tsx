'use client'
import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUser, useAuth } from '@clerk/nextjs'
import apiClient from '@/lib/api-client'
import { MessageList } from '@/components/chat/MessageList'
import { ChatRecipient, MessageAudienceType, MessageInput } from '@/components/chat/MessageInput'

type Message = { 
	id: string
	senderId: string
	audienceType?: MessageAudienceType
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

function normalizeChatMessage(raw: unknown): Message {
	const m =
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
	const createdRaw = m.createdAt
	let createdAt: string
	if (createdRaw instanceof Date) {
		createdAt = createdRaw.toISOString()
	} else if (typeof createdRaw === 'number' && Number.isFinite(createdRaw)) {
		const d = new Date(createdRaw)
		createdAt = Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
	} else if (typeof createdRaw === 'string' && createdRaw.length > 0) {
		const d = new Date(createdRaw)
		createdAt = Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
	} else {
		createdAt = new Date(0).toISOString()
	}

	const guestEmail =
		typeof m.guestEmail === 'string' && m.guestEmail.length > 0 ? m.guestEmail : null
	const guestSenderId =
		typeof m.guestSenderId === 'string' && m.guestSenderId.length > 0
			? m.guestSenderId
			: null

	const baseSender = m.sender as Record<string, unknown> | null | undefined
	let sender: Message['sender']
	if (baseSender && typeof baseSender.name === 'string' && baseSender.name.length > 0) {
		sender = {
			id: String(baseSender.id ?? guestSenderId ?? 'unknown'),
			name: baseSender.name,
			avatar: (baseSender.avatar as string | null | undefined) ?? null,
		}
	} else if (guestEmail) {
		const local = guestEmail.split('@')[0] || 'Guest'
		sender = {
			id: guestSenderId || 'guest',
			name: local,
			avatar: null,
		}
	} else {
		sender = {
			id: guestSenderId || (typeof m.senderId === 'string' ? m.senderId : '') || 'guest',
			name: 'Guest',
			avatar: null,
		}
	}

	const senderId =
		typeof m.senderId === 'string' && m.senderId.length > 0
			? m.senderId
			: guestSenderId || ''

	return {
		id: String(m.id ?? ''),
		senderId,
		audienceType: m.audienceType as Message['audienceType'],
		targetUserId:
			typeof m.targetUserId === 'string' || m.targetUserId === null
				? (m.targetUserId as string | null)
				: null,
		content: typeof m.content === 'string' ? m.content : '',
		createdAt,
		guestEmail,
		guestSenderId,
		sender,
		targetUser: m.targetUser as Message['targetUser'],
	}
}

// Keep chat history in-memory per channel so closing/reopening the panel
// does not wipe the current message list.
const channelMessageCache = new Map<string, Message[]>()

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
	if (incoming.length === 0) return existing

	const byId = new Map<string, Message>()
	for (const message of existing) {
		byId.set(message.id, message)
	}
	for (const message of incoming) {
		byId.set(message.id, message)
	}

	return Array.from(byId.values()).sort((a, b) => {
		const ta = new Date(a.createdAt).getTime()
		const tb = new Date(b.createdAt).getTime()
		const na = Number.isNaN(ta) ? 0 : ta
		const nb = Number.isNaN(tb) ? 0 : tb
		return na - nb
	})
}

interface ChatWidgetProps {
	channelId: string | null | undefined
	className?: string
	chatDisabled?: boolean
	recipients?: ChatRecipient[]
	hostUserId?: string | null
	currentUserDbId?: string | null
	allowedAudiences?: Partial<Record<MessageAudienceType, boolean>>
	guestToken?: string | null
	guestEmail?: string | null // Guest email for message history matching
}

export function ChatWidget({
	channelId,
	className = '',
	chatDisabled = false,
	recipients = [],
	hostUserId,
	currentUserDbId,
	allowedAudiences,
	guestToken,
	guestEmail,
}: ChatWidgetProps) {
	const isGuestMode = !!guestToken
	const { user, isLoaded } = useUser()
	const { getToken } = useAuth()
	const userId = user?.id
	const [messages, setMessages] = useState<Message[]>(() => {
		if (!channelId) return []
		const cached = channelMessageCache.get(channelId) || []
		return cached.map(normalizeChatMessage)
	})
	const [viewerGuestEmail, setViewerGuestEmail] = useState<string | null>(
		() => guestEmail ?? null,
	)
	const socketRef = useRef<Socket | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isConnecting, setIsConnecting] = useState(false)

	useEffect(() => {
		if (guestEmail) setViewerGuestEmail(guestEmail)
	}, [guestEmail])

	// Debug: Log chatDisabled prop changes
	useEffect(() => {
		console.log('[ChatWidget] chatDisabled prop changed to:', chatDisabled)
	}, [chatDisabled])

	useEffect(() => {
		if (!channelId) {
			setMessages([])
			setError(null)
			setViewerGuestEmail(guestEmail ?? null)
			return
		}
		const activeChannelId = channelId

		const cachedMessages = channelMessageCache.get(activeChannelId)
		if (cachedMessages) {
			setMessages(cachedMessages.map(normalizeChatMessage))
		}

		let mounted = true
		async function loadHistory() {
			try {
				console.log('Loading chat history for channel:', channelId)
				const params: Record<string, string | number> = { limit: 200 }
				if (isGuestMode) {
					params.includeMeta = '1'
					if (guestEmail) {
						params.guestEmail = guestEmail
					} else if (guestToken) {
						params.guestAccessToken = guestToken
					}
				}
				const res = await apiClient.get(`/api/chat/channels/${activeChannelId}/messages`, {
					params,
					skipClerkAuth: isGuestMode,
				})
				if (!mounted) return

				let rawList: unknown[] = []
				if (
					isGuestMode &&
					res.data &&
					typeof res.data === 'object' &&
					!Array.isArray(res.data)
				) {
					const body = res.data as {
						messages?: unknown[]
						meta?: { viewerGuestEmail?: string }
					}
					rawList = Array.isArray(body.messages) ? body.messages : []
					if (body.meta?.viewerGuestEmail) {
						setViewerGuestEmail(body.meta.viewerGuestEmail)
					}
				} else {
					rawList = Array.isArray(res.data) ? res.data : []
				}

				const historyMessages = rawList.map(normalizeChatMessage)
				console.log('Loaded messages:', historyMessages.length, 'messages')
				setMessages((prev) => {
					const merged = mergeMessages(prev, historyMessages)
					channelMessageCache.set(activeChannelId, merged)
					return merged
				})
			} catch (e: unknown) {
				if (!mounted) return
				const errorMessage = e instanceof Error ? e.message : 'Failed to load messages'
				console.error('Failed to load chat history:', errorMessage)
				setError(errorMessage)
			}
		}
		loadHistory()
		return () => {
			mounted = false
		}
	}, [channelId, guestToken, isGuestMode, guestEmail])

	useEffect(() => {
		if (!channelId || !isLoaded || (!userId && !isGuestMode)) {
			if (socketRef.current) {
				socketRef.current.disconnect()
				socketRef.current = null
			}
			return
		}
		const activeChannelId = channelId

		let socketInstance: Socket | null = null
		let isMounted = true

		async function connectSocket() {
			try {
				setIsConnecting(true)
				setError(null)

				// For guests use their DB access token; for regular users get Clerk token
				const token = isGuestMode ? guestToken : await getToken()
				if (!token) {
					if (isMounted) {
						setError('Authentication required')
						setIsConnecting(false)
					}
					return
				}
				
				// Don't connect if component unmounted while waiting for token
				if (!isMounted) return

				// Use NEXT_PUBLIC_CHAT_WS_URL or fallback to API URL without /api
				const url = process.env.NEXT_PUBLIC_CHAT_WS_URL || 
					process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
					'http://localhost:3001'
				
				console.log('🔌 [Chat] Connecting to WebSocket:', url, 'for channel:', activeChannelId)
				
				const s = io(url, { 
					transports: ['websocket', 'polling'],
					auth: { token },
					reconnection: true,
					reconnectionAttempts: 5,
					reconnectionDelay: 1000,
					timeout: 10000,
				})
				
				socketInstance = s
				socketRef.current = s
				
				let joinedForCurrentSocket = false
				let joinFallbackTimer: ReturnType<typeof setTimeout> | null = null
				const joinChannel = () => {
					if (joinedForCurrentSocket) return
					joinedForCurrentSocket = true
					console.log('✅ [Chat] Joining channel:', activeChannelId)
					s.emit('join:channel', { channelId: activeChannelId })
					if (joinFallbackTimer) {
						clearTimeout(joinFallbackTimer)
						joinFallbackTimer = null
					}
				}

				s.on('connect', () => {
					console.log('✅ [Chat] Socket connected:', activeChannelId)
					joinedForCurrentSocket = false

					// Wait for explicit server auth signal to avoid join/auth race.
					joinFallbackTimer = setTimeout(() => {
						console.warn('⚠️ [Chat] Auth handshake timeout, joining with fallback')
						joinChannel()
					}, 1000)
				})

				s.on('authenticated', () => {
					console.log('✅ [Chat] Socket authenticated')
					joinChannel()
				})
				
				s.on('joined:channel', () => {
					console.log('✅ [Chat] Successfully joined channel:', activeChannelId)
					if (isMounted) {
						setIsConnecting(false)
						setError(null) // Clear any previous errors
					}
				})
				
			s.on('message:new', (msg: unknown) => {
				const normalized = normalizeChatMessage(msg)
				console.log('📩 [Chat] Received new message:', normalized.id)
				setMessages((prev) => {
					if (prev.some((m) => m.id === normalized.id)) {
						console.warn('⚠️ [Chat] Duplicate message detected, ignoring:', normalized.id)
						return prev
					}
					const next = [...prev, normalized]
					channelMessageCache.set(activeChannelId, next)
					return next
				})
			})
		
			// Track reconnection attempts to avoid showing error on normal reconnects
			let reconnectAttempts = 0
			
			s.on('connect_error', (err: Error) => {
					reconnectAttempts++
					console.warn(`🔄 [Chat] Connection attempt ${reconnectAttempts} failed:`, err.message)
					
					// Only show error after multiple failed attempts (persistent failure)
					if (isMounted && reconnectAttempts >= 3) {
						if (
							isGuestMode &&
							(err.message.includes('auth') ||
								err.message.includes('401') ||
								err.message.includes('unauthorized'))
						) {
							setError(
								'Chat connection failed. Try refreshing the page or reopening your guest link.',
							)
							setIsConnecting(false)
							return
						}
						// Check for auth errors (fatal)
						if (err.message.includes('auth') || err.message.includes('401') || err.message.includes('unauthorized')) {
							setError('Authentication failed')
						} else {
							setError('Unable to connect to chat')
						}
						setIsConnecting(false)
					}
				})
				
				s.on('error', (data: unknown) => {
					// Only process if data is an object with meaningful error information
					if (!data || typeof data !== 'object') {
						return
					}
					
					const errorData = data as { code?: string; message?: string; error?: string }
					const hasErrorInfo = !!(errorData.code || errorData.message || errorData.error)
					
					// Only log if there's actual meaningful error data (skip empty objects)
					if (hasErrorInfo) {
						console.error('🚨 [Chat] Socket error:', data)
					}
					
					if (isMounted) {
						// Handle specific error codes
						if (errorData.code === 'CHAT_DISABLED') {
							// Don't show error - chatDisabled prop will handle the UI
							console.log('ℹ️ [Chat] Chat is disabled by host')
						} else if (errorData.code === 'CHAT_SCOPE_RESTRICTED') {
							setError('Host has restricted this chat target for you')
						} else if (errorData.code === 'RECONNECTING') {
							// Normal reconnection, don't show error
							console.log('🔄 [Chat] Reconnecting...')
						} else if (hasErrorInfo && (errorData.message || errorData.error)) {
							setError(errorData.message || errorData.error || 'Connection error')
						}
					}
				})
				
				s.on('disconnect', (reason) => {
					console.log('🔌 [Chat] Socket disconnected:', reason)
					// Only show error for server-initiated disconnects, not for normal reconnects
					if (isMounted && reason === 'io server disconnect') {
						setError('Disconnected from chat server')
					}
					// Clear error and reset attempts on client-side disconnect (e.g., page refresh)
					if (reason === 'io client disconnect') {
						reconnectAttempts = 0
					}
					joinedForCurrentSocket = false
					if (joinFallbackTimer) {
						clearTimeout(joinFallbackTimer)
						joinFallbackTimer = null
					}
				})
				
				// Clear error on successful reconnect
				s.io.on('reconnect', () => {
					console.log('✅ [Chat] Reconnected successfully')
					reconnectAttempts = 0
					if (isMounted) {
						setError(null)
					}
				})
			} catch (err: unknown) {
				console.error('❌ [Chat] Failed to connect socket:', err)
				if (isMounted) {
					const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
					setError(errorMessage)
					setIsConnecting(false)
				}
			}
		}
		
		connectSocket()
		
		return () => {
			isMounted = false
			if (socketInstance) {
				socketInstance.disconnect()
				socketInstance = null
			}
			socketRef.current = null
		}
	}, [channelId, isLoaded, userId, getToken, guestToken, isGuestMode])

	useEffect(() => {
		if (!channelId) return
		const activeChannelId = channelId
		channelMessageCache.set(activeChannelId, messages)
	}, [channelId, messages])

	if (!channelId) {
		return (
			<div className={`p-4 border rounded ${className}`}>
				<p className="text-muted-foreground text-sm">Chat not available yet</p>
			</div>
		)
	}

	if (!isLoaded) {
		return (
			<div className={`p-4 border rounded ${className}`}>
				<p className="text-muted-foreground text-sm">Loading chat...</p>
			</div>
		)
	}

	if (!user && !isGuestMode) {
		return (
			<div className={`p-4 border rounded ${className}`}>
				<p className="text-muted-foreground text-sm">Please sign in to chat</p>
			</div>
		)
	}

	const onSend = async (
		text: string,
		audienceType: MessageAudienceType,
		targetUserId?: string,
	) => {
		if (!socketRef.current || !socketRef.current.connected) {
			setError('Not connected to chat server')
			return
		}
		socketRef.current.emit('message:send', {
			channelId,
			content: text,
			audienceType,
			targetUserId,
		})
	}

	return (
		<div className={`flex flex-col ${className}`}>
			{/* Chat Disabled Banner */}
			{chatDisabled && (
				<div className="p-3 md:p-4 bg-orange-900/30 border border-orange-500/40 rounded-lg text-orange-200 text-sm mx-2 md:mx-3 mt-2 md:mt-3">
					<div className="flex items-center gap-2">
						<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<div>
							<p className="font-semibold">Chat Disabled</p>
							<p className="text-xs opacity-90 mt-0.5">The host has disabled chat for this session</p>
						</div>
					</div>
				</div>
			)}
			{/* Connection Error */}
			{error && !chatDisabled && (
				<div className="p-2 md:p-3 bg-red-900/50 border border-red-500/40 rounded-lg text-red-200 text-xs md:text-sm mx-2 md:mx-3 mt-2 md:mt-3">
					<p className="font-semibold mb-0.5 md:mb-1">Connection Error</p>
					<p className="text-xs opacity-90">{error}</p>
				</div>
			)}
			{isConnecting && (
				<div className="p-2 md:p-3 bg-blue-900/50 border border-blue-500/40 rounded-lg text-blue-200 text-xs md:text-sm mx-2 md:mx-3 mt-2 md:mt-3">
					Connecting to chat...
				</div>
			)}
			{/* Messages area - scrollable */}
			<div className="flex-1 overflow-y-auto min-h-0">
				<MessageList
					messages={messages}
					currentUserId={currentUserDbId || undefined}
					hostUserId={hostUserId}
					viewerIsGuest={isGuestMode}
					viewerGuestEmail={viewerGuestEmail ?? undefined}
				/>
			</div>
			{/* Input area - always at bottom */}
			<div className="border-t border-white/10 flex-shrink-0">
				<MessageInput
					onSend={onSend}
					disabled={chatDisabled}
					recipients={recipients}
					hostUserId={hostUserId}
					currentUserDbId={currentUserDbId}
					allowedAudiences={allowedAudiences}
				/>
			</div>
		</div>
	)
}

