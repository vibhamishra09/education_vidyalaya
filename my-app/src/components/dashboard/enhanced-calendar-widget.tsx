"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, List, Grid3x3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface CalendarSession {
  id: string;
  title: string;
  date: string;
  duration: number;
  type?: "learning" | "teaching";
  participantName?: string;
  sessionType?: "peer" | "study-room";
}

interface EnhancedCalendarWidgetProps {
  sessions?: CalendarSession[];
}

export function EnhancedCalendarWidget({ sessions = [] }: EnhancedCalendarWidgetProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">("month");
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [pinnedDay, setPinnedDay] = useState<string | null>(null);
  const [isInteractingWithPopover, setIsInteractingWithPopover] = useState(false);

  const hoverCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedDayRef = useRef<string | null>(null);
  const interactingRef = useRef(false);

  useEffect(() => {
    pinnedDayRef.current = pinnedDay;
  }, [pinnedDay]);

  useEffect(() => {
    interactingRef.current = isInteractingWithPopover;
  }, [isInteractingWithPopover]);

  useEffect(() => {
    return () => {
      if (hoverCloseTimeout.current) {
        clearTimeout(hoverCloseTimeout.current);
      }
    };
  }, []);

  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Month view helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  // Week view helpers
  const getWeekDays = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day; // adjust when day is sunday
    const weekStart = new Date(date.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = useMemo(() => getWeekDays(new Date(currentDate)), [currentDate]);
  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else if (viewMode === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const nextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else if (viewMode === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return (
        sessionDate.getDate() === date.getDate() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const hasSessionOnDate = (day: number) => {
    const dateToCheck = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    return getSessionsForDate(dateToCheck).length > 0;
  };

  const isToday = (date: Date | number) => {
    const today = new Date();
    if (typeof date === 'number') {
      return (
        today.getDate() === date &&
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear()
      );
    }
    return (
      today.getDate() === date.getDate() &&
      today.getMonth() === date.getMonth() &&
      today.getFullYear() === date.getFullYear()
    );
  };

  // Get upcoming sessions for agenda view
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter(s => new Date(s.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
  }, [sessions]);

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getDateKey = (date: Date) => date.toISOString().split('T')[0];

  const stopHoverCloseTimer = () => {
    if (hoverCloseTimeout.current) {
      clearTimeout(hoverCloseTimeout.current);
      hoverCloseTimeout.current = null;
    }
  };

  const schedulePopoverClose = () => {
    stopHoverCloseTimer();
    hoverCloseTimeout.current = setTimeout(() => {
      if (!pinnedDayRef.current && !interactingRef.current) {
        setActiveDay(null);
      }
    }, 160);
  };

  const handleDayHover = (date: Date, shouldPin = false) => {
    const key = getDateKey(date);

    if (!shouldPin && pinnedDayRef.current && pinnedDayRef.current !== key) {
      return;
    }

    setActiveDay(key);
    stopHoverCloseTimer();

    if (shouldPin) {
      setPinnedDay(key);
    } else if (pinnedDayRef.current && pinnedDayRef.current !== key) {
      setPinnedDay(null);
    }
  };

  const toggleDayPin = (date: Date) => {
    const key = getDateKey(date);
    if (pinnedDay === key) {
      closeDayPopover();
    } else {
      handleDayHover(date, true);
    }
  };

  const closeDayPopover = () => {
    stopHoverCloseTimer();
    setActiveDay(null);
    setPinnedDay(null);
    setIsInteractingWithPopover(false);
  };

  const openSessionDetails = (sessionId: string, sessionType?: "peer" | "study-room") => {
    closeDayPopover();
    const url = sessionType === "study-room" ? `/studyroom/${sessionId}` : `/sessions/${sessionId}`;
    router.push(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Session Calendar</span>
            <span className="sm:hidden">Calendar</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs sm:text-sm"
          >
            Today
          </Button>
        </div>

        {/* View Mode Tabs */}
        <Tabs className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10">
            <TabsTrigger
              active={viewMode === "month"}
              onClick={() => setViewMode("month")}
              className="text-[10px] sm:text-xs"
            >
              <Grid3x3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
              <span className="hidden sm:inline">Month</span>
            </TabsTrigger>
            <TabsTrigger
              active={viewMode === "week"}
              onClick={() => setViewMode("week")}
              className="text-[10px] sm:text-xs"
            >
              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
              <span className="hidden sm:inline">Week</span>
            </TabsTrigger>
            <TabsTrigger
              active={viewMode === "agenda"}
              onClick={() => setViewMode("agenda")}
              className="text-[10px] sm:text-xs"
            >
              <List className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Navigation */}
        {viewMode !== "agenda" && (
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={previousPeriod} className="h-8 w-8 sm:h-9 sm:w-9 p-0">
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <span className="text-xs sm:text-sm font-medium px-2 text-center">
              {viewMode === "month" ? monthYear : getWeekRange()}
            </span>
            <Button variant="ghost" size="sm" onClick={nextPeriod} className="h-8 w-8 sm:h-9 sm:w-9 p-0">
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        )}

        {/* Month View */}
        {viewMode === "month" && (
          <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const hasSession = hasSessionOnDate(day);
                const today = isToday(day);
                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const sessionsOnDay = getSessionsForDate(dateObj);

                const dateKey = getDateKey(dateObj);
                const isOpen = activeDay === dateKey;

                return (
                  <Popover
                    key={day}
                    open={isOpen}
                    onOpenChange={(open) => {
                      if (!open) {
                        closeDayPopover();
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "aspect-square w-full h-full flex items-center justify-center text-xs sm:text-sm rounded-lg cursor-pointer transition-colors relative",
                          today
                            ? "bg-primary text-primary-foreground font-semibold"
                            : hasSession
                            ? "bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
                            : "hover:bg-muted"
                        )}
                        onMouseEnter={() => sessionsOnDay.length > 0 && handleDayHover(dateObj)}
                        onMouseLeave={() => {
                          if (!pinnedDay || pinnedDay !== dateKey) {
                            schedulePopoverClose();
                          }
                        }}
                        onClick={() => sessionsOnDay.length > 0 && toggleDayPin(dateObj)}
                        disabled={sessionsOnDay.length === 0}
                      >
                        <span className="relative z-10">{day}</span>
                        {sessionsOnDay.length > 0 && !today && (
                          <div className="absolute bottom-0.5 flex gap-0.5">
                            {sessionsOnDay.slice(0, 3).map((_, idx) => (
                              <div key={idx} className="w-1 h-1 rounded-full bg-blue-600" />
                            ))}
                          </div>
                        )}
                      </button>
                    </PopoverTrigger>
                    {sessionsOnDay.length > 0 && (
                      <PopoverContent
                        align="center"
                        side="top"
                        className="w-56 sm:w-64"
                        sideOffset={12}
                        onMouseEnter={() => {
                          setIsInteractingWithPopover(true);
                          stopHoverCloseTimer();
                        }}
                        onMouseLeave={() => {
                          setIsInteractingWithPopover(false);
                          schedulePopoverClose();
                        }}
                      >
                        <div className="font-semibold mb-1 whitespace-nowrap text-sm">
                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                          {sessionsOnDay.slice(0, 5).map((session) => (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => openSessionDetails(session.id, session.sessionType)}
                              className="flex w-full items-start gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                                  session.type === "teaching" ? "bg-green-400" : "bg-blue-400"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{session.title}</div>
                                <div className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatTime(session.date)} • {session.duration}m
                                </div>
                                {session.participantName && (
                                  <div className="text-muted-foreground/80 text-[10px] truncate mt-0.5">
                                    {session.participantName}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                          {sessionsOnDay.length > 5 && (
                            <div className="text-muted-foreground text-[10px] pt-1 border-t">
                              +{sessionsOnDay.length - 5} more
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map((day) => {
                const today = isToday(day);
                const sessionsOnDay = getSessionsForDate(day);
                const hasSession = sessionsOnDay.length > 0;

                return (
                  <div key={day.toISOString()} className="space-y-2">
                    {/* Day header */}
                    <div className="text-center">
                      <div className="text-xs font-medium text-muted-foreground">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div
                        className={cn(
                          "text-sm font-semibold mx-auto w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full",
                          today && "bg-primary text-primary-foreground"
                        )}
                      >
                        {day.getDate()}
                      </div>
                    </div>

                    {/* Sessions for this day */}
                    <div className="space-y-1">
                      {sessionsOnDay.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => openSessionDetails(session.id, session.sessionType)}
                          className={cn(
                            "w-full text-xs p-1 sm:p-1.5 rounded border text-center cursor-pointer hover:bg-muted/50 transition-colors group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            session.type === "teaching"
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-blue-50 border-blue-200 text-blue-700"
                          )}
                        >
                          <div className="font-medium truncate">{formatTime(session.date)}</div>
                          <div className="truncate opacity-75">{session.title}</div>
                          {/* Hover Tooltip for week view */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 hidden sm:block">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-[180px] shadow-xl whitespace-normal">
                              <div className="font-semibold mb-1">{session.title}</div>
                              <div className="text-gray-300 text-[10px] flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {formatTime(session.date)} • {session.duration} minutes
                              </div>
                              {session.participantName && (
                                <div className="text-gray-400 text-[10px] mt-1">
                                  {session.participantName}
                                </div>
                              )}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                          </div>
                        </button>
                      ))}
                      {!hasSession && (
                        <div className="h-12 border border-dashed border-muted rounded" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agenda View */}
        {viewMode === "agenda" && (
          <div className="space-y-3">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No upcoming sessions</p>
                <p className="text-sm mt-1">Your schedule is clear!</p>
              </div>
            ) : (
              upcomingSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => openSessionDetails(session.id, session.sessionType)}
                  className="flex w-full items-start gap-3 p-3 rounded-lg border text-left hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex-shrink-0 text-center min-w-[60px]">
                    <div className="text-xs font-medium text-muted-foreground">
                      {formatDate(session.date)}
                    </div>
                    <div className="text-sm font-semibold flex items-center justify-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(session.date)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{session.title}</h4>
                      <Badge
                        variant={session.type === "teaching" ? "default" : "secondary"}
                        className="text-xs flex-shrink-0"
                      >
                        {session.type === "teaching" ? "Teaching" : "Learning"}
                      </Badge>
                    </div>
                    {session.participantName && (
                      <p className="text-xs text-muted-foreground">
                        with {session.participantName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.duration} minutes
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Legend - Only show for month/week views */}
        {viewMode !== "agenda" && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" />
              <span>Learning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
              <span>Teaching</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Today</span>
            </div>
          </div>
        )}

        {/* Session count */}
        {sessions.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {viewMode === "agenda"
                ? "Upcoming sessions"
                : `Sessions this ${viewMode}`}
            </span>
            <Badge variant="secondary">
              {viewMode === "agenda" ? upcomingSessions.length : sessions.length}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
