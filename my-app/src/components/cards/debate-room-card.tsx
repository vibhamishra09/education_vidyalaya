"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Users, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { cn } from "@/lib/utils";

interface DebateRoomCardProps {
  status: "open" | "in_progress" | "completed";
  title: string;
  watchers: number;
  participants: {
    for: string | null;
    against: string | null;
  };
}

export function DebateRoomCard({
  status,
  title,
  watchers,
  participants,
}: DebateRoomCardProps) {
  const requireAuth = useRequireAuth();

  // Helper to determine status styling
  const getStatusVisuals = (s: string) => {
    switch (s) {
      case "in_progress":
        return {
          label: "LIVE",
          dotColor: "bg-red-500",
          badgeStyle:
            "bg-red-100/50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
        };
      case "completed":
        return {
          label: "ENDED",
          dotColor: "bg-muted-foreground",
          badgeStyle:
            "bg-secondary text-muted-foreground border-border dark:bg-secondary/50",
        };
      default:
        return {
          label: "OPEN",
          dotColor: "bg-emerald-500",
          badgeStyle:
            "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
        };
    }
  };

  const statusVis = getStatusVisuals(status);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="h-full"
    >
      <Card className="group relative flex h-full flex-col overflow-hidden border-border bg-card p-3 transition-all duration-300 hover:border-emerald-200 hover:shadow-lg rounded-xl dark:hover:border-emerald-800">
        
        {/* Header: Status & Watchers */}
        <div className="mb-2 flex items-start justify-between">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 px-2 py-1 text-xs font-bold tracking-wider rounded-md shadow-sm", // Increased text-[11px] -> text-xs
              statusVis.badgeStyle
            )}
          >
            <span className={cn("relative flex h-2 w-2")}>
              {status === "in_progress" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              )}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  statusVis.dotColor
                )}
              ></span>
            </span>
            {statusVis.label}
          </Badge>

          {/* Watchers Badge */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
            <Users className="h-3.5 w-3.5" />
            <span>{watchers}</span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-2 flex-grow">
          {/* Increased text-sm -> text-base for standard readability */}
          <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-tight text-foreground group-hover:text-emerald-600 transition-colors duration-300 dark:group-hover:text-emerald-400">
            {title}
          </h3>
        </div>

        {/* Debate Grid */}
        <div className="mb-2 flex flex-col gap-2">
          
          {/* Proposition */}
          <ParticipantSlot
            side="for"
            name={participants.for}
            isFilled={!!participants.for}
          />

          {/* VS Divider */}
          <div className="relative flex items-center justify-center -my-1.5 z-10">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative bg-card px-2">
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-600 shadow-sm dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
                VS
              </div>
            </div>
          </div>

          {/* Opposition */}
          <ParticipantSlot
            side="against"
            name={participants.against}
            isFilled={!!participants.against}
          />
        </div>

        {/* Footer Actions */}
        <div className="mt-auto pt-1">
          {status === "open" ? (
            <Button
              className="w-full rounded-lg font-semibold shadow-sm h-9 text-sm" // Increased h-8 -> h-9, text-xs -> text-sm
              size="sm"
              variant="default"
              onClick={() => requireAuth(() => console.log("Join"))}
            >
              Join Debate
            </Button>
          ) : (
            <Button
              className="w-full rounded-lg font-semibold shadow-sm h-9 text-sm" // Increased h-8 -> h-9, text-xs -> text-sm
              size="sm"
              variant={status === "in_progress" ? "destructive" : "secondary"}
              onClick={() => requireAuth(() => console.log("Watch"))}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {status === "in_progress" ? "Watch Live" : "Replay"}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// Participant Slot
function ParticipantSlot({
  side,
  name,
  isFilled,
}: {
  side: "for" | "against";
  name: string | null;
  isFilled: boolean;
}) {
  const isFor = side === "for";

  const theme = isFor
    ? {
        bg: "bg-blue-50/50 dark:bg-blue-950/20",
        border: "border-blue-200 dark:border-blue-800",
        text: "text-blue-700 dark:text-blue-300",
        avatar:
          "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
        label: "PRO",
      }
    : {
        bg: "bg-orange-50/50 dark:bg-orange-950/20",
        border: "border-orange-200 dark:border-orange-800",
        text: "text-orange-700 dark:text-orange-300",
        avatar:
          "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200",
        label: "CON",
      };

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all duration-300 w-full",
        isFilled
          ? cn("border-opacity-100 shadow-sm", theme.bg, theme.border)
          : "border-dashed border-border bg-muted/20"
      )}
    >
      <div className="shrink-0">
        {isFilled ? (
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-background", // Increased h-7 -> h-8
              theme.avatar
            )}
          >
            {name?.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center bg-background/50">
             {/* Increased h-7 -> h-8 */}
            <UserPlus className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[10px] font-extrabold uppercase tracking-wider opacity-70", // Increased text-[9px] -> text-[10px]
              theme.text
            )}
          >
            {theme.label}
          </span>
        </div>

        {isFilled ? (
          <span className="truncate text-sm font-semibold text-foreground">
             {/* Increased text-xs -> text-sm */}
            {name}
          </span>
        ) : (
          <span className="text-sm font-medium text-muted-foreground/70 italic">
             {/* Increased text-xs -> text-sm */}
            Spot Open
          </span>
        )}
      </div>
    </div>
  );
}