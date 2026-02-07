"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Share2, Play, Calendar, Clock, Swords, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { ShareButton } from "@/components/share/share-button";
import { cn } from "@/lib/utils";
import { getRelativeTimeString } from "@/lib/utils/date-time";
import { DebateRoom, DebateStatus } from "@/types/debate.types";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";

interface DebateRoomCardProps {
  room: DebateRoom;
  actionLabel?: string;
  actionVariant?: ButtonVariant;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
}

export function DebateRoomCard({
  room,
  actionLabel,
  actionVariant,
  onAction,
  actionDisabled = false,
  actionLoading = false,
}: DebateRoomCardProps) {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  
  // Determine status
  const statusIsLive = room.status === DebateStatus.LIVE || room.status === DebateStatus.PREP;
  const statusIsEnded = room.status === DebateStatus.ENDED || room.status === DebateStatus.PROCESSED;
  
  // Calculate participant counts
  const forTeam = room.teams.find(t => t.side === 'FOR');
  const againstTeam = room.teams.find(t => t.side === 'AGAINST');
  const forCount = forTeam?.participants.filter(p => p.status === 'ACTIVE').length || 0;
  const againstCount = againstTeam?.participants.filter(p => p.status === 'ACTIVE').length || 0;
  const totalParticipants = forCount + againstCount;
  const maxParticipants = room.maxParticipants * 2;
  
  const hostInitial = room.host.name?.charAt(0) || "U";
  
  // Format date/time if available
  const formattedDateTime = room.scheduledAt ? getRelativeTimeString(room.scheduledAt) : null;
  
  // Get prize pool if configured (will be added in backend)
  const prizePool = (room as any).prizePool || null;

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
        button: "bg-red-500/10 text-red-700 hover:bg-red-500/20 border border-red-500/20 dark:text-red-400 shadow-sm",
        iconColor: "text-red-600 dark:text-red-400"
      }
    : statusIsEnded
    ? {
        border: "border-muted-foreground/20 dark:border-muted-foreground/40",
        hoverBorder: "hover:border-muted-foreground/30 dark:hover:border-muted-foreground/50",
        gradient: "from-card to-muted/20 dark:to-muted/10",
        badge: "bg-secondary text-muted-foreground border-border dark:bg-secondary/50",
        titleHover: "group-hover:text-muted-foreground",
        avatarBorder: "border-muted-foreground/20 dark:border-muted-foreground/40",
        avatarFallback: "bg-muted text-muted-foreground dark:bg-muted/50",
        button: "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border shadow-sm",
        iconColor: "text-muted-foreground"
      }
    : {
        border: "border-green-200 dark:border-green-900",
        hoverBorder: "hover:border-green-300 dark:hover:border-green-800",
        gradient: "from-card to-green-50/50 dark:to-green-950/20",
        badge: "bg-green-500/10 text-green-700 border border-green-500/20 dark:text-green-400",
        titleHover: "group-hover:text-green-700 dark:group-hover:text-green-400",
        avatarBorder: "border-green-200 dark:border-green-900",
        avatarFallback: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
        button: "bg-green-500/10 text-green-700 hover:bg-green-500/20 border border-green-500/20 dark:text-green-400 shadow-sm",
        iconColor: "text-green-600 dark:text-green-400"
      };

  const handleDefaultAction = () => {
    if (onAction) {
      onAction();
    } else {
      requireAuth(() => {
        router.push(`/debate-rooms/${room.id}`);
      });
    }
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
            <Swords className="h-3 w-3 mr-1" />
            Debate
          </Badge>
          
          <div className={cn("flex items-center gap-2", theme.iconColor)}>
            <span className="relative flex h-2 w-2">
              {statusIsLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                statusIsLive ? "bg-red-500" : statusIsEnded ? "bg-muted-foreground" : "bg-emerald-500"
              )}></span>
            </span>
            <span className="text-[11px] font-extrabold tracking-widest uppercase">
              {statusIsLive ? "LIVE" : statusIsEnded ? "ENDED" : "OPEN"}
            </span>
          </div>
        </div>

        {/* Main Content: Title & Description */}
        <div className="flex-1 space-y-1.5 mb-4">
          <h3 className={cn("text-2xl font-bold leading-tight text-foreground tracking-tight transition-colors line-clamp-2", theme.titleHover)}>
            {room.topic}
          </h3>
          {room.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-1">
              {room.description}
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
              <div className="flex items-center gap-1.5 bg-secondary/30 px-2.5 py-1 rounded-md border border-secondary/50">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {room.turnDurationSeconds}s turns
                </span>
              </div>
            </div>
          )}

          {/* Prize Pool Display */}
          {prizePool && (
            <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-950/20 px-2.5 py-1 rounded-md border border-yellow-200 dark:border-yellow-800">
              <Trophy className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                {prizePool} Coins Prize Pool
              </span>
            </div>
          )}

          {/* Team Participant Counts */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <Users className="h-3.5 w-3.5" />
              <span className="font-semibold">FOR: {forCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
              <Users className="h-3.5 w-3.5" />
              <span className="font-semibold">AGAINST: {againstCount}</span>
            </div>
          </div>
        </div>

        {/* Footer: Host, Participants & Actions */}
        <div className="flex flex-wrap gap-y-3 items-center justify-between pt-3 border-t border-dashed border-border/60 mt-auto">
          
          {/* Host & Participant Info */}
          <div className="flex flex-col gap-1.5">
             {/* Host */}
            <div className="flex items-center gap-2">
              <Avatar className={cn("h-7 w-7 border transition-colors", theme.avatarBorder)}>
                <AvatarImage src={room.host.avatar || undefined} />
                <AvatarFallback className={cn("text-xs font-bold", theme.avatarFallback)}>
                    {hostInitial}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-muted-foreground truncate max-w-[100px]">
                {room.host.name}
              </span>
            </div>
             
             {/* Participants */}
             <div className="flex items-center gap-1.5 text-muted-foreground/80">
               <Users className="h-3.5 w-3.5" />
               <span className="text-xs font-bold tabular-nums">
                 {totalParticipants}/{maxParticipants} joined
               </span>
             </div>
          </div>

          {/* Actions: Share & CTA Button */}
          <div className="flex items-center gap-2">
             <ShareButton
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/debate-rooms/${room.id}`}
                title={room.topic}
                description={room.description || undefined}
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
              onClick={handleDefaultAction}
              disabled={actionDisabled || actionLoading}
            >
              {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : statusIsLive ? (
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
              ) : (
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
              )}
              {actionLoading ? "Wait" : (actionLabel || (statusIsLive ? "Join" : statusIsEnded ? "View Results" : "Join"))}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
