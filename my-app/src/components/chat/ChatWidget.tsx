'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
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
	type ChatViewerSessionRole,
	buildInboundChatFlowMeta,
	buildOutboundChatFlowMeta,
	collapseNearDuplicateChatRows,
	isOptimisticEchoOfInbound,
	isOptimisticMessageId,
	mergeMessages,
	normalizeChatMessage,
} from '@/components/chat/chat-message-utils'
import {
	chatFlowLog,
	chatFlowShortId,
	isChatFlowFileEnabled,
} from '@/lib/chat-flow-log'

type Message = ChatMessageRow

const channelMessageCache = new Map<string, Message[]>()

function pickTrimmedUserId(
	primary: string | null | undefined,
	fallback: string | null | undefined,
): string | null {
	const a = typeof primary === 'string' && primary.trim() ? primary.trim() : ''
	const b = typeof fallback === 'string' && fallback.trim() ? fallback.trim() : ''
	return a || b || null
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
	guestEmail?: string | null
	/** When false (e.g. chat drawer closed), we still mount for sockets; set false from video room. */
	chatPanelActive?: boolean
	/** Who is viewing chat (for file logs + sync notes). Standalone /chat defaults to joinee. */
	viewerSessionRole?: ChatViewerSessionRole
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
	chatPanelActive = true,
	viewerSessionRole = 'joinee',
}: ChatWidgetProps) {
	const { user, isLoaded } = useUser()
	const { getToken } = useAuth()
	const userId = user?.id
	/**
	 * If the URL includes a guest join token, always use guest chat (socket + history).
	 * Otherwise a signed-in joinee would connect as their Clerk user while the API still
	 * resolved guest email from the token — mismatched rooms/history vs host EVERYONE broadcasts.
	 */
	const isGuestMode = Boolean(guestToken?.trim())
	/** Keep socket effect from re-running on every parent render (was reconnecting constantly → missed message:new). */
	const getTokenRef = useRef(getToken)
	getTokenRef.current = getToken
	const viewerSessionRoleRef = useRef(viewerSessionRole)
	viewerSessionRoleRef.current = viewerSessionRole
	const hostUserIdRef = useRef(hostUserId)
	hostUserIdRef.current = hostUserId
	const channelIdRef = useRef<string | null | undefined>(channelId)
	channelIdRef.current = channelId
	const [viewerGuestEmail, setViewerGuestEmail] = useState<string | null>(
		() => guestEmail ?? null,
	)
	const viewerDbUserIdRef = useRef(currentUserDbId)
	/** Latest prop for dedupe when ref is cleared before `/api/users/me` or socket runs. */
	const currentUserDbIdPropRef = useRef(currentUserDbId)
	currentUserDbIdPropRef.current = currentUserDbId
	const viewerGuestEmailRef = useRef<string | null>(guestEmail ?? null)
	/** Bumps when `/api/users/me` resolves inside this widget so dedupe effects re-run (ref alone does not). */
	const [fetchedDbUserId, setFetchedDbUserId] = useState<string | null>(null)
	/** Same as `fetchedDbUserId` state — socket `message:new` must read latest without stale closures. */
	const fetchedDbUserIdRef = useRef<string | null>(null)
	useEffect(() => {
		fetchedDbUserIdRef.current = fetchedDbUserId
	}, [fetchedDbUserId])

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
				if (id && !cancelled) {
					viewerDbUserIdRef.current = id
					fetchedDbUserIdRef.current = id
					setFetchedDbUserId(id)
				}
			} catch {
				/* ignore */
			}
		})()
		return () => {
			cancelled = true
		}
	}, [channelId, userId, isGuestMode, getToken, currentUserDbId])

	useEffect(() => {
		fetchedDbUserIdRef.current = null
		setFetchedDbUserId(null)
	}, [channelId])

	useEffect(() => {
		viewerGuestEmailRef.current = viewerGuestEmail ?? guestEmail ?? null
	}, [viewerGuestEmail, guestEmail])

	/** When DB user id arrives (prop or `/api/users/me`), re-run dedupe so optimistic + echo collapse. */
	useEffect(() => {
		if (!channelId || isGuestMode) return
		const vid = pickTrimmedUserId(
			pickTrimmedUserId(viewerDbUserIdRef.current, currentUserDbIdPropRef.current),
			fetchedDbUserId,
		)
		if (!vid) return
		setMessages((prev) => {
			const next = collapseNearDuplicateChatRows(
				prev.map(normalizeChatMessage),
				vid,
			)
			const same =
				next.length === prev.length &&
				next.every((m, i) => m.id === prev[i]?.id)
			if (same) return prev
			channelMessageCache.set(channelId, next)
			return next
		})
	}, [channelId, currentUserDbId, fetchedDbUserId, isGuestMode])

	const [messages, setMessages] = useState<Message[]>(() => {
		if (!channelId) return []
		const cached = channelMessageCache.get(channelId) || []
		return cached.map(normalizeChatMessage)
	})
	const socketRef = useRef<Socket | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isConnecting, setIsConnecting] = useState(false)

	const mergeMessagesFromServer = useCallback(async () => {
		if (!channelId) return
		const activeChannelId = channelId
		try {
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
			if (channelIdRef.current !== activeChannelId) return
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
			const incoming = rawList.map(normalizeChatMessage)
			setMessages((prev) => {
				if (channelIdRef.current !== activeChannelId) return prev
				const viewerId = pickTrimmedUserId(
					pickTrimmedUserId(
						viewerDbUserIdRef.current,
						currentUserDbIdPropRef.current,
					),
					fetchedDbUserIdRef.current,
				)
				const merged = mergeMessages(prev, incoming)
				const next = collapseNearDuplicateChatRows(merged, viewerId)
				channelMessageCache.set(activeChannelId, next)
				return next
			})
		} catch {
			/* best-effort sync */
		}
	}, [channelId, isGuestMode, guestEmail, guestToken])

	const wasChatPanelOpenRef = useRef(false)
	useEffect(() => {
		wasChatPanelOpenRef.current = false
	}, [channelId])

	useEffect(() => {
		if (!channelId) return
		const wasOpen = wasChatPanelOpenRef.current
		wasChatPanelOpenRef.current = chatPanelActive
		if (!chatPanelActive) return
		if (!wasOpen) {
			void mergeMessagesFromServer()
		}
	}, [channelId, chatPanelActive, mergeMessagesFromServer])

	useEffect(() => {
		if (!channelId) return
		let t: ReturnType<typeof setTimeout> | undefined
		const onVis = () => {
			if (document.visibilityState !== 'visible') return
			if (t) clearTimeout(t)
			t = setTimeout(() => void mergeMessagesFromServer(), 400)
		}
		document.addEventListener('visibilitychange', onVis)
		return () => {
			document.removeEventListener('visibilitychange', onVis)
			if (t) clearTimeout(t)
		}
	}, [channelId, mergeMessagesFromServer])

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
				chatFlowLog('history:request', {
					channelId: chatFlowShortId(activeChannelId),
					guestMode: isGuestMode,
					viewerSessionRole: isGuestMode ? 'guest' : viewerSessionRole,
				})
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
					pickTrimmedUserId(
						pickTrimmedUserId(
							viewerDbUserIdRef.current,
							currentUserDbIdPropRef.current,
						),
						fetchedDbUserIdRef.current,
					),
				)
				// Replace server history for this channel only — do not merge with prior room’s list.
				if (channelIdRef.current !== activeChannelId) return
				setMessages(historyMessages)
				channelMessageCache.set(activeChannelId, historyMessages)
				chatFlowLog('history:loaded', {
					channelId: chatFlowShortId(activeChannelId),
					count: historyMessages.length,
					viewerSessionRole: isGuestMode ? 'guest' : viewerSessionRole,
				})
			} catch (e: unknown) {
				if (!mounted || channelIdRef.current !== activeChannelId) return
				const errorMessage = e instanceof Error ? e.message : 'Failed to load messages'
				chatFlowLog('history:error', {
					error: errorMessage,
					viewerSessionRole: isGuestMode ? 'guest' : viewerSessionRole,
				})
				console.error('Failed to load chat history:', errorMessage)
				// Do not set the red banner — history is best-effort; socket may still work.
			}
		}
		loadHistory()
		return () => {
			mounted = false
		}
	}, [channelId, isGuestMode, guestEmail, guestToken, viewerSessionRole])

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

				let token = isGuestMode ? guestToken : await getTokenRef.current()
				if (!token && !isGuestMode) {
					await new Promise((r) => setTimeout(r, 400))
					token = (await getTokenRef.current()) ?? null
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

				chatFlowLog('socket:prepare', {
					url,
					channelId: chatFlowShortId(activeChannelId),
					role: isGuestMode ? 'guest' : 'signed-in',
					viewerSessionRole: viewerSessionRoleRef.current,
				})

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
				let connectWatchdog: ReturnType<typeof setTimeout> | null = null

				const joinChannel = () => {
					if (joinedForCurrentSocket) return
					joinedForCurrentSocket = true
					chatFlowLog('socket:emit_join_channel', {
						channelId: chatFlowShortId(activeChannelId),
					})
					s.emit('join:channel', { channelId: activeChannelId })
				}

				// Clerk JWTs expire; reconnect must send a fresh token or the server disconnects.
				s.io.on('reconnect_attempt', async () => {
					if (!isMounted || channelIdRef.current !== activeChannelId) return
					setIsConnecting(true)
					setError(null)
					try {
						const fresh = isGuestMode
							? guestToken
							: await getTokenRef.current({ skipCache: true })
						if (fresh) {
							s.auth = { token: fresh }
						}
					} catch {
						// keep previous auth; next attempt may succeed
					}
				})

				s.on('connect', () => {
					chatFlowLog('socket:transport_connected', {
						channelId: chatFlowShortId(activeChannelId),
					})
					connectErrorCount = 0
					joinedForCurrentSocket = false
					if (isMounted && channelIdRef.current === activeChannelId) {
						setError(null)
					}
				})

				s.on('chat:authenticated', () => {
					chatFlowLog('socket:chat_authenticated', {
						channelId: chatFlowShortId(activeChannelId),
					})
					if (connectWatchdog) {
						clearTimeout(connectWatchdog)
						connectWatchdog = null
					}
					if (isMounted) {
						setIsConnecting(false)
						setError(null)
					}
					joinChannel()
				})

				s.on('chat:joined', () => {
					chatFlowLog('socket:chat_joined_room', {
						channelId: chatFlowShortId(activeChannelId),
					})
					if (connectWatchdog) {
						clearTimeout(connectWatchdog)
						connectWatchdog = null
					}
					if (isMounted) {
						setIsConnecting(false)
						setError(null)
					}
				})

				s.on('message:new', (msg: unknown) => {
					if (channelIdRef.current !== activeChannelId) return
					const normalized = normalizeChatMessage(msg)
					const viewerIdForLog = pickTrimmedUserId(
						pickTrimmedUserId(
							viewerDbUserIdRef.current,
							currentUserDbIdPropRef.current,
						),
						fetchedDbUserIdRef.current,
					)
					const inboundFlow = buildInboundChatFlowMeta(
						normalized,
						viewerSessionRoleRef.current,
						hostUserIdRef.current,
						viewerIdForLog,
						viewerGuestEmailRef.current,
						isGuestMode,
					)
					chatFlowLog('message:inbound', {
						channelId: chatFlowShortId(activeChannelId),
						messageId: chatFlowShortId(normalized.id),
						audienceType: normalized.audienceType,
						senderId: chatFlowShortId(normalized.senderId ?? undefined),
						targetUserId: chatFlowShortId(normalized.targetUserId ?? undefined),
						viewerSessionRole: viewerSessionRoleRef.current,
						senderKind: inboundFlow.senderKind,
						syncNote: inboundFlow.syncNote,
						preview: (normalized.content || '').slice(0, 80),
						...(isChatFlowFileEnabled()
							? { content: normalized.content ?? '' }
							: {}),
					})
					setMessages((prev) => {
						if (channelIdRef.current !== activeChannelId) return prev
						if (prev.some((m) => m.id === normalized.id)) {
							return prev
						}
						const viewerId = pickTrimmedUserId(
							pickTrimmedUserId(
								viewerDbUserIdRef.current,
								currentUserDbIdPropRef.current,
							),
							fetchedDbUserIdRef.current,
						)
						const withoutMatchingOptimistic = prev.filter((m) => {
							if (!isOptimisticMessageId(m.id)) return true
							return !isOptimisticEchoOfInbound(
								m,
								normalized,
								viewerId,
								viewerGuestEmailRef.current,
							)
						})
						const next = collapseNearDuplicateChatRows(
							mergeMessages(withoutMatchingOptimistic, [normalized]),
							viewerId,
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
					chatFlowLog('socket:connect_error', {
						attempt: connectErrorCount,
						message: err.message,
					})

					const looksLikeAuthFailure =
						/401|403|unauthorized|forbidden/i.test(err.message) ||
						/\bauth\b|token|session/i.test(err.message.toLowerCase())

					// Push a fresh Clerk JWT before the next reconnect attempt (common after expiry).
					if (isMounted && channelIdRef.current === activeChannelId && looksLikeAuthFailure && !isGuestMode) {
						void (async () => {
							try {
								const fresh = await getTokenRef.current({ skipCache: true })
								if (fresh && isMounted && channelIdRef.current === activeChannelId) {
									s.auth = { token: fresh }
								}
							} catch {
								// ignore
							}
						})()
					}

					// Avoid a stuck red banner while Socket.IO is still retrying (websocket → polling, etc.).
					if (isMounted && channelIdRef.current === activeChannelId && connectErrorCount < 4) {
						setError(null)
					}
					if (isMounted && channelIdRef.current === activeChannelId && connectErrorCount >= 4) {
						setIsConnecting(false)
						setError(
							isGuestMode
								? 'Unable to connect to chat right now. Please refresh or reopen your guest link.'
								: 'Unable to connect to chat. Please check your connection and retry.',
						)
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
						chatFlowLog('socket:chat_error', {
							code: errorData.code,
							message: errorData.message || errorData.error,
						})
					}

					if (isMounted) {
						if (errorData.code === 'CHAT_SCOPE_RESTRICTED') {
							setError('Host has restricted this chat target for you')
						} else if (hasErrorInfo && (errorData.message || errorData.error)) {
							const msg = (errorData.message || errorData.error || '').toLowerCase()
							if (
								/\breconnect|disconnect|transport|ping\s*time|network|websocket|xhr|poll|closed before|connection/i.test(
									msg,
								)
							) {
								return
							}
							setError(errorData.message || errorData.error || 'Connection error')
							setIsConnecting(false)
						}
					}
				})

				s.on('disconnect', (reason) => {
					chatFlowLog('socket:disconnect', { reason })
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
								const fresh = isGuestMode
									? guestToken
									: await getTokenRef.current({ skipCache: true })
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
					chatFlowLog('socket:reconnected', {
						channelId: chatFlowShortId(activeChannelId),
						syncNote:
							'Transport reconnected — re-emit join:channel if server did not re-authenticate yet',
					})
					connectErrorCount = 0
					joinedForCurrentSocket = false
					window.setTimeout(() => {
						if (!isMounted || channelIdRef.current !== activeChannelId) return
						joinChannel()
					}, 350)
					if (isMounted && channelIdRef.current === activeChannelId) {
						setError(null)
					}
				})

				s.connect()
				connectWatchdog = setTimeout(() => {
					if (!isMounted || channelIdRef.current !== activeChannelId) return
					if (!s.connected) {
						setIsConnecting(false)
						setError(
							isGuestMode
								? 'Chat is taking too long to connect. Please refresh this page.'
								: 'Chat is taking too long to connect. Please refresh and try again.',
						)
					}
				}, 15000)
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
				socketInstance.removeAllListeners()
				socketInstance.disconnect()
				socketInstance = null
			}
			socketRef.current = null
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- getToken/viewerSessionRole/hostUserId via refs; including them reconnects socket every render
	}, [channelId, isLoaded, userId, guestToken, isGuestMode])

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

	const onSend = async (
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

		const outboundFlow = buildOutboundChatFlowMeta(
			isGuestMode ? 'guest' : viewerSessionRole,
		)

		chatFlowLog('message:outbound_send', {
			channelId: chatFlowShortId(channelId),
			audienceType,
			targetUserId: targetUserId ? chatFlowShortId(targetUserId) : undefined,
			role: isGuestMode ? 'guest' : 'signed-in',
			viewerSessionRole: isGuestMode ? 'guest' : viewerSessionRole,
			syncNote: outboundFlow.syncNote,
			preview: trimmed.slice(0, 80),
			...(isChatFlowFileEnabled() ? { content: trimmed } : {}),
		})

		// Resolve DB user id from props/refs only — do not await before socket emit (was delaying host↔joinee sync by seconds).
		let sid =
			(currentUserDbId && String(currentUserDbId)) ||
			(viewerDbUserIdRef.current && String(viewerDbUserIdRef.current)) ||
			(fetchedDbUserIdRef.current && String(fetchedDbUserIdRef.current)) ||
			''

		s.emit('message:send', {
			channelId,
			content: trimmed,
			audienceType,
			targetUserId,
		})
		chatFlowLog('message:emit_message_send', {
			channelId: chatFlowShortId(channelId),
			audienceType,
			viewerSessionRole: isGuestMode ? 'guest' : viewerSessionRole,
			syncNote:
				'Socket emitted message:send immediately — other clients should get message:new without waiting for /api/users/me',
		})

		if (!isGuestMode && !sid) {
			try {
				const token = await getToken()
				if (token) {
					const res = await apiClient.get<{ id?: string }>('/api/users/me', {
						headers: { Authorization: `Bearer ${token}` },
					})
					const id = typeof res.data?.id === 'string' ? res.data.id : null
					if (id) {
						sid = id
						viewerDbUserIdRef.current = id
						fetchedDbUserIdRef.current = id
						setFetchedDbUserId(id)
					}
				}
			} catch {
				/* ignore */
			}
		}
		if (sid) viewerDbUserIdRef.current = sid

		// Signed-in without a DB user id: skip optimistic row so we never show two lines (placeholder + echo).
		// Signed-in joinee: no optimistic row — only server echo (avoids Clerk name vs DB name duplicate).
		const canUseOptimistic =
			(isGuestMode || (!!sid && sid.trim() !== '')) &&
			!(viewerSessionRole === 'joinee' && !isGuestMode)

		if (canUseOptimistic) {
			const optimisticId = `optimistic-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
			const now = new Date().toISOString()
			const fallbackGuestEmail =
				(viewerGuestEmailRef.current && viewerGuestEmailRef.current.trim()) ||
				(guestEmail && guestEmail.trim()) ||
				null
			const displayName = isGuestMode
				? fallbackGuestEmail?.split('@')[0] || 'You'
				: user?.fullName ||
					[user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
					user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
					'You'
			const optimistic: Message = {
				id: optimisticId,
				senderId: isGuestMode ? null : sid,
				guestEmail: isGuestMode ? fallbackGuestEmail : null,
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
