"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Users, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { StudyRoomCard, Skill } from "@/types/api.types";

interface SkillsAndSuggestionsProps {
  userSkills?: Skill[];
  suggestedRooms?: StudyRoomCard[];
  isLoading?: boolean;
}

export function SkillsAndSuggestions({
  userSkills = [],
  suggestedRooms = [],
  isLoading = false
}: SkillsAndSuggestionsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Your Skills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Your Skills
            </CardTitle>
            <Link href="/profile?tab=about">
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {userSkills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-1">No skills added yet</p>
              <p className="text-sm mb-4">Add skills to get personalized recommendations</p>
              <Link href="/profile?tab=about">
                <Button variant="outline" size="sm">
                  Add Skills
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userSkills.slice(0, 12).map((skill) => (
                <Badge
                  key={skill.id}
                  variant="secondary"
                  className="text-sm px-3 py-1"
                >
                  {skill.name}
                </Badge>
              ))}
              {userSkills.length > 12 && (
                <Link href="/profile?tab=about">
                  <Badge
                    variant="outline"
                    className="text-sm px-3 py-1 cursor-pointer hover:bg-muted"
                  >
                    +{userSkills.length - 12} more
                  </Badge>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Study Rooms */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Suggested Study Rooms
            </CardTitle>
            <Link href="/study-rooms">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {suggestedRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-1">No suggestions available</p>
              <p className="text-sm mb-4">Add skills to get personalized study room recommendations</p>
              <Link href="/study-rooms">
                <Button variant="outline" size="sm">
                  Browse All Rooms
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestedRooms.slice(0, 3).map((room) => (
                <div
                  key={room.id}
                  className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 truncate">
                        {room.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {room.participantCount || 0}/{room.maxParticipants}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {room.duration}min
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {room.skills?.slice(0, 2).map((skill, idx) => {
                          const skillName = typeof skill === 'string' ? skill : skill.name;
                          const skillId = typeof skill === 'string' ? skill : skill.id;
                          return (
                            <Badge
                              key={skillId || idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {skillName}
                            </Badge>
                          );
                        })}
                        {room.skills && room.skills.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{room.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Link href={`/study-rooms/${room.id}`}>
                      <Button variant="outline" size="sm" className="flex-shrink-0">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {suggestedRooms.length > 3 && (
                <Link href="/study-rooms">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View {suggestedRooms.length - 3} More Suggestions
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
