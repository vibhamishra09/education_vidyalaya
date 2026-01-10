"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Play, Loader2, Star } from "lucide-react";
import { motion } from "framer-motion";
import { ShareButton } from "@/components/share/share-button";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";

interface StudyRoomCardProps {
  roomId: string;
  status: "live" | "scheduled";
  category?: string;
  title: string;
  description?: string;
  participants?: {
    current: number;
    max: number;
  };
  host?: {
    name: string;
    avatar?: string;
    rating?: number;
    reviewCount?: number;
  };
  actionLabel?: string;
  actionVariant?: ButtonVariant;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
}

export function StudyRoomCard({
  roomId,
  status,
  category = "General",
  title,
  description = "",
  participants,
  host,
  actionLabel,
  actionVariant,
  onAction,
  actionDisabled = false,
  actionLoading = false,
}: StudyRoomCardProps) {
  const statusIsLive = status === "live";
  const categoryLabel = category || "General";
  const participantCurrent = participants?.current ?? 0;
  const participantMax = participants?.max ?? 0;
  const hostInitial = host?.name?.charAt(0) || "U";
  const hasHostRating = typeof host?.rating === "number" && (host?.reviewCount ?? 0) > 0;
  const statusLabel = statusIsLive ? "Live" : "Upcoming";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col bg-background/50 backdrop-blur-sm ring-1 ring-black/5 shadow-sm transition-all duration-200 hover:shadow-lg hover:ring-black/10">
        {/* Header with status badge and category */}
        <div className="relative flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4 sm:px-6 sm:py-5">
          <Badge
            variant={statusIsLive ? "default" : "secondary"}
            className={cn(
              "flex items-center gap-1 shadow-sm whitespace-nowrap",
              statusIsLive && "animate-pulse"
            )}
          >
            {statusLabel}
          </Badge>
          <Badge variant="outline" className="text-xs whitespace-nowrap">{categoryLabel}</Badge>
        </div>

        {/* Main content */}
        <CardContent className="flex-1 flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5">
          {/* Title and description */}
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg leading-snug line-clamp-2 text-foreground">{title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {description || "No description provided."}
            </p>
          </div>

          {/* Host info section */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-1 ring-black/10">
                <AvatarImage src={host?.avatar} />
                <AvatarFallback className="font-semibold">{hostInitial}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold leading-tight text-foreground">
                  {host?.name || "Unknown Host"}
                </span>
                {hasHostRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-foreground">{host?.rating?.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {participantCurrent}/{participantMax}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <ShareButton
              url={`${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || ""}/studyroom/${roomId}`}
              title={title}
              description={description}
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg text-xs"
            />
            <Button
              type="button"
              className="flex-1 rounded-lg text-xs font-semibold"
              variant={actionVariant ?? (statusIsLive ? "default" : "outline")}
              size="sm"
              onClick={onAction}
              disabled={actionDisabled || actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Working...
                </>
              ) : actionLabel ? (
                actionLabel
              ) : statusIsLive ? (
                <>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Join Live
                </>
              ) : (
                "Register"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
