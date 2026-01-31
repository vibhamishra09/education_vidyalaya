'use client'
import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUser, useAuth } from '@clerk/nextjs'
import apiClient from '@/lib/api-client'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'

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

interface ChatWidgetProps {
	channelId: string | null | undefined
	className?: string
	chatDisabled?: boolean
}

export function ChatWidget({ channelId, className = '', chatDisabled = false }: ChatWidgetProps) {
	const { user, isLoaded } = useUser()
	const { getToken } = useAuth()
	const [messages, setMessages] = useState<Message[]>([])
	const socketRef = useRef<Socket | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isConnecting, setIsConnecting] = useState(false)

	// Debug: Log chatDisabled prop changes
	useEffect(() => {
		console.log('[ChatWidget] chatDisabled prop changed to:', chatDisabled)
	}, [chatDisabled])

	useEffect(() => {
		if (!channelId) {
			setMessages([])
			setError(null)
			return
		}

		let mounted = true
		async function loadHistory() {
			try {
				console.log('Loading chat history for channel:', channelId)
				// Load more messages to show complete history
				const res = await apiClient.get(`/api/chat/channels/${channelId}/messages`, { params: { limit: 200 } })
				if (!mounted) return
				console.log('Loaded messages:', res.data?.length || 0, 'messages')
				setMessages(res.data || [])
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
	}, [channelId])

	useEffect(() => {
		if (!channelId || !isLoaded || !user || !getToken) {
			if (socketRef.current) {
				socketRef.current.disconnect()
				socketRef.current = null
			}
			return
		}
		
		let socketInstance: Socket | null = null
		let isMounted = true
		
		async function connectSocket() {
			try {
				setIsConnecting(true)
				setError(null)
				
				// Get Clerk token for authentication using the useAuth hook
				const token = await getToken()
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
				
				console.log('🔌 [Chat] Connecting to WebSocket:', url, 'for channel:', channelId)
				
				const s = io(url, { 
					transports: ['websocket'],
					auth: { token },
					reconnection: true,
					reconnectionAttempts: 5,
					reconnectionDelay: 1000,
					timeout: 10000,
				})
				
				socketInstance = s
				socketRef.current = s
				
				s.on('connect', () => {
					console.log('✅ [Chat] Socket connected, joining channel:', channelId)
					s.emit('join:channel', { channelId })
					if (isMounted) {
						setIsConnecting(false)
						setError(null)
					}
				})
				
				s.on('joined:channel', () => {
					console.log('✅ [Chat] Successfully joined channel:', channelId)
					if (isMounted) {
						setError(null) // Clear any previous errors
					}
				})
				
			s.on('message:new', (msg: Message) => {
				console.log('📩 [Chat] Received new message:', msg.id)
				setMessages((prev) => {
					// Prevent duplicate messages
					if (prev.some(m => m.id === msg.id)) {
						console.warn('⚠️ [Chat] Duplicate message detected, ignoring:', msg.id)
						return prev
					}
					return [...prev, msg]
				})
			})
		
			// Track reconnection attempts to avoid showing error on normal reconnects
			let reconnectAttempts = 0
			
			s.on('connect_error', (err: Error) => {
					reconnectAttempts++
					console.warn(`🔄 [Chat] Connection attempt ${reconnectAttempts} failed:`, err.message)
					
					// Only show error after multiple failed attempts (persistent failure)
					if (isMounted && reconnectAttempts >= 3) {
						// Check for auth errors (fatal)
						if (err.message.includes('auth') || err.message.includes('401') || err.message.includes('unauthorized')) {
							setError('Authentication failed')
						} else {
							setError('Unable to connect to chat')
						}
						setIsConnecting(false)
					}
				})
				
				s.on('error', (data: { code?: string; message?: string }) => {
					// Only log if there's actual error data
					if (data && (data.code || data.message)) {
						console.error('🚨 [Chat] Socket error:', data)
					}
					if (isMounted) {
						// Handle specific error codes
						if (data?.code === 'CHAT_DISABLED') {
							// Don't show error - chatDisabled prop will handle the UI
							console.log('ℹ️ [Chat] Chat is disabled by host')
						} else if (data?.code === 'RECONNECTING') {
							// Normal reconnection, don't show error
							console.log('🔄 [Chat] Reconnecting...')
						} else if (data?.message) {
							setError(data.message || 'Connection error')
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
	}, [channelId, isLoaded, user, getToken])

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

	if (!user) {
		return (
			<div className={`p-4 border rounded ${className}`}>
				<p className="text-muted-foreground text-sm">Please sign in to chat</p>
			</div>
		)
	}

	const onSend = async (text: string) => {
		if (!socketRef.current || !socketRef.current.connected) {
			setError('Not connected to chat server')
			return
		}
		socketRef.current.emit('message:send', { channelId, content: text })
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
				<MessageList messages={messages} />
			</div>
			{/* Input area - always at bottom */}
			<div className="border-t border-white/10 flex-shrink-0">
				<MessageInput onSend={onSend} disabled={chatDisabled} />
			</div>
		</div>
	)
}

