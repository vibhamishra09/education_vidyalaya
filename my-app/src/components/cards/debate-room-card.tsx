"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, UserPlus, Play, Users, Swords } from "lucide-react";
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
          label: "Live Now",
          dotColor: "bg-red-500",
          badgeStyle: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
        };
      case "completed":
        return {
          label: "Ended",
          dotColor: "bg-gray-500",
          badgeStyle: "border-border bg-secondary text-muted-foreground",
        };
      default:
        return {
          label: "Registration",
          dotColor: "bg-green-500",
          badgeStyle: "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400",
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
      <Card className="group relative flex h-full flex-col overflow-hidden border-border/60 bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg">
        
        {/* Header: Status & Watchers */}
        <div className="mb-4 flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn("gap-1.5 px-2.5 py-1 text-xs font-medium", statusVis.badgeStyle)}
          >
            <span className={cn("relative flex h-2 w-2")}>
              {status === "in_progress" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              )}
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", statusVis.dotColor)}></span>
            </span>
            {statusVis.label}
          </Badge>

          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{watchers}</span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6 flex-1">
          <h3 className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
        </div>

        {/* Debate Grid (The Core Visual) */}
        <div className="mb-5 grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
          
          {/* Proposition (Blue) */}
          <ParticipantSlot 
            side="for" 
            name={participants.for} 
            isFilled={!!participants.for}
          />

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center gap-1 py-1">
            <div className="h-full w-px bg-border/50"></div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
              VS
            </div>
            <div className="h-full w-px bg-border/50"></div>
          </div>

          {/* Opposition (Red) */}
          <ParticipantSlot 
            side="against" 
            name={participants.against} 
            isFilled={!!participants.against}
          />
        </div>

        {/* Footer Actions */}
        <div className="mt-auto">
          {status === "open" ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="sm"
                className="w-full text-xs font-semibold"
                onClick={() => requireAuth(() => console.log("Join"))}
              >
                <Swords className="mr-2 h-3.5 w-3.5" />
                Join
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold hover:bg-muted"
                onClick={() => requireAuth(() => console.log("Observe"))}
              >
                <Eye className="mr-2 h-3.5 w-3.5" />
                Observe
              </Button>
            </div>
          ) : (
            <Button
              variant={status === "in_progress" ? "default" : "secondary"}
              className="w-full"
              size="sm"
              onClick={() => requireAuth(() => console.log("Watch"))}
            >
              <Play className="mr-2 h-4 w-4" />
              {status === "in_progress" ? "Watch Live Debate" : "View Recording"}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// Sub-component for the participant slots to keep main code clean
function ParticipantSlot({ side, name, isFilled }: { side: "for" | "against", name: string | null, isFilled: boolean }) {
  const isFor = side === "for";
  
  // Dynamic styles based on side
  const colors = isFor 
    ? { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-100 dark:border-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "PROPOSITION" }
    : { bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-100 dark:border-orange-900/30", text: "text-orange-700 dark:text-orange-300", label: "OPPOSITION" };

  if (isFilled) {
    return (
      <div className={cn(
        "flex flex-col justify-center rounded-lg border p-3 transition-colors",
        colors.bg, colors.border
      )}>
        <span className={cn("mb-1 text-[10px] font-bold tracking-wider opacity-70", colors.text)}>
          {colors.label}
        </span>
        <span className="line-clamp-1 text-sm font-semibold text-foreground">
          {name}
        </span>
      </div>
    );
  }

  // Empty State
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center transition-colors hover:bg-muted/40">
      <span className="mb-1 text-[10px] font-medium text-muted-foreground/60">
        {colors.label}
      </span>
      <span className="text-xs font-medium text-muted-foreground">
        Open Slot
      </span>
    </div>
  );
}