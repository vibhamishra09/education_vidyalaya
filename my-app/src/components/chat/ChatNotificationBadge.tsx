"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useChatContext } from "@/contexts/chat-context";

export function ChatNotificationBadge() {
  const { unreadCount } = useChatContext();

  return (
    <Link
      href="/chat"
      className="relative p-2 hover:bg-muted rounded-full transition-colors shrink-0"
      aria-label={`Chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Link>
  );
}
