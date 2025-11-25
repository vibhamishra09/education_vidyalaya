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
}

export function ChatWidget({ channelId, className = '' }: ChatWidgetProps) {
	const { user, isLoaded } = useUser()
	const { getToken } = useAuth()
	const [messages, setMessages] = useState<Message[]>([])
	const socketRef = useRef<Socket | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isConnecting, setIsConnecting] = useState(false)

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
		
		async function connectSocket() {
			try {
				setIsConnecting(true)
				// Get Clerk token for authentication using the useAuth hook
				const token = await getToken()
				if (!token) {
					setError('Authentication required')
					setIsConnecting(false)
					return
				}

				const url = process.env.NEXT_PUBLIC_CHAT_WS_URL as string
				const s = io(url, { 
					transports: ['websocket'],
					auth: { token },
					reconnection: true,
					reconnectionAttempts: 5,
					reconnectionDelay: 1000,
				})
				
				socketInstance = s
				socketRef.current = s
				
				s.on('connect', () => {
					console.log('Socket connected, joining channel:', channelId)
					s.emit('join:channel', { channelId })
					setIsConnecting(false)
				})
				
				s.on('joined:channel', () => {
					console.log('Successfully joined channel:', channelId)
					setError(null) // Clear any previous errors
				})
				
			s.on('message:new', (msg: Message) => {
				console.log('Received new message:', msg)
				setMessages((prev) => {
					// Prevent duplicate messages
					if (prev.some(m => m.id === msg.id)) {
						console.warn('Duplicate message detected, ignoring:', msg.id)
						return prev
					}
					return [...prev, msg]
				})
			})
		
		s.on('connect_error', (err: Error) => {
					console.error('Socket connection error:', err)
					setError(err.message || 'Connection error')
					setIsConnecting(false)
				})
				
				s.on('error', (err: Error) => {
					console.error('Socket error:', err)
					setError(err.message || 'Connection error')
				})
				
				s.on('disconnect', (reason) => {
					console.log('Socket disconnected:', reason)
				})
			} catch (err: unknown) {
				console.error('Failed to connect socket:', err)
				const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
				setError(errorMessage)
				setIsConnecting(false)
			}
		}
		
		connectSocket()
		
		return () => {
			if (socketInstance) {
				socketInstance.disconnect()
				socketInstance = null
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [channelId, isLoaded, getToken])

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

	const isFullHeight = className.includes('h-full')

	return (
		<div className={`flex flex-col ${className} bg-background/50`} style={isFullHeight ? { height: '100%' } : { height: '500px' }}>
			{error && (
				<div className="p-3 bg-destructive/20 border border-destructive/40 rounded-lg text-destructive-foreground text-sm mx-3 mt-3 flex-shrink-0 backdrop-blur-sm">
					<p className="font-semibold mb-1">Connection Error</p>
					<p className="text-xs opacity-90">{error}</p>
				</div>
			)}
			{isConnecting && (
				<div className="p-3 bg-primary/20 border border-primary/40 rounded-lg text-foreground text-sm mx-3 mt-3 flex-shrink-0 backdrop-blur-sm">
					Connecting to chat...
				</div>
			)}
			<div className="flex-1 overflow-hidden flex flex-col min-h-0">
				<MessageList messages={messages} />
			</div>
			<div className="flex-shrink-0">
				<MessageInput onSend={onSend} />
			</div>
		</div>
	)
}

