"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const handleDateHover = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setHoveredDate(dateStr);
    fetchDetailedSlots(dateStr, selectedDurationTab);
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
    setPopoverOpen(false);
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
    <div className="space-y-4 max-w-sm mx-auto">
      <Card>
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Select Date
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs font-medium min-w-[100px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
            <Info className="h-3 w-3" />
            <span>Hover to see slots</span>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {loadingSummary ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {/* Day names */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-0.5">
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
                  // Show all dates, even if they don't have available slots
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
                        if (!open) setHoveredDate(null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleDateHover(date)}
                          disabled={isPast}
                          onMouseEnter={() => !isPast && handleDateHover(date)}
                          className={cn(
                            "relative aspect-square p-0 rounded-md text-xs font-medium transition-colors flex flex-col items-center justify-center",
                            isPast
                              ? "text-muted-foreground/30 cursor-not-allowed"
                              : "hover:bg-accent cursor-pointer",
                            isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                            isToday && !isSelected && "border border-primary"
                          )}
                        >
                          <div className="flex flex-col items-center justify-center h-full">
                            <span>{date.getDate()}</span>
                            {!isPast && daySummary && (
                              <div className="flex gap-0.5 mt-0.5">
                                {daySummary.hasSlots['15'] && <div className="w-0.5 h-0.5 rounded-full bg-green-500" />}
                                {daySummary.hasSlots['30'] && <div className="w-0.5 h-0.5 rounded-full bg-blue-500" />}
                                {daySummary.hasSlots['60'] && <div className="w-0.5 h-0.5 rounded-full bg-purple-500" />}
                                {daySummary.hasSlots['120'] && <div className="w-0.5 h-0.5 rounded-full bg-orange-500" />}
                                {!hasAnySlots && <div className="w-0.5 h-0.5 rounded-full bg-red-500" />}
                              </div>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      {!isPast && (
                        <PopoverContent className="w-72 p-0" align="start" side="right">
                          <div className="p-4">
                            <h3 className="font-semibold mb-2">
                              {date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </h3>
                            <div className="w-full">
                              <div className="grid w-full grid-cols-4 h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                                {DURATION_OPTIONS.map((opt) => (
                                  <button
                                    type="button"
                                    key={opt.value}
                                    className={cn(
                                      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                      selectedDurationTab === opt.value ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
                                    )}
                                    onClick={() => {
                                      setSelectedDurationTab(opt.value);
                                      if (hoveredDate) {
                                        fetchDetailedSlots(hoveredDate, opt.value);
                                      }
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                              <div className="mt-3">
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
                                                  : "border-red-300 bg-red-50 dark:bg-red-950 hover:border-red-500 text-red-700 dark:text-red-300"
                                              )}
                                            >
                                              {slotTimeStr}
                                              {!slot.isAvailable && (
                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" title="May be cancelled" />
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
                                          <span className="w-3 h-3 rounded bg-red-500"></span>
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
              <div className="mt-2 p-2 bg-muted/30 rounded-lg">
                <p className="text-[10px] font-medium mb-1">Duration indicators:</p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>15m avail</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>30m avail</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>1h avail</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span>2h avail</span>
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
