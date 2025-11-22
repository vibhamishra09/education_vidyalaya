"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, AlertCircle, CheckCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks";

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getPermissionBadge = () => {
    switch (permission) {
      case "granted":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Granted
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Denied
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Not Set
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription className="mt-2">
              Receive real-time notifications for sessions, reviews, and reminders
            </CardDescription>
          </div>
          {getPermissionBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === "denied" && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Notifications Blocked</h4>
                <p className="text-xs text-muted-foreground">
                  You have blocked notifications for this site. To enable them, please update your browser settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {isSubscribed ? "Notifications Enabled" : "Notifications Disabled"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSubscribed
                  ? "You will receive push notifications"
                  : "Enable to receive real-time updates"}
              </p>
            </div>
            {isSubscribed ? (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {permission !== "denied" && (
            <Button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isLoading}
              variant={isSubscribed ? "outline" : "default"}
              className="w-full"
            >
              {isLoading
                ? isSubscribed
                  ? "Disabling..."
                  : "Enabling..."
                : isSubscribed
                  ? "Disable Notifications"
                  : "Enable Notifications"}
            </Button>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-medium">You will be notified about:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 pl-4">
            <li>• New session requests (urgent)</li>
            <li>• Session acceptances and cancellations</li>
            <li>• Session reminders (24h and 1h before)</li>
            <li>• Review reminders after completed sessions</li>
            <li>• New reviews received</li>
            <li>• Study room updates</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
