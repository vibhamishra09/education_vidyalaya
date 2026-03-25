'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useUser, useAuth } from '@clerk/nextjs'
import apiClient from '@/lib/api-client'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'

type Message = {
	id: string
	senderId: string | null
	content: string
	createdAt: string
	audienceType?: 'EVERYONE' | 'HOST' | 'USER'
	targetUserId?: string | null
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

export default function ChannelPage() {
	const { channelId } = useParams<{ channelId: string }>()
	const { user, isLoaded } = useUser()
	const { getToken } = useAuth()
	const [messages, setMessages] = useState<Message[]>([])
	const [socket, setSocket] = useState<Socket | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let mounted = true
		async function loadHistory() {
			try {
				const res = await apiClient.get(`/api/chat/channels/${channelId}/messages`, { params: { limit: 50 } })
				if (!mounted) return
				setMessages(res.data)
			} catch (e: unknown) {
				if (!mounted) return
				const errorMessage = e instanceof Error ? e.message : 'Failed to load messages'
				setError(errorMessage)
			}
		}
		if (channelId) loadHistory()
		return () => {
			mounted = false
		}
	}, [channelId])

	useEffect(() => {
		if (!channelId || !isLoaded || !user || !getToken) return

		let socketInstance: Socket | null = null

		async function connectSocket() {
			try {
				const token = await getToken()
				if (!token) {
					setError('Authentication required')
					return
				}

				const url =
					process.env.NEXT_PUBLIC_CHAT_WS_URL ||
					process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
					'http://localhost:3001'

				const s = io(url, {
					transports: ['websocket', 'polling'],
					auth: { token },
					reconnection: true,
					reconnectionAttempts: 5,
					reconnectionDelay: 1000,
					autoConnect: false,
				})

				socketInstance = s

				s.on('connect', () => {
					console.log('[ChatPage] Socket connected:', channelId)
				})

				s.on('chat:authenticated', () => {
					console.log('[ChatPage] Socket authenticated, joining channel:', channelId)
					setError(null)
					s.emit('join:channel', { channelId })
				})

				s.on('chat:joined', () => {
					console.log('[ChatPage] Successfully joined channel:', channelId)
					setError(null)
				})

				s.on('message:new', (msg: Message) => {
					setMessages((prev) => {
						if (prev.some((existing) => existing.id === msg.id)) {
							return prev
						}
						return [...prev, msg]
					})
					setError(null)
				})

				s.on('connect_error', (err: Error) => {
					console.error('[ChatPage] Socket connection error:', err)
					setError(err.message || 'Connection error')
				})

				s.on('chat:error', (data: unknown) => {
					console.error('[ChatPage] Socket error:', data)
					if (typeof data === 'object' && data && 'message' in data) {
						setError(String((data as { message?: string }).message || 'Connection error'))
						return
					}
					setError('Connection error')
				})

				s.on('disconnect', (reason) => {
					console.log('[ChatPage] Socket disconnected:', reason)
				})

				setSocket(s)
				s.connect()
			} catch (err: unknown) {
				console.error('[ChatPage] Failed to connect socket:', err)
				const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
				setError(errorMessage)
			}
		}

		connectSocket()

		return () => {
			if (socketInstance) {
				socketInstance.disconnect()
				socketInstance = null
			}
		}
	}, [channelId, isLoaded, user, getToken])

	if (!isLoaded) return <div className="p-4">Loading...</div>
	if (!user) return <div className="p-4">Please sign in.</div>
	if (error) return <div className="p-4 text-red-600">Error: {error}</div>

	const onSend = async (
		text: string,
		audienceType: 'EVERYONE' | 'HOST' | 'USER' = 'EVERYONE',
		targetUserId?: string,
	) => {
		if (!socket || !socket.connected) {
			setError('Not connected to chat server')
			return
		}
		socket.emit('message:send', { channelId, content: text, audienceType, targetUserId })
	}

	return (
		<div className="p-4 h-[80vh] flex flex-col gap-3">
			<MessageList messages={messages} />
			<MessageInput onSend={onSend} />
		</div>
	)
}
