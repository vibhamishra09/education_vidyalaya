"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, ArrowLeft, ChevronUp, ChevronDown, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
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

  const [expanded, setExpanded] = useState(false);
  const { data: currentUserData } = useCurrentUser();
  const currentDbUserId = currentUserData?.user?.id;
  const currentUserName = currentUserData?.user?.name || "Me";
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

  const toggleExpanded = () => {
    requireAuth(() => {
      setExpanded(!expanded);
      if (expanded) {
        setPopupChannelId(null); // Reset when collapsing
      }
    });
  };

  const handleNewChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth(() => {
      router.push('/chat'); // Fallback to full chat page to search users
    });
  };

  return (
    <>
      {/* ─── Floating "Create Study Room" Button ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-24 right-4 md:right-10 z-40"
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50/80"
            onClick={handleCreateRoom}
            aria-label="Create study room"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </motion.div>
      </motion.div>

      {/* ─── LinkedIn-style Sticky Messaging Widget ─── */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
        className="fixed bottom-0 right-4 md:right-10 z-50 w-[300px] md:w-[320px] bg-white rounded-t-xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)] border-t border-l border-r border-gray-200 flex flex-col overflow-hidden"
      >
        {/* Header Bar */}
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-3 px-4 h-12 md:h-14 bg-white hover:bg-gray-50 transition-colors w-full border-b border-gray-100"
        >
          <div className="relative flex-shrink-0">
            <Avatar className="h-7 w-7 md:h-8 md:w-8 ring-2 ring-white shadow-sm">
              <AvatarImage src={currentUserData?.user?.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/70 to-secondary/70 text-white text-[10px] font-bold">
                {currentUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white"></div>
          </div>

          <span className="flex-1 text-left font-semibold text-[14px] md:text-[15px] text-gray-900">Messaging</span>

          <div className="flex items-center gap-1 flex-shrink-0">
            {unreadCount > 0 && !expanded && (
              <Badge variant="destructive" className="h-[18px] min-w-[18px] flex items-center justify-center p-0 px-1 text-[10px]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}

            {/* <div 
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 rounded-md transition-colors"
              onClick={handleNewChat}
            >
              <Edit className="h-[15px] w-[15px]" />
            </div> */}
            <div className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 rounded-md transition-colors">
              {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </div>
          </div>
        </button>

        {/* Expandable Content Area */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "min(500px, 60vh)", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="flex flex-col bg-white overflow-hidden"
            >
              {popupChannelId && activePopupChannel ? (
                /* ─── Inline DM View ─── */
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2.5 px-3 py-2 border-b border-gray-100 bg-white flex-shrink-0">
                    <button
                      onClick={handleBackToList}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 flex-shrink-0"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <Avatar className="h-7 w-7 ring-1 ring-white shadow-sm flex-shrink-0">
                      <AvatarImage src={popupChannelAvatar || undefined} alt={popupChannelName} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/70 to-secondary/70 text-white text-[10px] font-bold">
                        {(popupChannelName?.charAt(0) || '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[12px] font-semibold text-gray-900 truncate">{popupChannelName}</h4>
                      <p className={`text-[9px] ${isPopupUserOnline ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {isPopupUserOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[9px] text-primary hover:text-primary hover:bg-primary/5 rounded-lg"
                      onClick={() => {
                        setActiveChannelId(popupChannelId);
                        router.push("/chat");
                        setExpanded(false);
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Full
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 bg-gray-50/30">
                    <DMChatArea
                      channelId={popupChannelId}
                      currentUserDbId={currentDbUserId}
                      otherUserName={popupChannelName}
                      otherUserAvatar={popupChannelAvatar}
                      otherUserLastReadAt={otherPopupMember?.lastReadAt}
                    />
                  </div>
                </div>
              ) : (
                /* ─── Conversation List View ─── */
                <>
                  <div className="flex-1 overflow-hidden flex flex-col border-b border-gray-100">
                    <ConversationList
                      channels={channels}
                      currentUserId={currentDbUserId}
                      activeChannelId={activeChannelId}
                      onSelectChannel={handleSelectPopupChannel}
                      onNewChat={() => {
                        router.push("/chat");
                        setExpanded(false);
                      }}
                      isLoading={isLoading}
                      onlineUserIds={onlineUserIds}
                    />
                  </div>
                  <div className="p-2.5 bg-gray-50/50">
                    <Button
                      variant="outline"
                      className="w-full justify-center flex items-center gap-2 text-[12px] font-semibold text-primary hover:text-primary hover:bg-primary/5 rounded-xl h-9 border-primary/20 hover:border-primary/40 bg-white"
                      onClick={() => {
                        router.push("/chat");
                        setExpanded(false);
                      }}
                    >
                      Go to full chat page <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
