"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Share2, Play, Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { ShareButton } from "@/components/share/share-button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date-time";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";

interface StudyRoomCardProps {
  roomId: string;
  status: "live" | "scheduled";
  category?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  date?: Date | string;
  duration?: number;
  participants?: {
    current: number;
    max: number;
  };
  host?: {
    id?: string;
    name: string;
    avatar?: string;
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
  description,
  imageUrl,
  date,
  duration,
  participants,
  host,
  actionLabel,
  actionVariant,
  onAction,
  actionDisabled = false,
  actionLoading = false,
}: StudyRoomCardProps) {
  const router = useRouter();
  const statusIsLive = status === "live";
  const participantCurrent = participants?.current ?? 0;
  const participantMax = participants?.max ?? 0;
  const hostInitial = host?.name?.charAt(0) || "U";

  // Format date/time if available
  const formattedDateTime = date ? formatDate(date, "datetime") : null;

  // Dynamic Theme Colors based on Status
  const theme = statusIsLive
    ? {
        border: "border-red-200 dark:border-red-900",
        hoverBorder: "hover:border-red-300 dark:hover:border-red-800",
        gradient: "from-card to-red-50/50 dark:to-red-950/20",
        badge: "bg-red-500/10 text-red-700 border border-red-500/20 dark:text-red-400",
        titleHover: "group-hover:text-red-700 dark:group-hover:text-red-400",
        avatarBorder: "border-red-200 dark:border-red-900",
        avatarFallback: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        // Glassy Red Style matching the "Join 2,000+" structure but in Red
        button: "bg-red-500/10 text-red-700 hover:bg-red-500/20 border border-red-500/20 dark:text-red-400 shadow-sm",
        iconColor: "text-red-600 dark:text-red-400"
      }
    : {
        border: "border-green-200 dark:border-green-900",
        hoverBorder: "hover:border-green-300 dark:hover:border-green-800",
        gradient: "from-card to-green-50/50 dark:to-green-950/20",
        badge: "bg-green-500/10 text-green-700 border border-green-500/20 dark:text-green-400",
        titleHover: "group-hover:text-green-700 dark:group-hover:text-green-400",
        avatarBorder: "border-green-200 dark:border-green-900",
        avatarFallback: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
        // Exact match for "Join 2,000+" style (Green-500 glassy)
        button: "bg-green-500/10 text-green-700 hover:bg-green-500/20 border border-green-500/20 dark:text-green-400 shadow-sm",
        iconColor: "text-green-600 dark:text-green-400"
      };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="h-full group"
    >
      <Card className={cn(
        "h-full flex flex-col p-4 bg-gradient-to-br transition-all duration-300 border shadow-sm hover:shadow-lg",
        theme.gradient,
        theme.border,
        theme.hoverBorder
      )}>
        
        {/* Header: Category Badge & Status */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className={cn(
            "text-xs font-bold px-2 py-0.5 transition-colors uppercase tracking-wider rounded-lg border-0",
            theme.badge
          )}>
            {category}
          </Badge>
          
          <div className={cn("flex items-center gap-2", theme.iconColor)}>
            <span className="relative flex h-2 w-2">
              {statusIsLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
              <span className={cn("relative inline-flex rounded-full h-2 w-2", statusIsLive ? "bg-red-500" : "bg-emerald-500")}></span>
            </span>
            <span className="text-[11px] font-extrabold tracking-widest uppercase">
              {statusIsLive ? "LIVE" : "SCHEDULED"}
            </span>
          </div>
        </div>

        {/* Main Content: Title & Description */}
        <div className="flex-1 space-y-1.5 mb-4">
          <h3
            className={cn("text-2xl font-bold leading-tight text-foreground tracking-tight transition-colors line-clamp-2 cursor-pointer", theme.titleHover)}
            onClick={() => router.push(`/studyroom/${roomId}`)}
          >
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-1">
              {description}
            </p>
          )}
          {/* Date & Time Display */}
          {formattedDateTime && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 bg-secondary/30 px-2.5 py-1 rounded-md border border-secondary/50">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {formattedDateTime}
                </span>
              </div>
              {duration && (
                <div className="flex items-center gap-1.5 bg-secondary/30 px-2.5 py-1 rounded-md border border-secondary/50">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {duration} min
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Host, Participants & Actions */}
        <div className="flex flex-wrap gap-y-3 items-center justify-between pt-3 border-t border-dashed border-border/60 mt-auto">
          
          {/* Host & Participant Info */}
          <div className="flex flex-col gap-1.5">
             {/* Host */}
            <div className="flex items-center gap-2">
              <Avatar
                className={cn("h-7 w-7 border transition-colors", theme.avatarBorder, host?.id && "cursor-pointer")}
                onClick={() => {
                  if (host?.id) {
                    router.push(`/profile/${host.id}`);
                  }
                }}
              >
                <AvatarImage src={host?.avatar} />
                <AvatarFallback className={cn("text-xs font-bold", theme.avatarFallback)}>
                    {hostInitial}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn("text-sm font-semibold text-muted-foreground truncate max-w-[100px]", host?.id && "cursor-pointer")}
                onClick={() => {
                  if (host?.id) {
                    router.push(`/profile/${host.id}`);
                  }
                }}
              >
                {host?.name}
              </span>
            </div>
             
             {/* Participants */}
             {participants && (
                <div className="flex items-center gap-1.5 text-muted-foreground/80">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold tabular-nums">
                    {participantCurrent}/{participantMax} joined
                  </span>
                </div>
             )}
          </div>

          {/* Actions: Share & CTA Button */}
          <div className="flex items-center gap-2">
             <ShareButton
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/studyroom/${roomId}`}
                title={title}
                description={description}
                image={imageUrl}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
             />
            
            <Button
              className={cn(
                "h-9 pl-3 pr-4 text-xs font-bold rounded-full shadow-md transition-all",
                actionVariant ? "" : theme.button
              )}
              variant={actionVariant || "default"}
              onClick={onAction}
              disabled={actionDisabled || actionLoading}
            >
              {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : statusIsLive ? (
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
              ) : (
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
              )}
              {actionLoading ? "Wait" : (actionLabel || (statusIsLive ? "Join" : "View"))}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}