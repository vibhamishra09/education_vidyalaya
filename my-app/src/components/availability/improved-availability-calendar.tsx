"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar, Info } from "lucide-react";
import { availabilityApi } from "@/lib/api";
import type { AvailabilityDateSummary, DetailedSlot } from "@/lib/api/availability.api";
import { cn } from "@/lib/utils";

interface ImprovedAvailabilityCalendarProps {
  peerId: string;
  onSlotSelect: (date: string, time: string, duration: number, isAvailable: boolean, reason?: string) => void;
  selectedDate?: string;
  selectedTime?: string;
  selectedDuration?: number;
}

type DurationOption = 15 | 30 | 60 | 120;

const DURATION_OPTIONS: { value: DurationOption; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

export function ImprovedAvailabilityCalendar({
  peerId,
  onSlotSelect,
  selectedDate,
  selectedTime,
  selectedDuration,
}: ImprovedAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [summary, setSummary] = useState<AvailabilityDateSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedDurationTab, setSelectedDurationTab] = useState<DurationOption>(
    (selectedDuration as DurationOption) || 60
  );
  const [detailedSlots, setDetailedSlots] = useState<DetailedSlot[]>([]);
  const [loadingDetailed, setLoadingDetailed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pinnedDate, setPinnedDate] = useState<string | null>(null);
  const [isInteractingWithPopover, setIsInteractingWithPopover] = useState(false);

  const hoverCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedDateRef = useRef<string | null>(null);
  const interactionRef = useRef(false);

  useEffect(() => {
    pinnedDateRef.current = pinnedDate;
  }, [pinnedDate]);

  useEffect(() => {
    interactionRef.current = isInteractingWithPopover;
  }, [isInteractingWithPopover]);

  useEffect(() => {
    return () => {
      if (hoverCloseTimeout.current) {
        clearTimeout(hoverCloseTimeout.current);
      }
    };
  }, []);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Fetch availability summary for current month
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoadingSummary(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Get first and last day of month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = lastDay.toISOString().split('T')[0];

        const response = await availabilityApi.getAvailabilitySummary(
          peerId,
          startDate,
          endDate
        );

        setSummary(response.summary);
      } catch (error) {
        console.error('Error fetching availability summary:', error);
        setSummary([]);
      } finally {
        setLoadingSummary(false);
      }
    };

    if (peerId) {
      fetchSummary();
    }
  }, [currentDate, peerId]);

  // Fetch detailed slots when date is hovered/clicked
  const fetchDetailedSlots = async (date: string, duration: DurationOption) => {
    try {
      setLoadingDetailed(true);
      const response = await availabilityApi.getDetailedSlots(
        peerId,
        date,
        duration
      );
      setDetailedSlots(response.slots);
    } catch (error) {
      console.error('Error fetching detailed slots:', error);
      setDetailedSlots([]);
    } finally {
      setLoadingDetailed(false);
    }
  };

  const stopHoverCloseTimer = () => {
    if (hoverCloseTimeout.current) {
      clearTimeout(hoverCloseTimeout.current);
      hoverCloseTimeout.current = null;
    }
  };

  const schedulePopoverClose = () => {
    stopHoverCloseTimer();
    hoverCloseTimeout.current = setTimeout(() => {
      if (!pinnedDateRef.current && !interactionRef.current) {
        setPopoverOpen(false);
        setHoveredDate(null);
      }
    }, 160);
  };

  const handleDateHover = (date: Date, shouldPin = false) => {
    const dateStr = date.toISOString().split('T')[0];

    if (!shouldPin && pinnedDateRef.current && pinnedDateRef.current !== dateStr) {
      return;
    }

    setHoveredDate(dateStr);
    stopHoverCloseTimer();
    setPopoverOpen(true);

    if (shouldPin) {
      setPinnedDate(dateStr);
    } else if (pinnedDateRef.current && pinnedDateRef.current !== dateStr) {
      setPinnedDate(null);
    }

    fetchDetailedSlots(dateStr, selectedDurationTab);
  };

  const closePopover = () => {
    setPopoverOpen(false);
    setHoveredDate(null);
    setPinnedDate(null);
  };

  const handleSlotClick = (slot: DetailedSlot) => {
    if (!hoveredDate) return;

    const startTime = new Date(slot.startTime);
    const timeString = startTime.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    onSlotSelect(hoveredDate, timeString, selectedDurationTab, slot.isAvailable, slot.reason);
    closePopover();
    setIsInteractingWithPopover(false);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getDaySummary = (date: Date): AvailabilityDateSummary | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return summary.find((s) => s.date === dateStr);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatSlotTime = (slot: DetailedSlot) => {
    const startTime = new Date(slot.startTime);
    return startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date & Duration
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Info className="h-4 w-4" />
            <span>Hover to preview slots, click to keep the popover open</span>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSummary ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const isPast = date < today;
                  const isSelected = selectedDate === date.toISOString().split('T')[0];
                  const isToday =
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

                  const daySummary = getDaySummary(date);
                  const hasAnySlots = daySummary && (
                    daySummary.hasSlots['15'] ||
                    daySummary.hasSlots['30'] ||
                    daySummary.hasSlots['60'] ||
                    daySummary.hasSlots['120']
                  );

                  return (
                    <Popover
                      key={index}
                      open={popoverOpen && hoveredDate === date.toISOString().split('T')[0]}
                      onOpenChange={(open) => {
                        setPopoverOpen(open);
                        if (!open) {
                          closePopover();
                          setIsInteractingWithPopover(false);
                          stopHoverCloseTimer();
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleDateHover(date, true)}
                          disabled={isPast || !hasAnySlots}
                          onMouseEnter={() => !isPast && hasAnySlots && handleDateHover(date)}
                          onMouseLeave={() => schedulePopoverClose()}
                          className={cn(
                            "relative aspect-square p-2 rounded-md text-sm font-medium transition-colors",
                            isPast || !hasAnySlots
                              ? "text-muted-foreground/30 cursor-not-allowed"
                              : "hover:bg-accent cursor-pointer",
                            isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                            isToday && !isSelected && "border-2 border-primary"
                          )}
                        >
                          <div className="flex flex-col items-center justify-center h-full">
                            <span>{date.getDate()}</span>
                            {hasAnySlots && !isPast && (
                              <div className="flex gap-0.5 mt-1">
                                {daySummary?.hasSlots['15'] && <div className="w-1 h-1 rounded-full bg-green-500" />}
                                {daySummary?.hasSlots['30'] && <div className="w-1 h-1 rounded-full bg-blue-500" />}
                                {daySummary?.hasSlots['60'] && <div className="w-1 h-1 rounded-full bg-purple-500" />}
                                {daySummary?.hasSlots['120'] && <div className="w-1 h-1 rounded-full bg-orange-500" />}
                              </div>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      {hasAnySlots && !isPast && (
                        <PopoverContent
                          className="w-80 p-0"
                          align="start"
                          side="right"
                          onMouseEnter={() => {
                            stopHoverCloseTimer();
                            setIsInteractingWithPopover(true);
                          }}
                          onMouseLeave={() => {
                            setIsInteractingWithPopover(false);
                            schedulePopoverClose();
                          }}
                        >
                          <div className="p-4">
                            <h3 className="font-semibold mb-2">
                              {date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </h3>
                            <Tabs>
                              <TabsList className="grid w-full grid-cols-4">
                                {DURATION_OPTIONS.map((opt) => (
                                  <TabsTrigger
                                    key={opt.value}
                                    active={selectedDurationTab === opt.value}
                                    disabled={!daySummary?.hasSlots[opt.value.toString() as keyof typeof daySummary.hasSlots]}
                                    onClick={() => {
                                      setSelectedDurationTab(opt.value);
                                      if (hoveredDate) {
                                        fetchDetailedSlots(hoveredDate, opt.value);
                                      }
                                    }}
                                  >
                                    {opt.label}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                              <TabsContent className="mt-3">
                                {loadingDetailed ? (
                                    <div className="space-y-2">
                                      {Array.from({ length: 6 }).map((_, i) => (
                                        <Skeleton key={i} className="h-8 w-full" />
                                      ))}
                                    </div>
                                  ) : detailedSlots.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground text-sm">
                                      No slots found
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                        {detailedSlots.map((slot, idx) => {
                                          const slotTimeStr = formatSlotTime(slot);
                                          const isSlotSelected =
                                            hoveredDate === selectedDate &&
                                            selectedTime === new Date(slot.startTime).toLocaleTimeString('en-US', {
                                              hour12: false,
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            }) &&
                                            selectedDuration === selectedDurationTab;

                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => handleSlotClick(slot)}
                                              title={!slot.isAvailable ? `Not ideal: ${slot.reason}` : 'Available'}
                                              className={cn(
                                                "p-2 text-xs rounded border-2 transition-colors relative",
                                                isSlotSelected
                                                  ? "bg-primary text-primary-foreground border-primary"
                                                  : slot.isAvailable
                                                  ? "border-green-300 bg-green-50 dark:bg-green-950 hover:border-green-500 text-green-700 dark:text-green-300"
                                                  : "border-orange-300 bg-orange-50 dark:bg-orange-950 hover:border-orange-500 text-orange-700 dark:text-orange-300"
                                              )}
                                            >
                                              {slotTimeStr}
                                              {!slot.isAvailable && (
                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" title="May be cancelled" />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                                        <p className="flex items-center gap-2 mb-1">
                                          <span className="w-3 h-3 rounded bg-green-500"></span>
                                          <span>Confirmed available</span>
                                        </p>
                                        <p className="flex items-center gap-2">
                                          <span className="w-3 h-3 rounded bg-orange-500"></span>
                                          <span>Bookable but high chance of cancellation</span>
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </TabsContent>
                            </Tabs>
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-medium mb-2">Duration indicators:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>15 min slots available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>30 min slots available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>1 hour slots available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>2 hour slots available</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
