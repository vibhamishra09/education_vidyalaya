'use client'

import { useState, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Plus, MessageCircle } from 'lucide-react'
import type { ChatChannel } from '@/lib/api/chat.api'

interface ConversationListProps {
  channels: ChatChannel[]
  currentUserId: string | undefined
  activeChannelId: string | null
  onSelectChannel: (channelId: string) => void
  onNewChat: () => void
  isLoading: boolean
  /** Set of user IDs currently online */
  onlineUserIds?: Set<string>
}

export function ConversationList({
  channels,
  currentUserId,
  activeChannelId,
  onSelectChannel,
  onNewChat,
  isLoading,
  onlineUserIds,
}: ConversationListProps) {
  const [search, setSearch] = useState('')

  const filteredChannels = useMemo(() => {
    if (!search.trim()) return channels
    const q = search.toLowerCase()
    return channels.filter((ch) => {
      const otherMember = ch.members?.find((m) => m.user?.id !== currentUserId)
      const name = otherMember?.user?.name || ch.name
      return name.toLowerCase().includes(q)
    })
  }, [channels, search, currentUserId])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return ''
    const now = new Date()
    const isSameDay = now.toDateString() === date.toDateString()
    if (isSameDay) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (yesterday.toDateString() === date.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">Conversations</h2>
          <button
            onClick={onNewChat}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-500 text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
            title="New conversation"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-[13px] text-gray-900 placeholder:text-gray-400 transition-all focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {isLoading && channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 border-[2.5px] border-gray-200 border-t-primary rounded-full animate-spin" />
            <p className="mt-3 text-[12px] text-gray-400 font-medium">Loading chats...</p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <MessageCircle className="h-7 w-7 text-gray-300" />
            </div>
            <p className="mt-4 text-[13px] font-semibold text-gray-500">
              {search ? 'No results' : 'No conversations yet'}
            </p>
            <p className="mt-1 text-[11px] text-gray-400 text-center max-w-[200px]">
              {search ? 'Try a different search' : 'Start a conversation by tapping the + button above'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 py-1">
            {filteredChannels.map((channel) => {
              const otherMember = channel.members?.find(
                (m) => m.user?.id !== currentUserId
              )
              const displayName = otherMember?.user?.name || channel.name
              const displayAvatar = otherMember?.user?.avatar
              const initials = (displayName?.charAt(0) || '?').toUpperCase()
              const lastMessage = channel.messages?.[0]
              const isActive = activeChannelId === channel.id

              const otherUserId = otherMember?.user?.id
              const isUserOnline = otherUserId ? (onlineUserIds?.has(otherUserId) ?? false) : false

              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`group w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/8 shadow-sm'
                      : 'hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm">
                      <AvatarImage src={displayAvatar || undefined} alt={displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/70 to-secondary/70 text-white text-[13px] font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator dot */}
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${isUserOnline ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[13px] font-semibold truncate ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>
                        {displayName}
                      </span>
                      {lastMessage && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium tabular-nums">
                          {formatTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {lastMessage ? (
                      <p className="text-[12px] text-gray-500 truncate mt-0.5 leading-snug">
                        {lastMessage.sender?.id === currentUserId ? (
                          <span className="text-gray-400">You: </span>
                        ) : null}
                        {lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic mt-0.5">Start chatting...</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
