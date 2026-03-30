"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox, CheckCircle2 } from "lucide-react";
import { useNotificationContext } from "@/contexts/notification-context";
import { getNotificationLink } from "@/lib/utils/notification-links";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/api.types";

export function NotificationsClient() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/5">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-5xl">
        <NotificationsContent />
      </main>
      <Footer />
    </div>
  );
}

function NotificationsContent() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    markNotificationsAsRead,
  } = useNotificationContext();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);

  // Remove selections when notifications fall out of the current list
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      notifications.forEach((notification) => {
        if (prev.has(notification.id)) {
          next.add(notification.id);
        }
      });
      return next;
    });
  }, [notifications]);

  const selectedUnreadIds = useMemo(
    () =>
      notifications
        .filter((notification) => selectedIds.has(notification.id) && !notification.viewed)
        .map((notification) => notification.id),
    [notifications, selectedIds]
  );

  const allVisibleSelected = notifications.length > 0 && selectedIds.size === notifications.length;
  const hasSelection = selectedIds.size > 0;

  const toggleSelection = (notificationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(notifications.map((n) => n.id)));
  const selectUnread = () => setSelectedIds(new Set(notifications.filter((n) => !n.viewed).map((n) => n.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkMarkRead = async () => {
    if (selectedUnreadIds.length === 0) return;
    try {
      setBulkLoading(true);
      await markNotificationsAsRead(selectedUnreadIds);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectedUnreadIds.forEach((id) => next.delete(id));
        return next;
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleMarkAll = async () => {
    if (!unreadCount) return;
    try {
      setMarkAllLoading(true);
      await markAllAsRead();
      setSelectedIds(new Set());
    } finally {
      setMarkAllLoading(false);
    }
  };

  const handleSingleMark = async (notificationId: string) => {
    await markAsRead(notificationId);
    setSelectedIds((prev) => {
      if (!prev.has(notificationId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(notificationId);
      return next;
    });
  };

  const showEmptyState = !isLoading && notifications.length === 0 && !error;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-foreground">
            Notifications Center
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` 
              : "You're all caught up with your updates"}
          </p>
        </div>
        
        {/* Bulk Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2 bg-background/60 backdrop-blur-sm p-1.5 rounded-2xl border border-border/40 shadow-sm">
           <Button 
             variant={allVisibleSelected ? "default" : "ghost"} 
             size="sm" 
             className={cn("h-8 rounded-xl text-xs font-medium", allVisibleSelected ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "")}
             disabled={notifications.length === 0} 
             onClick={selectAll}
           >
             All
           </Button>
           <Button 
             variant="ghost" 
             size="sm" 
             className="h-8 rounded-xl text-xs font-medium hover:bg-emerald-50 hover:text-emerald-700"
             disabled={notifications.length === 0} 
             onClick={selectUnread}
           >
             Unread
           </Button>
           {hasSelection && (
             <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive"
                onClick={clearSelection}
             >
               Clear ({selectedIds.size})
             </Button>
           )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-border/60">
        <div className="text-sm font-medium text-muted-foreground">
          {isLoading ? (
             <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Syncing...</span>
             </div>
          ) : (
             <span>{notifications.length} notifications</span>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-emerald-200/50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300/50 transition-all text-xs"
            disabled={selectedUnreadIds.length === 0 || bulkLoading}
            onClick={handleBulkMarkRead}
          >
            {bulkLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Mark Selected Read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-xl text-xs hover:bg-emerald-50 hover:text-emerald-700 transition-all"
            disabled={!unreadCount || markAllLoading}
            onClick={handleMarkAll}
          >
            {markAllLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Mark All Read
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          {error}
        </div>
      )}

      {showEmptyState && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-white/50 p-12 text-center min-h-[300px]">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100/50 flex items-center justify-center mb-4">
             <Inbox className="h-8 w-8 text-emerald-600/50" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No notifications yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            We&apos;ll keep this space updated whenever something needs your attention.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            isSelected={selectedIds.has(notification.id)}
            onToggleSelect={() => toggleSelection(notification.id)}
            onMarkRead={() => handleSingleMark(notification.id)}
          />
        ))}
      </div>

      {hasMore && (
        <Button
          variant="outline"
          className="w-full h-11 rounded-2xl border-dashed border-border hover:bg-muted/50 text-muted-foreground"
          onClick={loadMoreNotifications}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more
            </>
          ) : (
            "Load More History"
          )}
        </Button>
      )}
    </div>
  );
}

interface NotificationRowProps {
  notification: Notification;
  isSelected: boolean;
  onToggleSelect: () => void;
  onMarkRead: () => Promise<void>;
}

function NotificationRow({ notification, isSelected, onToggleSelect, onMarkRead }: NotificationRowProps) {
  const formattedDate = new Date(notification.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const notificationLink = getNotificationLink(notification);
  const isUnread = !notification.viewed;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl p-4 transition-all duration-300 md:flex-row md:items-center border",
        isUnread
          ? "bg-gradient-to-r from-emerald-50/40 to-white/60 border-emerald-100/60 shadow-sm hover:shadow-md hover:border-emerald-200/60"
          : "bg-white/40 border-transparent hover:border-border/40 hover:bg-white/60"
      )}
    >
        {isUnread && (
            <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-emerald-500" />
        )}

      <div className="flex flex-1 items-start gap-4 pl-2">
        <div className="pt-1">
            <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded border-muted-foreground/30 bg-transparent text-emerald-600 focus:ring-emerald-500/20"
            aria-label="Select notification"
            checked={isSelected}
            onChange={onToggleSelect}
            />
        </div>
        
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge 
                variant={notification.notifType === "URGENT" ? "destructive" : "secondary"}
                className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    notification.notifType !== "URGENT" && "bg-emerald-100/50 text-emerald-700"
                )}
            >
              {notification.notifType === "URGENT" ? "Urgent" : "Update"}
            </Badge>
            {isUnread && (
              <Badge variant="outline" className="border-emerald-200 text-emerald-600 text-[10px] uppercase tracking-wider bg-emerald-50/50">
                New
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto sm:ml-0 font-medium tracking-tight bg-background/50 px-2 py-0.5 rounded-full border border-border/50">
                {formattedDate}
            </span>
          </div>
          
          <div className={cn("text-sm sm:text-base leading-relaxed pr-4", isUnread ? "font-semibold text-foreground" : "text-muted-foreground/90")}>
            {notification.message}
          </div>
        </div>
      </div>
      
      <div className="flex flex-row items-center gap-2 pl-10 md:pl-0">
        <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 text-xs font-semibold"
            asChild
        >
          <Link
            href={notificationLink}
            onClick={() => {
              if (isUnread) {
                void onMarkRead();
              }
            }}
          >
            View Details
          </Link>
        </Button>
        {isUnread && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => void onMarkRead()}
            className="h-8 w-8 p-0 rounded-full hover:bg-emerald-50 text-emerald-600"
            title="Mark as read"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

