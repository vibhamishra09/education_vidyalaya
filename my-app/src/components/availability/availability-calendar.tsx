"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { peerSessionsApi } from "@/lib/api";

interface AvailabilityCalendarProps {
  peerId: string;
  duration: number;
  onSlotSelect: (date: string, time: string) => void;
  selectedDate?: string;
  selectedTime?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export function AvailabilityCalendar({
  peerId,
  duration,
  onSlotSelect,
  selectedDate,
  selectedTime,
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Generate calendar days for current month
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

  const days = getDaysInMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch available slots when a day is selected
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDay || !peerId || !duration) return;

      try {
        setLoadingSlots(true);
        const dateString = selectedDay.toISOString().split('T')[0]; // YYYY-MM-DD

        const response = await peerSessionsApi.getAvailableSlots(
          peerId,
          dateString,
          duration,
          30 // 30-minute intervals
        );

        setSlots(response.availableSlots);
      } catch (error) {
        console.error('Error fetching available slots:', error);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDay, peerId, duration]);

  // Initialize selected day from props
  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      setSelectedDay(date);
      setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }, [selectedDate]);

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (!slot.isAvailable || !selectedDay) return;

    const dateString = selectedDay.toISOString().split('T')[0];
    const timeString = new Date(slot.startTime).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    onSlotSelect(dateString, timeString);
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDay) return false;
    return (
      date.getDate() === selectedDay.getDate() &&
      date.getMonth() === selectedDay.getMonth() &&
      date.getFullYear() === selectedDay.getFullYear()
    );
  };

  const isSlotSelected = (slot: TimeSlot) => {
    if (!selectedTime || !selectedDay) return false;
    const slotTime = new Date(slot.startTime).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    return slotTime === selectedTime;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select a Date
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
        </CardHeader>
        <CardContent>
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
              const isSelected = isDateSelected(date);
              const isToday =
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => !isPast && handleDayClick(date)}
                  disabled={isPast}
                  className={`
                    aspect-square p-2 rounded-md text-sm font-medium transition-colors
                    ${isPast
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'hover:bg-accent cursor-pointer'
                    }
                    ${isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                    ${isToday && !isSelected ? 'border-2 border-primary' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Time Slots
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDay.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-1">No available slots</p>
                <p className="text-sm">This user is not available on this day</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slots.map((slot, index) => {
                  const startTime = new Date(slot.startTime);
                  const timeString = startTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  const isSelected = isSlotSelected(slot);

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSlotClick(slot)}
                      disabled={!slot.isAvailable}
                      className={`
                        p-3 rounded-md text-sm font-medium transition-colors border-2
                        ${!slot.isAvailable
                          ? 'bg-muted/50 text-muted-foreground border-muted cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary hover:bg-accent cursor-pointer'
                        }
                      `}
                    >
                      {timeString}
                      {!slot.isAvailable && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Booked
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedDay && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Select a date to view available time slots</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
