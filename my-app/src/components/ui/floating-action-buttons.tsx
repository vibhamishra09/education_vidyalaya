"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, ExternalLink, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ConversationList } from "@/components/chat/ConversationList";
import { DMChatArea } from "@/components/chat/DMChatArea";
import { useChatContext } from "@/contexts/chat-context";
import { useCurrentUser } from "@/hooks/use-users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function FloatingActionButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const requireAuth = useRequireAuth();
  
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { data: currentUserData } = useCurrentUser();
  const currentDbUserId = currentUserData?.user?.id;
  const { channels, isLoading, activeChannelId, setActiveChannelId, onlineUserIds, unreadCount, markAsRead } = useChatContext();

  // Track which channel is open inside the popup (separate from the global activeChannelId)
  const [popupChannelId, setPopupChannelId] = useState<string | null>(null);

  // Avoid hydration-pathname flicker on initial mount.
  if (!pathname) {
    return null;
  }

  // Hide on video/webinar routes
  const isVideoCallRoute = pathname?.includes('/rooms/') || 
                          pathname?.includes('/sessions/') || 
                          pathname?.includes('/studyroom/') ||
                          pathname?.startsWith('/webinar/');

  if (isVideoCallRoute) {
    return null;
  }

  const handleCreateRoom = () => {
    requireAuth(() => {
      router.push("/create-study-room");
    });
  };

  // Get info for the active popup channel
  const activePopupChannel = popupChannelId ? channels.find((c) => c.id === popupChannelId) : null;
  const otherPopupMember = activePopupChannel?.members?.find((m) => m.user?.id !== currentDbUserId);
  const popupChannelName = otherPopupMember?.user?.name || activePopupChannel?.name || 'Chat';
  const popupChannelAvatar = otherPopupMember?.user?.avatar;
  const otherPopupUserId = otherPopupMember?.user?.id;
  const isPopupUserOnline = otherPopupUserId ? onlineUserIds.has(otherPopupUserId) : false;

  const handleSelectPopupChannel = (channelId: string) => {
    setPopupChannelId(channelId);
    void markAsRead(channelId);
  };

  const handleBackToList = () => {
    setPopupChannelId(null);
  };

  const handlePopoverChange = (open: boolean) => {
    if (open) {
      requireAuth(() => setPopoverOpen(true));
    } else {
      setPopoverOpen(false);
      // Reset to list view when closing
      setPopupChannelId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-20 right-6 md:bottom-10 z-50 flex flex-col gap-4 items-center"
    >
      <Popover 
        open={popoverOpen} 
        onOpenChange={handlePopoverChange}
      >
        <PopoverTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative"
          >
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50/80"
              aria-label="Messages"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] pointer-events-none"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </motion.div>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="end" 
          sideOffset={16}
          className="w-[340px] md:w-[380px] h-[500px] p-0 flex flex-col mb-2 overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/50"
        >
          {popupChannelId && activePopupChannel ? (
            /* ─── Inline chat view ─────────────────────────────── */
            <div className="flex flex-col h-full">
              {/* Mini chat header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                <button
                  onClick={handleBackToList}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 flex-shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <Avatar className="h-8 w-8 ring-1 ring-white shadow-sm flex-shrink-0">
                  <AvatarImage src={popupChannelAvatar || undefined} alt={popupChannelName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/70 to-secondary/70 text-white text-[11px] font-bold">
                    {(popupChannelName?.charAt(0) || '?').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[13px] font-semibold text-gray-900 truncate">{popupChannelName}</h4>
                  <p className={`text-[10px] ${isPopupUserOnline ? 'text-emerald-500' : 'text-gray-400'}`}>
                    {isPopupUserOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/5 rounded-lg"
                  onClick={() => {
                    setActiveChannelId(popupChannelId);
                    router.push("/chat");
                    setPopoverOpen(false);
                    setPopupChannelId(null);
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Full
                </Button>
              </div>
              {/* Chat area */}
              <div className="flex-1 min-h-0">
                <DMChatArea
                  channelId={popupChannelId}
                  currentUserDbId={currentDbUserId}
                  otherUserName={popupChannelName}
                  otherUserAvatar={popupChannelAvatar}
                />
              </div>
            </div>
          ) : (
            /* ─── Conversation list view ───────────────────────── */
            <>
              <div className="flex-1 overflow-hidden flex flex-col border-b border-gray-100">
                <ConversationList
                  channels={channels}
                  currentUserId={currentDbUserId}
                  activeChannelId={activeChannelId}
                  onSelectChannel={handleSelectPopupChannel}
                  onNewChat={() => {
                    router.push("/chat");
                    setPopoverOpen(false);
                  }}
                  isLoading={isLoading}
                  onlineUserIds={onlineUserIds}
                />
              </div>
              <div className="p-3 bg-gray-50/50">
                <Button 
                  variant="outline" 
                  className="w-full justify-center flex items-center gap-2 text-[13px] font-semibold text-primary hover:text-primary hover:bg-primary/5 rounded-xl h-10 border-primary/20 hover:border-primary/40 bg-white"
                  onClick={() => {
                    router.push("/chat");
                    setPopoverOpen(false);
                  }}
                >
                  Go to full chat page <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          onClick={handleCreateRoom}
          aria-label="Create study room"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
