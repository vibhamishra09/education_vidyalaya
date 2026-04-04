'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUser, useAuth } from '@clerk/nextjs'
import apiClient from '@/lib/api-client'
import { getSocketIoBaseUrl } from '@/lib/socket-base-url'
import { MessageList } from '@/components/chat/MessageList'
import {
	ChatRecipient,
	MessageAudienceType,
	MessageInput,
} from '@/components/chat/MessageInput'
import {
	type ChatMessageRow,
	collapseNearDuplicateChatRows,
	isOptimisticMessageId,
	mergeMessages,
	normalizeChatMessage,
	shouldRemoveOptimisticForEcho,
} from '@/components/chat/chat-message-utils'

type Message = ChatMessageRow

const channelMessageCache = new Map<string, Message[]>()

interface ChatWidgetProps {
	channelId: string | null | undefined
	className?: string
	chatDisabled?: boolean
	recipients?: ChatRecipient[]
	hostUserId?: string | null
	currentUserDbId?: string | null
	allowedAudiences?: Partial<Record<MessageAudienceType, boolean>>
	guestToken?: string | null
	guestEmail?: string | null
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
	const { user, isLoaded } = useUser()
	const { getToken } = useAuth()
	const userId = user?.id
	/** Guest link chat only when not signed in; stray ?guestAccessToken= would otherwise use an expired token and the server would disconnect the socket. */
	const isGuestMode = Boolean(guestToken && !userId)
	const channelIdRef = useRef<string | null | undefined>(channelId)
	channelIdRef.current = channelId
	const [viewerGuestEmail, setViewerGuestEmail] = useState<string | null>(
		() => guestEmail ?? null,
	)
	const viewerDbUserIdRef = useRef(currentUserDbId)
	const viewerGuestEmailRef = useRef<string | null>(guestEmail ?? null)
	useEffect(() => {
		viewerDbUserIdRef.current = currentUserDbId
	}, [currentUserDbId])

	/** Same as study-room page `/api/users/me` — fills ref when prop is still null; does not block send. */
	useEffect(() => {
		if (!channelId || !userId || isGuestMode || currentUserDbId) return
		let cancelled = false
		void (async () => {
			try {
				const token = await getToken()
				if (!token || cancelled) return
				const res = await apiClient.get<{ id?: string }>('/api/users/me', {
					headers: { Authorization: `Bearer ${token}` },
				})
				const id = typeof res.data?.id === 'string' ? res.data.id : null
				if (id && !cancelled) viewerDbUserIdRef.current = id
			} catch {
				/* ignore */
			}
		})()
		return () => {
			cancelled = true
		}
	}, [channelId, userId, isGuestMode, getToken, currentUserDbId])

	useEffect(() => {
		viewerGuestEmailRef.current = viewerGuestEmail ?? guestEmail ?? null
	}, [viewerGuestEmail, guestEmail])

	const [messages, setMessages] = useState<Message[]>(() => {
		if (!channelId) return []
		const cached = channelMessageCache.get(channelId) || []
		return cached.map(normalizeChatMessage)
	})
	const socketRef = useRef<Socket | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isConnecting, setIsConnecting] = useState(false)

	useEffect(() => {
		setViewerGuestEmail(guestEmail ?? null)
	}, [guestEmail])

	useEffect(() => {
		if (!channelId) {
			setMessages([])
			setError(null)
			setViewerGuestEmail(guestEmail ?? null)
			return
		}
		const activeChannelId = channelId

		// Never show another room’s messages while switching or loading.
		const cachedMessages = channelMessageCache.get(activeChannelId)
		setMessages(
			cachedMessages?.length
				? cachedMessages.map(normalizeChatMessage)
				: [],
		)

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
				if (!mounted || channelIdRef.current !== activeChannelId) return

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

				const historyMessages = collapseNearDuplicateChatRows(
					rawList.map(normalizeChatMessage),
				)
				// Replace server history for this channel only — do not merge with prior room’s list.
				if (channelIdRef.current !== activeChannelId) return
				setMessages(historyMessages)
				channelMessageCache.set(activeChannelId, historyMessages)
			} catch (e: unknown) {
				if (!mounted || channelIdRef.current !== activeChannelId) return
				const errorMessage = e instanceof Error ? e.message : 'Failed to load messages'
				console.error('Failed to load chat history:', errorMessage)
				setError(errorMessage)
			}
		}
		loadHistory()
		return () => {
			mounted = false
		}
	}, [channelId, isGuestMode, guestEmail, guestToken])

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

				let token = isGuestMode ? guestToken : await getToken()
				if (!token && !isGuestMode) {
					await new Promise((r) => setTimeout(r, 400))
					token = (await getToken()) ?? null
				}
				if (!token) {
					if (isMounted) {
						setError('Authentication required')
						setIsConnecting(false)
					}
					return
				}

				if (!isMounted) return

				const url = getSocketIoBaseUrl()

				console.log(
					'[Chat] Preparing WebSocket connection:',
					url,
					'for channel:',
					activeChannelId,
				)

				const s = io(url, {
					transports: ['websocket', 'polling'],
					auth: { token },
					reconnection: true,
					reconnectionAttempts: 12,
					reconnectionDelay: 800,
					reconnectionDelayMax: 15000,
					randomizationFactor: 0.5,
					timeout: 20000,
					autoConnect: false,
				})

				socketInstance = s
				socketRef.current = s

				let joinedForCurrentSocket = false
				/** Only for UI: avoid flashing errors on the first flaky attempts */
				let connectErrorCount = 0

				const joinChannel = () => {
					if (joinedForCurrentSocket) return
					joinedForCurrentSocket = true
					console.log('[Chat] Joining channel:', activeChannelId)
					s.emit('join:channel', { channelId: activeChannelId })
				}

				// Clerk JWTs expire; reconnect must send a fresh token or the server disconnects.
				s.io.on('reconnect_attempt', async () => {
					if (!isMounted || channelIdRef.current !== activeChannelId) return
					setIsConnecting(true)
					setError(null)
					try {
						const fresh = isGuestMode ? guestToken : await getToken({ skipCache: true })
						if (fresh) {
							s.auth = { token: fresh }
						}
					} catch {
						// keep previous auth; next attempt may succeed
					}
				})

				s.on('connect', () => {
					console.log('[Chat] Socket connected:', activeChannelId)
					connectErrorCount = 0
					joinedForCurrentSocket = false
					if (isMounted && channelIdRef.current === activeChannelId) {
						setError(null)
					}
				})

				s.on('chat:authenticated', () => {
					console.log('[Chat] Socket authenticated')
					if (isMounted) {
						setIsConnecting(false)
						setError(null)
					}
					joinChannel()
				})

				s.on('chat:joined', () => {
					console.log('[Chat] Successfully joined channel:', activeChannelId)
					if (isMounted) {
						setIsConnecting(false)
						setError(null)
					}
				})

				s.on('message:new', (msg: unknown) => {
					if (channelIdRef.current !== activeChannelId) return
					const normalized = normalizeChatMessage(msg)
					setMessages((prev) => {
						if (channelIdRef.current !== activeChannelId) return prev
						if (prev.some((m) => m.id === normalized.id)) {
							return prev
						}
						const viewerId = viewerDbUserIdRef.current ?? null
						let removedOneOptimistic = false
						const withoutMatchingOptimistic = prev.filter((m) => {
							if (!isOptimisticMessageId(m.id)) return true
							if (removedOneOptimistic) return true
							if (
								!shouldRemoveOptimisticForEcho(
									m,
									normalized,
									viewerId,
									viewerGuestEmailRef.current,
								)
							) {
								return true
							}
							removedOneOptimistic = true
							return false
						})
						const next = collapseNearDuplicateChatRows(
							mergeMessages(withoutMatchingOptimistic, [normalized]),
						)
						channelMessageCache.set(activeChannelId, next)
						return next
					})
					if (isMounted) {
						setIsConnecting(false)
						setError(null)
					}
				})

				s.on('connect_error', (err: Error) => {
					connectErrorCount++
					console.warn(`[Chat] Connection attempt ${connectErrorCount} failed:`, err.message)

					const looksLikeAuthFailure =
						/401|403|unauthorized|forbidden/i.test(err.message) ||
						/\bauth\b|token|session/i.test(err.message.toLowerCase())

					// Push a fresh Clerk JWT before the next reconnect attempt (common after expiry).
					if (isMounted && channelIdRef.current === activeChannelId && looksLikeAuthFailure && !isGuestMode) {
						void (async () => {
							try {
								const fresh = await getToken({ skipCache: true })
								if (fresh && isMounted && channelIdRef.current === activeChannelId) {
									s.auth = { token: fresh }
								}
							} catch {
								// ignore
							}
						})()
					}
				})

				s.io.on('reconnect_failed', () => {
					if (!isMounted || channelIdRef.current !== activeChannelId) return
					setIsConnecting(false)
					setError(
						isGuestMode
							? 'Chat connection failed. Try refreshing the page or reopening your guest link.'
							: 'Unable to reach chat. Check your connection and try again.',
					)
				})

				s.on('chat:error', (data: unknown) => {
					if (!data || typeof data !== 'object') {
						return
					}

					const errorData = data as { code?: string; message?: string; error?: string }
					const hasErrorInfo = !!(errorData.code || errorData.message || errorData.error)

					if (hasErrorInfo) {
						console.error('[Chat] Socket error:', data)
					}

					if (isMounted) {
						if (errorData.code === 'CHAT_DISABLED') {
							console.log('[Chat] Chat is disabled by host')
						} else if (errorData.code === 'CHAT_SCOPE_RESTRICTED') {
							setError('Host has restricted this chat target for you')
						} else if (errorData.code === 'RECONNECTING') {
							console.log('[Chat] Reconnecting...')
						} else if (hasErrorInfo && (errorData.message || errorData.error)) {
							const msg = (errorData.message || errorData.error || '').toLowerCase()
							if (
								/\breconnect|disconnect|transport|ping\s*time|network/i.test(msg)
							) {
								return
							}
							setError(errorData.message || errorData.error || 'Connection error')
							setIsConnecting(false)
						}
					}
				})

				s.on('disconnect', (reason) => {
					console.log('[Chat] Socket disconnected:', reason)
					if (
						isMounted &&
						reason !== 'io client disconnect' &&
						channelIdRef.current === activeChannelId
					) {
						// Transient network / server restarts: show reconnecting, not a red error banner.
						setIsConnecting(true)
						setError(null)
					}
					// Server forced disconnect often means bad/expired token; client will reconnect with fresh auth.
					if (isMounted && reason === 'io server disconnect' && channelIdRef.current === activeChannelId) {
						void (async () => {
							try {
								const fresh = isGuestMode ? guestToken : await getToken({ skipCache: true })
								if (fresh && isMounted && channelIdRef.current === activeChannelId) {
									s.auth = { token: fresh }
								}
							} catch {
								// ignore
							}
						})()
					}
					if (reason === 'io client disconnect') {
						connectErrorCount = 0
					}
					joinedForCurrentSocket = false
				})

				s.io.on('reconnect', () => {
					console.log('[Chat] Reconnected successfully')
					connectErrorCount = 0
					if (isMounted && channelIdRef.current === activeChannelId) {
						setError(null)
					}
				})

				s.connect()
			} catch (err: unknown) {
				console.error('[Chat] Failed to connect socket:', err)
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
		channelMessageCache.set(channelId, messages)
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

	const onSend = (
		text: string,
		audienceType: MessageAudienceType,
		targetUserId?: string,
	) => {
		const s = socketRef.current
		if (!s || !s.connected) {
			// During reconnect, avoid a red “connection error” — user already sees the blue banner.
			if (isConnecting) return
			setError('Not connected to chat server')
			return
		}
		const trimmed = text.trim()
		if (!trimmed) return

		// Guests: no optimistic row. Signed-in: optimistic uses DB id from props/ref (no await — avoids send delay).
		if (!isGuestMode) {
			const optimisticId = `optimistic-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
			const now = new Date().toISOString()
			const sid =
				(currentUserDbId && String(currentUserDbId)) ||
				(viewerDbUserIdRef.current && String(viewerDbUserIdRef.current)) ||
				''
			if (sid) viewerDbUserIdRef.current = sid
			const displayName =
				user?.fullName ||
				[user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
				user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
				'You'
			const optimistic: Message = {
				id: optimisticId,
				senderId: sid,
				audienceType,
				targetUserId: targetUserId ?? null,
				content: trimmed,
				createdAt: now,
				sender: {
					id: sid || 'me',
					name: displayName,
					avatar: user?.imageUrl ?? null,
				},
			}
			setMessages((prev) => {
				const next = mergeMessages(prev, [optimistic])
				if (channelId) channelMessageCache.set(channelId, next)
				return next
			})
			window.setTimeout(() => {
				setMessages((prev) => {
					if (!prev.some((m) => m.id === optimisticId)) return prev
					const next = prev.filter((m) => m.id !== optimisticId)
					if (channelId) channelMessageCache.set(channelId, next)
					return next
				})
			}, 20_000)
		}

		s.emit('message:send', {
			channelId,
			content: trimmed,
			audienceType,
			targetUserId,
		})
	}

	return (
		<div className={`flex flex-col ${className}`}>
			{chatDisabled && (
				<div className="p-3 md:p-4 bg-orange-900/30 border border-orange-500/40 rounded-lg text-orange-200 text-sm mx-2 md:mx-3 mt-2 md:mt-3">
					<div className="flex items-center gap-2">
						<svg
							className="w-5 h-5 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						<div>
							<p className="font-semibold">Chat Disabled</p>
							<p className="text-xs opacity-90 mt-0.5">
								The host has disabled chat for this session
							</p>
						</div>
					</div>
				</div>
			)}
			{error && !chatDisabled && (
				<div className="p-2 md:p-3 bg-red-900/50 border border-red-500/40 rounded-lg text-red-200 text-xs md:text-sm mx-2 md:mx-3 mt-2 md:mt-3">
					<p className="font-semibold mb-0.5 md:mb-1">Connection Error</p>
					<p className="text-xs opacity-90">{error}</p>
				</div>
			)}
			{isConnecting && messages.length === 0 && (
				<div className="p-2 md:p-3 bg-blue-900/50 border border-blue-500/40 rounded-lg text-blue-200 text-xs md:text-sm mx-2 md:mx-3 mt-2 md:mt-3">
					Connecting to chat…
				</div>
			)}
			<div className="flex-1 overflow-y-auto min-h-0">
				<MessageList
					messages={messages}
					currentUserId={currentUserDbId || undefined}
					hostUserId={hostUserId}
					viewerIsGuest={isGuestMode}
					viewerGuestEmail={viewerGuestEmail ?? undefined}
				/>
			</div>
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
