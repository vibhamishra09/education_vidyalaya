"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Play, Clock, Calendar, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { StudyRoomCard, SessionStatus } from "@/types/api.types";
import { formatDate, getRelativeTimeString } from "@/lib/utils/date-time";

interface StudyRoomCardBrowseProps {
  studyRoom: StudyRoomCard;
}

export function StudyRoomCardBrowse({ studyRoom }: StudyRoomCardBrowseProps) {
  const isLive = studyRoom.sessionStatus === SessionStatus.ONGOING;
  const isUpcoming = studyRoom.sessionStatus === SessionStatus.UPCOMING;
  const isDone = studyRoom.sessionStatus === SessionStatus.DONE;

  // Get timezone-aware formatted time
  const formattedDateTime = getRelativeTimeString(studyRoom.date);

  return (
    <Link href={`/studyroom/${studyRoom.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200 cursor-pointer">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge
                variant={isLive ? "default" : isUpcoming ? "secondary" : "outline"}
                className={
                  isLive
                    ? "bg-red-500 hover:bg-red-600 animate-pulse flex items-center gap-1"
                    : ""
                }
              >
                {isLive && (
                  <span className="inline-block w-2 h-2 rounded-full bg-white mr-1" />
                )}
                {isLive ? "Live" : isUpcoming ? "Upcoming" : "Completed"}
              </Badge>
              <div className="flex flex-wrap gap-1">
                {studyRoom.skills.slice(0, 1).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {typeof skill === 'string' ? skill : skill.name}
                  </Badge>
                ))}
                {studyRoom.skills.length > 1 && (
                  <Badge variant="outline" className="text-xs">
                    +{studyRoom.skills.length - 1}
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                {studyRoom.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {studyRoom.description || "No description provided"}
              </p>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-end space-y-4">
            {/* Date and Time */}
            {!isDone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{formattedDateTime}</span>
              </div>
            )}

            {/* Participants and Host */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {studyRoom.participantCount || 0}/{studyRoom.maxParticipants}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={studyRoom.createdBy.avatar} />
                  <AvatarFallback>
                    {studyRoom.createdBy.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground text-xs truncate max-w-[100px]">
                  {studyRoom.createdBy.name}
                </span>
              </div>
            </div>

            {/* Joining Fee */}
            {studyRoom.joiningFee > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Coins className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-600 font-medium">
                  {parseFloat(studyRoom.joiningFee.toString()).toFixed(2)} coins to join
                </span>
              </div>
            )}

            <Button
              className="w-full"
              variant={isLive ? "default" : "outline"}
            >
              {isLive ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Join Live
                </>
              ) : isUpcoming ? (
                "View Details"
              ) : (
                "View Summary"
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
