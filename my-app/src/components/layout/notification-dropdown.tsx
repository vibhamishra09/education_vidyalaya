"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationContext } from "@/contexts/notification-context";
import { getNotificationLink } from "@/lib/utils/notification-links";

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading: loading, isLoadingMore, hasMore, error, markAsRead, loadMoreNotifications } = useNotificationContext();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);


  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 hover:bg-muted rounded-full transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-80 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Notifications</CardTitle>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading notifications...
                        </div>
                      </div>
                    ) : error ? (
                      <div className="px-4 py-8 text-center text-sm text-destructive">
                        {error}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <Link
                          key={notification.id}
                          href={getNotificationLink(notification)}
                          onClick={() => {
                            setIsOpen(false);
                            if (!notification.viewed) {
                              markAsRead(notification.id);
                            }
                          }}
                        >
                          <div
                            className={`px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                              !notification.viewed ? "bg-muted/30" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Bell
                                className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                                  notification.notifType === "URGENT"
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm ${
                                    !notification.viewed ? "font-medium" : ""
                                  }`}
                                >
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(
                                    notification.createdAt
                                  ).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              {!notification.viewed && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="px-4 py-3 border-t space-y-2">
                      {hasMore && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={loadMoreNotifications}
                          disabled={isLoadingMore}
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            "Load More"
                          )}
                        </Button>
                      )}
                      <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full">
                          View All Notifications
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
