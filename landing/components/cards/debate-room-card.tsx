"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, UserPlus, Play } from "lucide-react";
import { motion } from "framer-motion";

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
              variant={status === "in_progress" ? "default" : "secondary"}
              className={
                status === "in_progress"
                  ? "bg-green-500 hover:bg-green-600"
                  : ""
              }
            >
              {status.replace("_", " ")}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{watchers} watching</span>
            </div>
          </div>
          <h3 className="font-semibold text-lg leading-tight">{title}</h3>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-end space-y-4">
          {/* Participants */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs font-medium text-green-600 dark:text-green-400">
                For
              </div>
              <div className="text-sm">
                {participants.for || (
                  <span className="text-muted-foreground">Open slot</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-red-600 dark:text-red-400">
                Against
              </div>
              <div className="text-sm">
                {participants.against || (
                  <span className="text-muted-foreground">Open slot</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {status === "open" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  console.log("Joining debate room as observer...");
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Join
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  console.log("Joining debate room as participant...");
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Participate
              </Button>
            </div>
          )}
          {status === "in_progress" && (
            <Button
              className="w-full"
              onClick={() => {
                console.log("Watching live debate...");
              }}
            >
              <Play className="h-4 w-4 mr-2" />
              Watch
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
