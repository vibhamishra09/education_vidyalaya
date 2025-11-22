"use client";

import { MessageSquare, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MessagingPlaceholder() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Coming Soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">Chat Integration Coming Soon</p>
          <p className="text-xs">
            Stay connected with your peers through real-time messaging
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function VideoPlaceholder() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Sessions
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Coming Soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">Video Integration via Jitsi</p>
          <p className="text-xs">
            Join live video sessions directly from your dashboard
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
