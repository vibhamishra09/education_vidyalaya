"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Clock, Calendar, Plus, Trash2, Save } from "lucide-react";
import { availabilityApi } from "@/lib/api";
import type { UserAvailability, UserPreferences } from "@/lib/api/availability.api";
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
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Local state for editing
  const [editedAvailability, setEditedAvailability] = useState<
    Record<number, { startTime: string; endTime: string; isActive: boolean }>
  >({});

  const [editedPreferences, setEditedPreferences] = useState({
    bufferTime: 15,
    minAdvanceTime: 120,
    maxFutureBooking: 30,
  });

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
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
        setPreferences(prefData);
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
  };

  const handleDayToggle = (dayOfWeek: number, isActive: boolean) => {
    setEditedAvailability((prev) => ({
      ...prev,
      [dayOfWeek]: {
        startTime: prev[dayOfWeek]?.startTime || "09:00",
        endTime: prev[dayOfWeek]?.endTime || "17:00",
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
        .filter(([_, data]) => data.isActive)
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
            <CardTitle>Weekly Availability</CardTitle>
            <CardDescription>When this user is available for sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {availability.length === 0 ? (
              <p className="text-sm text-muted-foreground">No availability set</p>
            ) : (
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const dayAvail = availability.find((a) => a.dayOfWeek === day.value);
                  if (!dayAvail || !dayAvail.isActive) return null;

                  return (
                    <div key={day.value} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">{day.label}</span>
                      <Badge variant="secondary">
                        {dayAvail.startTime} - {dayAvail.endTime}
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
      {/* Weekly Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Availability
          </CardTitle>
          <CardDescription>
            Set your available hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayData = editedAvailability[day.value];
            const isActive = dayData?.isActive ?? false;

            return (
              <div key={day.value} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => handleDayToggle(day.value, checked)}
                    />
                    <Label className="font-medium">{day.label}</Label>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={dayData?.startTime || "09:00"}
                        onChange={(e) => handleTimeChange(day.value, "startTime", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={dayData?.endTime || "17:00"}
                        onChange={(e) => handleTimeChange(day.value, "endTime", e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <Button onClick={handleSaveAvailability} disabled={saving} className="w-full mt-4">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Availability
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
              Minimum gap between sessions (0-120 minutes)
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
              How far in advance must sessions be booked (e.g., 120 = 2 hours)
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
                  maxFutureBooking: parseInt(e.target.value) || 1,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              How far in advance can sessions be booked (1-365 days)
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
          <p>• <strong>Weekly Availability:</strong> Toggle days on/off and set your working hours</p>
          <p>• <strong>Buffer Time:</strong> Adds a gap between sessions (recommended: 15 minutes)</p>
          <p>• <strong>Advance Notice:</strong> Prevents last-minute bookings (recommended: 2 hours)</p>
          <p>• <strong>Booking Window:</strong> Limits how far ahead people can book (recommended: 30 days)</p>
        </CardContent>
      </Card>
    </div>
  );
}
