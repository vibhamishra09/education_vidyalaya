'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Navigation } from '@/components/layout/navigation'
import { Footer } from '@/components/layout/footer'
import { useChatContext } from '@/contexts/chat-context'
import { useCurrentUser } from '@/hooks/use-users'
import { chatApi } from '@/lib/api/chat.api'
import { ConversationList } from '@/components/chat/ConversationList'
import { NewChatModal } from '@/components/chat/NewChatModal'
import { DMChatArea } from '@/components/chat/DMChatArea'
import { MessageCircle, ArrowLeft, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function ChatPage() {
  const { user, isLoaded } = useUser()
  const { data: currentUserData } = useCurrentUser()
  const currentDbUserId = currentUserData?.user?.id
  const { channels, isLoading, refetchChannels, activeChannelId, setActiveChannelId, onlineUserIds, markAsRead } = useChatContext()
  const [showNewChat, setShowNewChat] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [isCreatingDM, setIsCreatingDM] = useState(false)

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveChannelId(channelId)
    setMobileShowChat(true)
    void markAsRead(channelId)
  }, [setActiveChannelId, markAsRead])

  const handleNewChatUser = useCallback(async (targetUserId: string) => {
    setIsCreatingDM(true)
    try {
      const channel = await chatApi.getOrCreateDM(targetUserId)
      setShowNewChat(false)
      setActiveChannelId(channel.id)
      setMobileShowChat(true)
      void refetchChannels()
    } catch (err) {
      console.error('Failed to create DM channel:', err)
    } finally {
      setIsCreatingDM(false)
    }
  }, [setActiveChannelId, refetchChannels])

  const handleBackToList = useCallback(() => {
    setMobileShowChat(false)
  }, [])

  // Get the other user's name for the active channel header
  const activeChannel = channels.find((c) => c.id === activeChannelId)
  const otherMember = activeChannel?.members?.find((m) => m.user?.id !== currentDbUserId)
  const activeChannelName = otherMember?.user?.name || activeChannel?.name || 'Chat'
  const activeChannelAvatar = otherMember?.user?.avatar

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/50">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 border-[2.5px] border-gray-200 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/50">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-6">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10">
              <MessageCircle className="h-10 w-10 text-primary/40" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to chat</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              You need to be signed in to send and receive messages on We.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30">
      <Navigation />

      <main className="flex-1 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page header */}
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Messages</h1>
              <p className="text-[13px] text-gray-500">Chat privately with anyone on We</p>
            </div>
          </div>
        </div>

        {/* Chat container */}
        <div
          className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/50"
          style={{ height: 'calc(100vh - 14rem)' }}
        >
          <div className="flex h-full">
            {/* Left sidebar — Conversation list */}
            <div
              className={`
                w-full md:w-[340px] lg:w-[380px] border-r border-gray-100 flex-shrink-0
                ${mobileShowChat ? 'hidden md:flex' : 'flex'}
                flex-col bg-gray-50/50
              `}
            >
              <ConversationList
                channels={channels}
                currentUserId={currentDbUserId}
                activeChannelId={activeChannelId}
                onSelectChannel={handleSelectChannel}
                onNewChat={() => setShowNewChat(true)}
                isLoading={isLoading}
                onlineUserIds={onlineUserIds}
              />
            </div>

            {/* Right panel — Chat area */}
            <div
              className={`
                flex-1 flex flex-col min-w-0 bg-white
                ${!mobileShowChat ? 'hidden md:flex' : 'flex'}
              `}
            >
              {activeChannelId ? (
                <>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white">
                    <button
                      onClick={handleBackToList}
                      className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                      <AvatarImage src={activeChannelAvatar || undefined} alt={activeChannelName} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/70 to-secondary/70 text-white text-xs font-bold">
                        {(activeChannelName?.charAt(0) || '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-gray-900 truncate">{activeChannelName}</h3>
                      <p className="text-[11px] text-gray-400">Direct message</p>
                    </div>
                    {(() => {
                      const otherUserId = otherMember?.user?.id
                      const isOtherOnline = otherUserId ? onlineUserIds.has(otherUserId) : false
                      return isOtherOnline ? (
                        <div className="flex h-6 items-center rounded-full bg-emerald-50 px-2.5 text-[10px] font-semibold text-emerald-600">
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </div>
                      ) : (
                        <div className="flex h-6 items-center rounded-full bg-gray-100 px-2.5 text-[10px] font-semibold text-gray-400">
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-gray-400" />
                          Offline
                        </div>
                      )
                    })()}
                  </div>

                  {/* DM Chat area */}
                  <div className="flex-1 min-h-0">
                    <DMChatArea
                      channelId={activeChannelId}
                      currentUserDbId={currentDbUserId}
                      otherUserName={activeChannelName || 'Chat'}
                      otherUserAvatar={activeChannelAvatar}
                      otherUserLastReadAt={otherMember?.lastReadAt}
                    />
                  </div>
                </>
              ) : (
                /* Empty state */
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50/50 to-primary/[0.02]">
                  <div className="text-center max-w-md px-8">
                    <div className="relative mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
                      <div className="relative flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 ring-1 ring-primary/5">
                        <MessageCircle className="h-11 w-11 text-primary/40" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">
                      Your Messages
                    </h3>
                    <p className="text-[13px] text-gray-500 mb-7 leading-relaxed">
                      Send private messages to anyone on We. Collaborate, learn, and connect with peers around the world.
                    </p>
                    <button
                      onClick={() => setShowNewChat(true)}
                      className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 px-6 py-3 text-[13px] font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Sparkles className="h-4 w-4" />
                      Start a conversation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* New chat modal */}
      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onSelectUser={handleNewChatUser}
        isCreating={isCreatingDM}
      />
    </div>
  )
}
