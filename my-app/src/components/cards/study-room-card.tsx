"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Play, Loader2, Star } from "lucide-react";
import { motion } from "framer-motion";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";

interface StudyRoomCardProps {
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
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge
              variant={statusIsLive ? "default" : "secondary"}
              className={
                statusIsLive
                  ? "bg-red-500 hover:bg-red-600 animate-pulse flex items-center gap-1"
                  : ""
              }
            >
              {statusIsLive && (
                <span className="inline-block w-2 h-2 rounded-full bg-white mr-1" />
              )}
              {statusLabel}
            </Badge>
            <Badge variant="outline">{categoryLabel}</Badge>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">{title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 font-tagline">
              {description || "No description provided."}
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-end space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                {participantCurrent}/{participantMax}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={host?.avatar} />
                  <AvatarFallback>{hostInitial}</AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground text-xs sm:text-sm font-medium max-w-[120px] truncate">
                  {host?.name || "Unknown Host"}
                </span>
              </div>
              {hasHostRating && (
                <div className="flex items-center gap-1 text-amber-600 text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{host?.rating?.toFixed(1)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    ({host?.reviewCount})
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            variant={actionVariant ?? (statusIsLive ? "default" : "outline")}
            onClick={onAction}
            disabled={actionDisabled || actionLoading}
          >
            {actionLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Working...
              </>
            ) : actionLabel ? (
              actionLabel
            ) : statusIsLive ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Join Live
              </>
            ) : (
              "Register"
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
