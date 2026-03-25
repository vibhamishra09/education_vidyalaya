"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Play, Calendar, Star, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { StudyRoomCard, SessionStatus } from "@/types/api.types";
import { formatDate } from "@/lib/utils/date-time";
import { studyRoomCardDisplayLive } from "@/lib/utils/study-room-edit";
import { ShareButton } from "@/components/share/share-button";

interface StudyRoomCardBrowseProps {
  studyRoom: StudyRoomCard;
}

export function StudyRoomCardBrowse({ studyRoom }: StudyRoomCardBrowseProps) {
  const router = useRouter();
  const isLive = studyRoomCardDisplayLive(
    studyRoom.sessionStatus,
    studyRoom.date,
  );
  const isDone = studyRoom.sessionStatus === SessionStatus.DONE;
  const isUpcoming =
    !isDone &&
    !isLive &&
    (studyRoom.sessionStatus === SessionStatus.UPCOMING ||
      studyRoom.sessionStatus === SessionStatus.PENDING ||
      studyRoom.sessionStatus === SessionStatus.ONGOING);

  // Get timezone-aware formatted time
  const formattedDateTime = formatDate(studyRoom.date, "datetime");

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
              <h3
                className="font-semibold text-lg leading-tight line-clamp-2 cursor-pointer"
                onClick={() => router.push(`/studyroom/${studyRoom.id}`)}
              >
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
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-secondary/30 px-2.5 py-1 rounded-md border border-secondary/50">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-xs text-muted-foreground">{formattedDateTime}</span>
                </div>
                {studyRoom.duration && (
                  <div className="flex items-center gap-1.5 bg-secondary/30 px-2.5 py-1 rounded-md border border-secondary/50">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-xs text-muted-foreground">{studyRoom.duration} min</span>
                  </div>
                )}
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
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <Avatar
                    className="h-6 w-6 cursor-pointer"
                    onClick={() => router.push(`/profile/${studyRoom.createdBy.id}`)}
                  >
                    <AvatarImage src={studyRoom.createdBy.avatar} />
                    <AvatarFallback>
                      {studyRoom.createdBy.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="text-muted-foreground text-xs truncate max-w-[100px] cursor-pointer"
                    onClick={() => router.push(`/profile/${studyRoom.createdBy.id}`)}
                  >
                    {studyRoom.createdBy.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {typeof studyRoom.hostAvgRating === "number" && (studyRoom.hostReviewCount ?? 0) > 0 ? (
                    <div className="flex items-center gap-1 text-amber-600 font-semibold">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>{studyRoom.hostAvgRating.toFixed(1)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        ({studyRoom.hostReviewCount})
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No reviews</span>
                  )}
                  {typeof studyRoom.hostTotalSessions === "number" && (
                    <span className="text-muted-foreground">
                      • {studyRoom.hostTotalSessions} sessions
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <ShareButton
                url={`${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || ""}/studyroom/${studyRoom.id}`}
                title={studyRoom.title}
                description={studyRoom.description || ""}
                image={studyRoom.imageUrl}
                variant="outline"
                size="default"
                className="flex-1"
              />
              <Button
                className="flex-1"
                variant={isLive ? "default" : "outline"}
                onClick={() => router.push(`/studyroom/${studyRoom.id}`)}
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
            </div>
          </CardContent>
      </Card>
    </motion.div>
  );
}
