"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox, CheckCircle2 } from "lucide-react";
import { useNotificationContext } from "@/contexts/notification-context";
import { getNotificationLink } from "@/lib/utils/notification-links";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/api.types";

export default function NotificationsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
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
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Notifications Center</CardTitle>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "You're all caught up"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={allVisibleSelected ? "default" : "outline"} size="sm" disabled={notifications.length === 0} onClick={selectAll}>
              {allVisibleSelected ? "All Selected" : "Select All"}
            </Button>
            <Button variant="outline" size="sm" disabled={notifications.length === 0} onClick={selectUnread}>
              Select Unread
            </Button>
            <Button variant="ghost" size="sm" disabled={!hasSelection} onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
        {hasSelection && (
          <div className="text-xs sm:text-sm text-muted-foreground">
            {selectedIds.size} selected · {selectedUnreadIds.length} unread selected
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Fetching notifications..." : `${notifications.length} shown`}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={selectedUnreadIds.length === 0 || bulkLoading}
              onClick={handleBulkMarkRead}
            >
              {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Selected as Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!unreadCount || markAllLoading}
              onClick={handleMarkAll}
            >
              {markAllLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark All as Read
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading notifications...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {showEmptyState && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted p-10 text-center">
            <Inbox className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No notifications yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll keep this space updated whenever something needs your attention.
            </p>
          </div>
        )}

        <div className="space-y-4">
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
            className="w-full"
            onClick={loadMoreNotifications}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading more
              </>
            ) : (
              "Load More"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
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

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-4 transition-colors md:flex-row md:items-center",
        notification.viewed ? "bg-background" : "bg-muted/40 border-primary/40"
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 cursor-pointer rounded border border-muted-foreground bg-background accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Select notification"
          checked={isSelected}
          onChange={onToggleSelect}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={notification.notifType === "URGENT" ? "destructive" : "outline"}>
              {notification.notifType === "URGENT" ? "Urgent" : "Update"}
            </Badge>
            {!notification.viewed && (
              <Badge variant="secondary" className="uppercase text-[10px]">
                Unread
              </Badge>
            )}
          </div>
          <div className={cn("text-sm sm:text-base", !notification.viewed && "font-semibold")}>
            {notification.message}
          </div>
          <div className="text-xs text-muted-foreground">{formattedDate}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={notificationLink}
            onClick={() => {
              if (!notification.viewed) {
                void onMarkRead();
              }
            }}
          >
            View details
          </Link>
        </Button>
        {!notification.viewed ? (
          <Button size="sm" variant="outline" onClick={() => void onMarkRead()}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark as Read
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Read</span>
        )}
      </div>
    </div>
  );
}

