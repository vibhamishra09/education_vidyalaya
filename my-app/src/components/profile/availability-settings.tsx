"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Clock, Calendar, Save } from "lucide-react";
import { availabilityApi } from "@/lib/api";
import type { UserAvailability } from "@/lib/api/availability.api";
import { toast } from "sonner";

interface AvailabilitySettingsProps {
  userId: string;
  isOwnProfile?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export function AvailabilitySettings({ userId, isOwnProfile = false }: AvailabilitySettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<UserAvailability[]>([]);

  // Local state for editing
  const [editedAvailability, setEditedAvailability] = useState<
    Record<number, { startTime: string; endTime: string; isActive: boolean }>
  >({});

  const [editedPreferences, setEditedPreferences] = useState({
    bufferTime: 0,
    minAdvanceTime: 0,
    maxFutureBooking: 365,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [availData, prefData] = await Promise.all([
        isOwnProfile ? availabilityApi.getMyAvailability() : availabilityApi.getUserAvailability(userId),
        isOwnProfile ? availabilityApi.getMyPreferences() : Promise.resolve(null),
      ]);

      setAvailability(availData.availability);

      // Convert to local editing state
      const editState: Record<number, { startTime: string; endTime: string; isActive: boolean }> = {};
      availData.availability.forEach((avail) => {
        editState[avail.dayOfWeek] = {
          startTime: avail.startTime,
          endTime: avail.endTime,
          isActive: avail.isActive,
        };
      });
      setEditedAvailability(editState);

      if (prefData) {
        setEditedPreferences({
          bufferTime: prefData.bufferTime,
          minAdvanceTime: prefData.minAdvanceTime,
          maxFutureBooking: prefData.maxFutureBooking,
        });
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability settings");
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDayToggle = (dayOfWeek: number, isActive: boolean) => {
    setEditedAvailability((prev) => ({
      ...prev,
      [dayOfWeek]: {
        startTime: prev[dayOfWeek]?.startTime || "00:00",
        endTime: prev[dayOfWeek]?.endTime || "00:00",
        isActive,
      },
    }));
  };

  const handleTimeChange = (
    dayOfWeek: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setEditedAvailability((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value,
        isActive: prev[dayOfWeek]?.isActive ?? true,
      },
    }));
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);

      // Convert edited state to API format
      const availabilityData = Object.entries(editedAvailability)
        .filter(([, data]) => data.isActive)
        .map(([dayOfWeek, data]) => ({
          dayOfWeek: parseInt(dayOfWeek),
          startTime: data.startTime,
          endTime: data.endTime,
          isActive: data.isActive,
        }));

      await availabilityApi.setMultipleDaysAvailability({ availability: availabilityData });

      toast.success("Availability settings saved successfully");

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error saving availability:", error);
      toast.error("Failed to save availability settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);

      await availabilityApi.updatePreferences(editedPreferences);

      toast.success("Booking preferences saved successfully");

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save booking preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // View-only mode for other users' profiles
  if (!isOwnProfile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Unavailable Hours</CardTitle>
            <CardDescription>Times when this user is NOT available for sessions (Available 24/7 by default)</CardDescription>
          </CardHeader>
          <CardContent>
            {availability.filter(a => a.isActive).length === 0 ? (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">✓ Available 24/7</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">No blocked hours set</p>
              </div>
            ) : (
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const dayAvail = availability.find((a) => a.dayOfWeek === day.value);
                  if (!dayAvail || !dayAvail.isActive) return null;

                  return (
                    <div
                      key={day.value}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <span className="font-medium">{day.label}</span>
                      <Badge variant="destructive" className="w-full justify-center sm:w-auto">
                        Unavailable: {dayAvail.startTime} - {dayAvail.endTime}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit mode for own profile
  return (
    <div className="space-y-6">
      {/* Weekly Unavailability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Block Out Unavailable Hours
          </CardTitle>
          <CardDescription>
            You are available 24/7 by default. Add specific times when you are NOT available.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayData = editedAvailability[day.value];
            const isBlocked = dayData?.isActive ?? false;

            return (
              <div key={day.value} className="space-y-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start sm:items-center gap-3">
                    <Switch
                      checked={isBlocked}
                      onCheckedChange={(checked) => handleDayToggle(day.value, checked)}
                    />
                    <Label className="font-medium">
                      {day.label}
                      {!isBlocked && <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Available all day)</span>}
                      {isBlocked && <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Blocked)</span>}
                    </Label>
                  </div>
                  {isBlocked && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
                      <Input
                        type="time"
                        value={dayData?.startTime || "00:00"}
                        onChange={(e) => handleTimeChange(day.value, "startTime", e.target.value)}
                        className="w-full sm:w-28"
                      />
                      <span className="text-center text-muted-foreground sm:text-left">to</span>
                      <Input
                        type="time"
                        value={dayData?.endTime || "00:00"}
                        onChange={(e) => handleTimeChange(day.value, "endTime", e.target.value)}
                        className="w-full sm:w-28"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md mt-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Leave all days off to stay available 24/7. Toggle a day ON to block specific hours.
            </p>
          </div>

          <Button onClick={handleSaveAvailability} disabled={saving} className="w-full mt-4">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Unavailable Hours
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Booking Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Booking Preferences
          </CardTitle>
          <CardDescription>
            Configure buffer time and booking windows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bufferTime">Buffer Time (minutes)</Label>
            <Input
              id="bufferTime"
              type="number"
              min="0"
              max="120"
              value={editedPreferences.bufferTime}
              onChange={(e) =>
                setEditedPreferences((prev) => ({
                  ...prev,
                  bufferTime: parseInt(e.target.value) || 0,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Minimum gap between sessions (0 = back-to-back sessions allowed)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minAdvanceTime">Minimum Advance Notice (minutes)</Label>
            <Input
              id="minAdvanceTime"
              type="number"
              min="0"
              max="10080"
              value={editedPreferences.minAdvanceTime}
              onChange={(e) =>
                setEditedPreferences((prev) => ({
                  ...prev,
                  minAdvanceTime: parseInt(e.target.value) || 0,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              How far in advance must sessions be booked (0 = instant booking allowed)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxFutureBooking">Maximum Booking Window (days)</Label>
            <Input
              id="maxFutureBooking"
              type="number"
              min="1"
              max="365"
              value={editedPreferences.maxFutureBooking}
              onChange={(e) =>
                setEditedPreferences((prev) => ({
                  ...prev,
                  maxFutureBooking: parseInt(e.target.value) || 365,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              How far in advance can sessions be booked (365 = 1 year ahead)
            </p>
          </div>

          <Button onClick={handleSavePreferences} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>Default:</strong> You&apos;re available 24/7 with instant booking (no restrictions)</p>
          <p>• <strong>Block Hours:</strong> Toggle days ON to block specific unavailable times</p>
          <p>• <strong>Buffer Time (0):</strong> Back-to-back sessions allowed. Increase if you need breaks</p>
          <p>• <strong>Advance Notice (0):</strong> Instant booking allowed. Increase to prevent last-minute bookings</p>
          <p>• <strong>Booking Window (365):</strong> Sessions can be booked up to 1 year ahead</p>
        </CardContent>
      </Card>
    </div>
  );
}
