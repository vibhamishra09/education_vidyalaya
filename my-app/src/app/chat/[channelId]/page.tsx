'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useUser, useAuth } from '@clerk/nextjs'
import apiClient from '@/lib/api-client'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'

function parseChatSocketPayload(data: unknown): {
	code?: string
	message?: string
	error?: string
} | null {
	if (data == null) return null
	if (data instanceof Error) {
		const m = data.message?.trim()
		return m ? { message: m } : null
	}
	if (typeof data !== 'object') return null
	const o = data as Record<string, unknown>
	const message = typeof o.message === 'string' ? o.message : undefined
	const error = typeof o.error === 'string' ? o.error : undefined
	const code = typeof o.code === 'string' ? o.code : undefined
	if (!code && !message?.trim() && !error?.trim()) return null
	return { code, message: message?.trim(), error: error?.trim() }
}

type Message = {
	id: string
	senderId: string
	content: string
	createdAt: string
	audienceType?: 'EVERYONE' | 'HOST' | 'USER'
	targetUserId?: string | null
}

export default function ChannelPage() {
	const { channelId } = useParams<{ channelId: string }>()
	const { user, isLoaded } = useUser()
	const { getToken } = useAuth()
	const getTokenRef = useRef(getToken)
	getTokenRef.current = getToken
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
		if (!channelId || !isLoaded || !user) return
		
		let socketInstance: Socket | null = null
		
		async function connectSocket() {
			try {
				const token = await getTokenRef.current()
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
				})
				
				socketInstance = s

				let joined = false
				const joinChannel = () => {
					if (joined) return
					joined = true
					s.emit('join:channel', { channelId })
				}
				
				s.on('connect', () => {
					joined = false
				})

				s.on('authenticated', () => {
					joinChannel()
				})
				
				s.on('joined:channel', () => {
					setError(null)
				})

				s.on('chat:error', (data: unknown) => {
					const parsed = parseChatSocketPayload(data)
					if (!parsed) return
					const msg = (parsed.message || parsed.error || '').trim()
					if (msg) setError(msg)
					console.warn('[chat page] chat:error:', parsed)
				})
				
				s.on('message:new', (msg: Message) => {
					setMessages((prev) => [...prev, msg])
				})
				
				s.on('connect_error', (err: Error) => {
					console.warn('Socket connection error:', err.message)
					setError(err.message || 'Connection error')
				})

				// Avoid s.on('error'): socket.io-client uses it internally; args often log as {}.
				
				s.on('disconnect', (reason) => {
					console.log('Socket disconnected:', reason)
					joined = false
				})
				
				setSocket(s)
			} catch (err: unknown) {
				console.error('Failed to connect socket:', err)
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
	}, [channelId, isLoaded, user])

	if (!isLoaded) return <div className="p-4">Loading…</div>
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


