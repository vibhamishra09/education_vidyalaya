"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Play } from "lucide-react";
import { motion } from "framer-motion";

interface StudyRoomCardProps {
  status: "live" | "scheduled";
  category: string;
  title: string;
  description: string;
  participants: {
    current: number;
    max: number;
  };
  host: {
    name: string;
    avatar?: string;
  };
}

export function StudyRoomCard({
  status,
  category,
  title,
  description,
  participants,
  host,
}: StudyRoomCardProps) {
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
              variant={status === "live" ? "default" : "secondary"}
              className={
                status === "live"
                  ? "bg-red-500 hover:bg-red-600 animate-pulse flex items-center gap-1"
                  : ""
              }
            >
              {status === "live" && (
                <span className="inline-block w-2 h-2 rounded-full bg-white mr-1" />
              )}
              {status}
            </Badge>
            <Badge variant="outline">{category}</Badge>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight">{title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-end space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {participants?.current}/{participants?.max}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={host?.avatar} />
                <AvatarFallback>{host?.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground">{host?.name}</span>
            </div>
          </div>

          <Button
            className="w-full"
            variant={status === "live" ? "default" : "outline"}
          >
            {status === "live" ? (
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
