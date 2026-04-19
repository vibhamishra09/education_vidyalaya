"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ConversationList } from "@/components/chat/ConversationList";
import { useChatContext } from "@/contexts/chat-context";
import { useCurrentUser } from "@/hooks/use-users";

export function FloatingActionButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const requireAuth = useRequireAuth();
  
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { data: currentUserData } = useCurrentUser();
  const currentDbUserId = currentUserData?.user?.id;
  const { channels, isLoading, activeChannelId, setActiveChannelId, onlineUserIds } = useChatContext();

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


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-20 right-6 md:bottom-10 z-50 flex flex-col gap-4 items-center"
    >
      <Popover 
        open={popoverOpen} 
        onOpenChange={(open) => {
          if (open) {
            requireAuth(() => setPopoverOpen(true));
          } else {
            setPopoverOpen(false);
          }
        }}
      >
        <PopoverTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50/80"
              aria-label="Messages"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="end" 
          sideOffset={16}
          className="w-[340px] md:w-[380px] h-[500px] p-0 flex flex-col mb-2 overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/50"
        >
          <div className="flex-1 overflow-hidden flex flex-col border-b border-gray-100">
            <ConversationList
              channels={channels}
              currentUserId={currentDbUserId}
              activeChannelId={activeChannelId}
              onSelectChannel={(channelId) => {
                setActiveChannelId(channelId);
                router.push("/chat");
                setPopoverOpen(false);
              }}
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
