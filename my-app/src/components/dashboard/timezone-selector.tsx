"use client";

import { useState } from "react";
import { Globe, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Common timezones
const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)", offset: "UTC-5" },
  { value: "America/Chicago", label: "Central Time (CT)", offset: "UTC-6" },
  { value: "America/Denver", label: "Mountain Time (MT)", offset: "UTC-7" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "UTC-8" },
  { value: "America/Phoenix", label: "Arizona (MST)", offset: "UTC-7" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)", offset: "UTC-9" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)", offset: "UTC-10" },
  { value: "Europe/London", label: "London (GMT/BST)", offset: "UTC+0" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)", offset: "UTC+1" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)", offset: "UTC+1" },
  { value: "Europe/Moscow", label: "Moscow (MSK)", offset: "UTC+3" },
  { value: "Asia/Dubai", label: "Dubai (GST)", offset: "UTC+4" },
  { value: "Asia/Kolkata", label: "India (IST)", offset: "UTC+5:30" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", offset: "UTC+8" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: "UTC+9" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)", offset: "UTC+8" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)", offset: "UTC+11" },
  { value: "Pacific/Auckland", label: "Auckland (NZDT)", offset: "UTC+13" },
];

interface TimezoneSelectorProps {
  value?: string;
  onChange?: (timezone: string) => void;
  variant?: "default" | "compact" | "card";
}

export function TimezoneSelector({
  value,
  onChange,
  variant = "default",
}: TimezoneSelectorProps) {
  // Detect user's timezone
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedTimezone, setSelectedTimezone] = useState(
    value || detectedTimezone || "America/New_York"
  );

  const handleTimezoneChange = (newTimezone: string) => {
    setSelectedTimezone(newTimezone);
    onChange?.(newTimezone);
  };

  const getCurrentTime = () => {
    try {
      return new Date().toLocaleTimeString("en-US", {
        timeZone: selectedTimezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Invalid timezone";
    }
  };

  const selectedTz = COMMON_TIMEZONES.find((tz) => tz.value === selectedTimezone);

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value} className="text-xs">
                <div className="flex items-center justify-between gap-2 w-full">
                  <span>{tz.label}</span>
                  <span className="text-muted-foreground">{tz.offset}</span>
                  {tz.value === detectedTimezone && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      Local
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{getCurrentTime()}</span>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Timezone Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span>{tz.label}</span>
                    <span className="text-muted-foreground text-xs">{tz.offset}</span>
                    {tz.value === detectedTimezone && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Local
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Current time:</span>
            <span className="font-medium">{getCurrentTime()}</span>
          </div>

          {selectedTz && (
            <div className="text-xs text-muted-foreground">
              All session times will be displayed in {selectedTz.label}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Globe className="h-4 w-4" />
        Timezone
      </label>
      <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {COMMON_TIMEZONES.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              <div className="flex items-center justify-between gap-4">
                <span>{tz.label}</span>
                <span className="text-muted-foreground text-xs">{tz.offset}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Current time: <span className="font-medium">{getCurrentTime()}</span>
      </p>
    </div>
  );
}
