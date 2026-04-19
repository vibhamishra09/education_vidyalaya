'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@clerk/nextjs'
import apiClient from '@/lib/api-client'
import { getSocketIoBaseUrl } from '@/lib/socket-base-url'
import { Send, Loader2, Check, CheckCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface DMMessage {
  id: string
  channelId: string
  senderId: string | null
  content: string
  createdAt: string
  sender: {
    id: string
    name: string
    avatar: string | null
  } | null
}

interface DMChatAreaProps {
  channelId: string
  currentUserDbId: string | undefined
  otherUserName: string
  otherUserAvatar: string | null | undefined
  otherUserLastReadAt?: string | null
}

export function DMChatArea({ channelId, currentUserDbId, otherUserName, otherUserAvatar, otherUserLastReadAt }: DMChatAreaProps) {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState<DMMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const channelIdRef = useRef(channelId)
  channelIdRef.current = channelId

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }, 50)
  }, [])

  // Fetch messages from API
  useEffect(() => {
    if (!channelId) return
    let cancelled = false

    async function fetchMessages() {
      try {
        const res = await apiClient.get(`/api/chat/channels/${channelId}/messages`, {
          params: { limit: 100 },
        })
        if (cancelled) return
        const data = Array.isArray(res.data) ? res.data : []
        setMessages(data.map((m: any) => ({
          id: m.id,
          channelId: m.channelId,
          senderId: m.senderId,
          content: m.content,
          createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
          sender: m.sender || null,
        })))
        scrollToBottom('instant')
      } catch {
        // silently fail
      }
    }
    fetchMessages()
    return () => { cancelled = true }
  }, [channelId, scrollToBottom])

  // Socket connection
  useEffect(() => {
    if (!channelId) return
    let socket: Socket | null = null

    async function connectSocket() {
      setIsConnecting(true)
      try {
        const token = await getToken()
        if (!token) return

        const baseUrl = getSocketIoBaseUrl()
        socket = io(`${baseUrl}/chat`, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        })

        socketRef.current = socket

        socket.on('chat:authenticated', () => {
          socket?.emit('join:channel', { channelId })
        })

        socket.on('chat:joined', () => {
          setIsConnecting(false)
        })

        socket.on('message:new', (message: any) => {
          if (message.channelId !== channelIdRef.current) return
          
          const newMsg: DMMessage = {
            id: message.id,
            channelId: message.channelId,
            senderId: message.senderId,
            content: message.content,
            createdAt: typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString(),
            sender: message.sender || null,
          }

          setMessages((prev) => {
            // Don't add duplicate
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          scrollToBottom()
        })

        socket.on('connect_error', () => {
          setIsConnecting(false)
        })
      } catch {
        setIsConnecting(false)
      }
    }

    connectSocket()

    return () => {
      if (socket) {
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [channelId, getToken, scrollToBottom])

  // Send message
  const handleSend = useCallback(async () => {
    const content = inputValue.trim()
    if (!content || !channelId || !socketRef.current) return

    setIsSending(true)
    setInputValue('')

    try {
      socketRef.current.emit('message:send', {
        channelId,
        content,
        audienceType: 'EVERYONE',
      })
    } catch {
      // Restore input on error
      setInputValue(content)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }, [inputValue, channelId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Format time
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  // Group messages by date
  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    if (now.toDateString() === d.toDateString()) return 'Today'
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (yesterday.toDateString() === d.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  // Determine if we should show date separator
  const shouldShowDateHeader = (index: number): string | null => {
    if (index === 0) return formatDateHeader(messages[0].createdAt)
    const current = new Date(messages[index].createdAt).toDateString()
    const previous = new Date(messages[index - 1].createdAt).toDateString()
    if (current !== previous) return formatDateHeader(messages[index].createdAt)
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200/50 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full transition-colors">
        {isConnecting && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="h-8 w-8 border-[2.5px] border-gray-200 border-t-primary rounded-full animate-spin" />
            <p className="mt-3 text-[12px] text-gray-400">Connecting...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Avatar className="h-16 w-16 ring-4 ring-gray-100 shadow-md mb-4">
              <AvatarImage src={otherUserAvatar || undefined} alt={otherUserName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/70 to-secondary/70 text-white text-xl font-bold">
                {(otherUserName?.charAt(0) || '?').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-[14px] font-semibold text-gray-900">{otherUserName}</p>
            <p className="text-[12px] text-gray-400 mt-1">
              This is the beginning of your conversation. Say hello! 👋
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, index) => {
              const isMine = msg.senderId === currentUserDbId
              const dateHeader = shouldShowDateHeader(index)

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {dateHeader && (
                    <div className="flex items-center justify-center my-4">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        {dateHeader}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`flex items-end gap-2 mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {/* Other user avatar */}
                    {!isMine && (
                      <Avatar className="h-7 w-7 flex-shrink-0 ring-1 ring-gray-100 shadow-sm">
                        <AvatarImage src={msg.sender?.avatar || otherUserAvatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/60 to-secondary/60 text-white text-[10px] font-bold">
                          {(msg.sender?.name?.charAt(0) || otherUserName?.charAt(0) || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`max-w-[75%] group ${isMine ? 'order-1' : ''}`}>
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                          isMine
                            ? 'bg-gradient-to-br from-primary to-emerald-500 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <p className={`flex items-center gap-1 text-[10px] text-gray-400 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                        isMine ? 'justify-end' : 'justify-start'
                      }`}>
                        {formatTime(msg.createdAt)}
                        {isMine && (
                          otherUserLastReadAt && new Date(otherUserLastReadAt).getTime() >= new Date(msg.createdAt).getTime() ? (
                            <span title="Read"><CheckCheck className="h-3.5 w-3.5 text-blue-500" /></span>
                          ) : (
                            <span title="Delivered"><Check className="h-3.5 w-3.5" /></span>
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 transition-all focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
            disabled={isConnecting}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isConnecting || isSending}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-500 text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
