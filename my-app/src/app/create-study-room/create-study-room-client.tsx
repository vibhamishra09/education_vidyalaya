"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Navigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkillInput } from "@/components/ui/skill-input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, Users, Loader2, Coins, CheckCircle2, AlertCircle,
  RotateCcw, Sparkles, Calendar, Layers, 
  Banknote, Plus,
  Clock, Upload, X, Image as ImageIcon, Trash2,
} from "lucide-react";
import {
  CreateStudyRoomDto,
  StudyRoom,
  StudyRoomRecurrenceMode,
  StudyRoomSessionMode,
} from "@/types/api.types";
import { ShareButton } from "@/components/share/share-button";
import { useFormPersistence } from "@/hooks/use-local-storage";
import { useCreateRecurringRoom, useCreateStudyRoom } from "@/hooks/use-study-rooms";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadFile, validateImageFile } from "@/lib/upload";
import { setAuthToken } from "@/lib/api-client";
import {
  getStudyRoomPagePath,
  getStudyRoomShareUrl,
} from "@/lib/utils/study-room-share";
import { getDisplayAppOrigin } from "@/lib/utils/public-url";
import { SpamShield } from "@/components/spamguard/spamguard";

interface StudyRoomFormData {
  title: string;
  description: string;
  imageUrl?: string;
  skills: string[];
  date: string;
  time: string;
  duration: string;
  maxParticipants: string;
  joiningFee: string;
  recurrenceEnabled: boolean;
  recurrenceMode: StudyRoomRecurrenceMode;
  recurrenceInterval: string;
  recurrenceWeekdays: number[];
  recurrenceCustomDates: string;
  recurrenceRepeatUntil: string;
}

const initialFormData: StudyRoomFormData = {
  title: "",
  description: "",
  skills: [],
  date: "",
  time: "",
  duration: "60",
  maxParticipants: "5",
  joiningFee: "0",
  recurrenceEnabled: false,
  recurrenceMode: StudyRoomRecurrenceMode.DAILY,
  recurrenceInterval: "1",
  recurrenceWeekdays: [],
  recurrenceCustomDates: "",
  recurrenceRepeatUntil: "",
};

const weekdayOptions = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Public page where attendees register for a webinar. Same URL for the success dialog, copy, and Share.
 * Uses {@link getDisplayAppOrigin} so localhost dev shows `http://localhost:…` while production shows webyalaya.com.
 */
function getWebinarRegistrationAbsUrl(room: StudyRoom): string | null {
  const slug = room.webinarRegistrationSlug;
  const raw = room.webinarRegistrationUrl?.trim();
  const origin = getDisplayAppOrigin();

  let pathWithQuery = "";
  if (raw) {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const u = new URL(raw);
        pathWithQuery = `${u.pathname}${u.search}${u.hash}`;
      } catch {
        return raw;
      }
    } else if (raw.startsWith("/")) {
      pathWithQuery = raw;
    }
  }
  if (!pathWithQuery && slug) {
    pathWithQuery = `/webinar/register/${encodeURIComponent(slug)}`;
  }
  if (!pathWithQuery) return null;
  return `${origin}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;
}

function estimateOccurrences(formData: StudyRoomFormData): number {
  if (!formData.recurrenceEnabled || !formData.date || !formData.recurrenceRepeatUntil) {
    return 1;
  }

  const start = parseDateOnly(formData.date);
  const end = parseDateOnly(formData.recurrenceRepeatUntil);
  if (!start || !end || end < start) return 0;

  const interval = Math.max(1, parseInt(formData.recurrenceInterval || "1"));
  const dayMs = 24 * 60 * 60 * 1000;
  const resultDates = new Set<string>();

  if (formData.recurrenceMode === StudyRoomRecurrenceMode.CUSTOM_DATES) {
    const rawDates = formData.recurrenceCustomDates
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    rawDates.push(formData.date);
    for (const dateStr of rawDates) {
      const current = parseDateOnly(dateStr);
      if (!current) continue;
      if (current >= start && current <= end) {
        resultDates.add(current.toISOString().split("T")[0]);
      }
    }
    return resultDates.size;
  }

  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + dayMs)) {
    const diffDays = Math.floor((cursor.getTime() - start.getTime()) / dayMs);
    if (formData.recurrenceMode === StudyRoomRecurrenceMode.DAILY) {
      if (diffDays % interval === 0) {
        resultDates.add(cursor.toISOString().split("T")[0]);
      }
      continue;
    }

    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex % interval === 0 && formData.recurrenceWeekdays.includes(cursor.getUTCDay())) {
      resultDates.add(cursor.toISOString().split("T")[0]);
    }
  }

  return resultDates.size;
}

export function CreateStudyRoomClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded: isAuthLoaded, getToken } = useAuth();
  const createStudyRoomMutation = useCreateStudyRoom();
  const createRecurringRoomMutation = useCreateRecurringRoom()
  const [spamStatus, setSpamStatus] = useState({ isSafe: true, isVerifying: false });

  const { formData, setFormData, updateField, clearForm, hasStoredData } = useFormPersistence<StudyRoomFormData>(
    "create_study_room",
    initialFormData,
    {
      debounceMs: 300,
      expiresIn: 24 * 60 * 60 * 1000,
      excludeFields: ["date", "time"],
    }
  );

  const [isInstantRoom, setIsInstantRoom] = useState(false);
  const [sessionMode, setSessionMode] = useState<StudyRoomSessionMode>("STANDARD");

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "webinar" || mode === "WEBINAR") {
      setSessionMode("WEBINAR");
    }
  }, [searchParams]);

  type WebinarRegField = {
    id: string;
    label: string;
    type: "text" | "textarea" | "email" | "number";
    required: boolean;
  };
  const [webinarCustomFields, setWebinarCustomFields] = useState<
    WebinarRegField[]
  >([]);
  const [webinarPerms, setWebinarPerms] = useState({
    mic: "disabled" as "disabled" | "enabled",
    video: "disabled" as "disabled" | "enabled",
    chat: "host_only" as "host_only" | "everyone" | "disabled",
    screenShare: "host_only" as "host_only" | "everyone",
  });
  /** When false, registrants are auto-approved; host panel hides Admit. */
  const [webinarWaitingRoomEnabled, setWebinarWaitingRoomEnabled] =
    useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<StudyRoom | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const defaultsHydratedRef = useRef(false);

  // Sync instant room time
  useEffect(() => {
    if (isInstantRoom) {
      const now = new Date();
      setFormData((prev) => ({
        ...prev,
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().slice(0, 5),
      }));
    }
  }, [isInstantRoom, setFormData]);

  // Backfill persisted drafts that may have blank numeric defaults.
  useEffect(() => {
    if (defaultsHydratedRef.current) return;
    defaultsHydratedRef.current = true;
    setFormData((prev) => ({
      ...prev,
      duration: prev.duration?.trim() ? prev.duration : initialFormData.duration,
      maxParticipants: prev.maxParticipants?.trim()
        ? prev.maxParticipants
        : initialFormData.maxParticipants,
      joiningFee: prev.joiningFee?.trim()
        ? prev.joiningFee
        : initialFormData.joiningFee,
    }));
  }, [setFormData]);

  useEffect(() => {
    if (!formData.date || formData.recurrenceRepeatUntil) return;
    const date = new Date(formData.date);
    date.setDate(date.getDate() + 30);
    const repeatUntil = date.toISOString().split("T")[0];
    updateField("recurrenceRepeatUntil", repeatUntil);
  }, [formData.date, formData.recurrenceRepeatUntil, updateField]);

  // Load image preview from persisted form data
  useEffect(() => {
    if (formData.imageUrl && !imagePreview) {
      setImagePreview(formData.imageUrl);
    }
  }, [formData.imageUrl, imagePreview]);

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleClearForm = useCallback(() => {
    clearForm();
    setFormData(initialFormData);
    setImagePreview(null);
    setSpamStatus({isSafe: false, isVerifying: false})
  }, [clearForm, setFormData]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingImage(true);
    setError(null);
    
    try {
      // Get auth token
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Upload file
      const fileUrl = await uploadFile(file, 'document');
      updateField("imageUrl", fileUrl);
    } catch (_error) {
      setError('Failed to upload image. Please try again.');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    updateField("imageUrl", undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthLoaded) {
      setError('Please wait for authentication to load');
      return;
    }

    if (!formData.title?.trim()) {
        setError("Please add a room name");
        return;
    }

    if (formData.skills.length === 0) {
        setError("Please add at least one skill");
        return;
    }

    if (!isInstantRoom && (!formData.date || !formData.time)) {
        setError('Please select date and time');
        return;
    }

    if (sessionMode === "WEBINAR" && formData.recurrenceEnabled) {
      setError("Turn off recurrence for webinar mode, or switch to study room mode.");
      return;
    }

    if (!isInstantRoom && formData.recurrenceEnabled) {
      if (!formData.recurrenceRepeatUntil) {
        setError("Please select repeat-until date");
        return;
      }
      if (formData.recurrenceMode === StudyRoomRecurrenceMode.WEEKLY && formData.recurrenceWeekdays.length === 0) {
        setError("Please select at least one weekday for weekly recurrence");
        return;
      }
      if (
        formData.recurrenceMode === StudyRoomRecurrenceMode.CUSTOM_DATES &&
        formData.recurrenceCustomDates.split(",").map((d) => d.trim()).filter(Boolean).length === 0
      ) {
        setError("Please provide custom dates separated by commas (YYYY-MM-DD)");
        return;
      }
      const occurrenceCount = estimateOccurrences(formData);
      if (occurrenceCount === 0) {
        setError("No valid occurrences were found for the selected recurrence.");
        return;
      }
      if (occurrenceCount > 366) {
        setError("Recurrence creates too many sessions. Please shorten the range.");
        return;
      }
    }

    setError(null);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const createData: CreateStudyRoomDto = {
      title: formData.title,
      description: formData.description || undefined,
      imageUrl: formData.imageUrl || undefined,
      skills: formData.skills,
      date: formData.date,
      time: formData.time,
      duration: parseInt(formData.duration),
      maxParticipants: Math.min(
        sessionMode === "WEBINAR" ? 100 : 12,
        Math.max(2, parseInt(formData.maxParticipants, 10) || 2),
      ),
      joiningFee:
        sessionMode === "WEBINAR" ? 0 : parseFloat(formData.joiningFee),
      timezone: userTimezone,
      ...(sessionMode === "WEBINAR"
        ? { sessionMode: "WEBINAR" as const }
        : { sessionMode: "STANDARD" as const }),
      ...(sessionMode === "WEBINAR"
        ? {
            webinarConfig: {
              registrationFields: [
                {
                  id: "name",
                  label: "Full name",
                  required: true,
                  type: "text",
                },
                {
                  id: "email",
                  label: "Email",
                  required: true,
                  type: "email",
                },
                ...webinarCustomFields.map((f) => ({
                  id: f.id,
                  label: f.label.trim() || "Field",
                  required: f.required,
                  type: f.type,
                })),
              ],
              permissions: {
                mic: webinarPerms.mic,
                video: webinarPerms.video,
                chat: webinarPerms.chat,
                screenShare: webinarPerms.screenShare,
              },
              runtime: {
                chatEnabled: true,
                waitingRoomEnabled: webinarWaitingRoomEnabled,
              },
            },
          }
        : {}),
    };

    if (!isInstantRoom && formData.recurrenceEnabled && sessionMode !== "WEBINAR") {
      createData.recurrence = {
        mode: formData.recurrenceMode,
        interval: Math.max(1, parseInt(formData.recurrenceInterval || "1")),
        repeatUntil: formData.recurrenceRepeatUntil,
        ...(formData.recurrenceMode === StudyRoomRecurrenceMode.WEEKLY
          ? { weekdays: formData.recurrenceWeekdays }
          : {}),
        ...(formData.recurrenceMode === StudyRoomRecurrenceMode.CUSTOM_DATES
          ? {
              customDates: formData.recurrenceCustomDates
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
            }
          : {}),
      };
    }

    // Refresh time for instant rooms to avoid "past time" errors if user took too long
    if (isInstantRoom) {
      const now = new Date();
      // Use local date components to match the local timezone
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      createData.date = `${year}-${month}-${day}`;
      
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      createData.time = `${hours}:${minutes}`;
    }

    const isRecurring = !isInstantRoom && formData.recurrenceEnabled;

    const mutation = isRecurring ? createRecurringRoomMutation : createStudyRoomMutation;    

    mutation.mutate(createData, {
      onSuccess: (room) => {
        clearForm();
        setCreatedRoom(room);
        setShowSuccessDialog(true);
      },
      onError: (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 
          (err && typeof err === 'object' && 'message' in err) ? String((err as { message: string }).message) : 
          'Failed to create study room';
        setError(errorMessage);
      },
    });
  };

  const maxParticipantsClamped = Math.min(
    100,
    Math.max(2, parseInt(formData.maxParticipants, 10) || 2),
  );

  const potentialEarnings =
    sessionMode === "WEBINAR"
      ? 0
      : maxParticipantsClamped * (parseInt(formData.joiningFee, 10) || 0);

  return (
    <div className="flex flex-col min-h-screen bg-muted/5 selection:bg-primary/10">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-10 gap-4 max-w-7xl mx-auto">
          <div className="space-y-2">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground transition-all group w-fit"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
              Back to Dashboard
            </Link>
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 pb-1">
                Create Study Room
              </h1>
              <p className="text-muted-foreground text-lg">
                Share your expertise, host a session, and earn crypto.
              </p>
              <div className="flex flex-wrap gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSessionMode("STANDARD");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                    sessionMode === "STANDARD"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  }`}
                >
                  Study room
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSessionMode("WEBINAR");
                    setFormData((prev) => ({
                      ...prev,
                      maxParticipants: "100",
                      joiningFee: "0",
                    }));
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                    sessionMode === "WEBINAR"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  }`}
                >
                  Webinar mode
                </button>
              </div>
            </div>
          </div>

          {hasStoredData && (
             <Button
             variant="outline"
             size="sm"
             onClick={handleClearForm}
             className="hidden md:flex border-dashed border-muted-foreground/30 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
           >
             <RotateCcw className="h-3.5 w-3.5 mr-2" />
             Reset Draft
           </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto">
          {/* Stack title above the 2-col grid — avoids grid col-span quirks on small breakpoints */}
          <div className="flex flex-col gap-8 lg:gap-12">
            <div className="w-full space-y-2 shrink-0">
              <Label htmlFor="title" className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                Room Name
              </Label>
              <div className="relative group transition-all duration-200">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/0 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                <div className="relative bg-card border-2 border-dashed border-muted group-hover:border-primary/30 group-focus-within:border-primary/50 group-focus-within:border-solid rounded-xl transition-all duration-200 flex items-center">
                 <SpamShield context="title" onStatusChange={setSpamStatus}>
                  <Input
                    id="title"
                    placeholder="Enter a catchy title..."
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    className="h-auto py-4 px-4 text-2xl md:text-3xl font-bold border-none shadow-none focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground/30 w-full"
                    autoFocus
                  />
                </SpamShield>
                  <div className="absolute right-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/50 px-2 py-1 rounded border">
                      Edit
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* LEFT COLUMN: Main Content (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
              {/* Section 1: webinar (webinar mode) then topic */}
              <section className="space-y-6">
                {sessionMode === "WEBINAR" && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Webinar registration & permissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Extra registration fields
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Name and email are always required. Add optional or
                        required questions below.
                      </p>
                      {webinarCustomFields.map((field, idx) => (
                        <div
                          key={field.id}
                          className="flex flex-wrap gap-2 items-end rounded-lg border bg-background p-3"
                        >
                          <div className="flex-1 min-w-[140px] space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                setWebinarCustomFields((prev) =>
                                  prev.map((f, i) =>
                                    i === idx
                                      ? { ...f, label: e.target.value }
                                      : f,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="w-[130px] space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(
                                v: "text" | "textarea" | "email" | "number",
                              ) =>
                                setWebinarCustomFields((prev) =>
                                  prev.map((f, i) =>
                                    i === idx ? { ...f, type: v } : f,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Short text</SelectItem>
                                <SelectItem value="textarea">Long text</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <label className="flex items-center gap-2 text-sm pb-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                setWebinarCustomFields((prev) =>
                                  prev.map((f, i) =>
                                    i === idx
                                      ? { ...f, required: e.target.checked }
                                      : f,
                                  ),
                                )
                              }
                            />
                            Required
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() =>
                              setWebinarCustomFields((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            aria-label="Remove field"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setWebinarCustomFields((prev) => [
                            ...prev,
                            {
                              id: `f_${Date.now()}`,
                              label: "Custom question",
                              type: "text",
                              required: false,
                            },
                          ])
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add field
                      </Button>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                      <Label className="text-sm font-medium">
                        Waiting room
                      </Label>
                      <p className="text-xs text-muted-foreground max-w-xl">
                        When on, you admit attendees from the webinar panel and
                        get notified when someone registers. When off, attendees
                        are approved automatically.
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-3">
                        <span className="text-sm text-foreground">
                          Require host to admit guests before they join
                        </span>
                        <Switch
                          checked={webinarWaitingRoomEnabled}
                          onCheckedChange={setWebinarWaitingRoomEnabled}
                          className="shrink-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                      <Label className="text-sm font-medium">
                        Participant capabilities
                      </Label>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Microphone</Label>
                          <Select
                            value={webinarPerms.mic}
                            onValueChange={(v: "disabled" | "enabled") =>
                              setWebinarPerms((p) => ({ ...p, mic: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disabled">Disabled</SelectItem>
                              <SelectItem value="enabled">Enabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Camera</Label>
                          <Select
                            value={webinarPerms.video}
                            onValueChange={(v: "disabled" | "enabled") =>
                              setWebinarPerms((p) => ({ ...p, video: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disabled">Disabled</SelectItem>
                              <SelectItem value="enabled">Enabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Chat</Label>
                          <Select
                            value={webinarPerms.chat}
                            onValueChange={(
                              v: "host_only" | "everyone" | "disabled",
                            ) =>
                              setWebinarPerms((p) => ({ ...p, chat: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="host_only">Host only</SelectItem>
                              <SelectItem value="everyone">Everyone</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Screen share</Label>
                          <Select
                            value={webinarPerms.screenShare}
                            onValueChange={(v: "host_only" | "everyone") =>
                              setWebinarPerms((p) => ({ ...p, screenShare: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="host_only">Host only</SelectItem>
                              <SelectItem value="everyone">Everyone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}

                <Card className="border-muted bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow" style={{position: "relative", zIndex: 10}}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground/80">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Layers className="h-4 w-4" />
                      </div>
                      What&apos;s this room about?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                        Description{" "}
                        <span className="text-[10px] normal-case bg-muted px-1.5 rounded-sm">Optional</span>
                      </Label>
                      <SpamShield context="description">
                        <Textarea
                          id="description"
                          placeholder="Provide a brief agenda or learning outcomes..."
                          value={formData.description}
                          onChange={(e) => updateField("description", e.target.value)}
                          rows={4}
                          className="resize-none bg-background/50 focus:bg-background transition-colors"
                        />
                      </SpamShield>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                        Cover Image <span className="text-[10px] normal-case bg-muted px-1.5 rounded-sm">Optional</span>
                      </Label>
                      <div className="space-y-3">
                        {imagePreview || formData.imageUrl ? (
                          <div className="relative group">
                            <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-border bg-muted/50">
                              <Image
                                src={imagePreview || formData.imageUrl!}
                                alt="Study room preview"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleRemoveImage}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                disabled={uploadingImage}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Image will be used in social media previews when sharing
                            </p>
                          </div>
                        ) : (
                          <label>
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                              onChange={handleImageUpload}
                              className="hidden"
                              disabled={uploadingImage}
                            />
                            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer">
                              {uploadingImage ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                  <p className="text-sm text-muted-foreground">Uploading...</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Upload cover image</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      JPEG, PNG, WebP, or GIF (max 5MB)
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    asChild
                                  >
                                    <span>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Choose Image
                                    </span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Tags & Skills</Label>
                      <SkillInput
                        label=""
                        placeholder="Type a skill (e.g. React, Math) and press Enter..."
                        selectedSkills={formData.skills}
                        onSkillsChange={(skills) => updateField("skills", skills)}
                        maxSkills={10}
                      />
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Section 2: Schedule */}
              <Card className="border-muted bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-3">
                   <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground/80">
                      <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      When & Where
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Instant Room Switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-background to-muted/20">
                    <div className="space-y-0.5">
                      <Label htmlFor="instant-room" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                        <Sparkles className={cn("h-4 w-4 transition-colors", isInstantRoom ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                        Instant Session
                      </Label>
                      <p className="text-xs text-muted-foreground">Start immediately. No scheduling required.</p>
                    </div>
                    <Switch
                      id="instant-room"
                      checked={isInstantRoom}
                      onCheckedChange={setIsInstantRoom}
                    />
                  </div>

                  {/* Collapsible Date/Time inputs */}
                  <AnimatePresence>
                    {!isInstantRoom && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="grid sm:grid-cols-2 gap-5 pb-2">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Date</Label>
                            <div className="relative">
                              <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => updateField("date", e.target.value)}
                                required={!isInstantRoom}
                                min={new Date().toISOString().split("T")[0]}
                                className="pl-10"
                              />
                              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Time</Label>
                             <div className="relative">
                              <Input
                                type="time"
                                value={formData.time}
                                onChange={(e) => updateField("time", e.target.value)}
                                required={!isInstantRoom}
                                className="pl-10"
                              />
                              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                             </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isInstantRoom && (
                    <div className="space-y-4 pt-2 border-t border-dashed">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-semibold cursor-pointer">Repeat Schedule</Label>
                          <p className="text-xs text-muted-foreground">
                            Daily, weekly, or custom dates up to one year
                          </p>
                        </div>
                        <Switch
                          checked={formData.recurrenceEnabled}
                          onCheckedChange={(checked) => updateField("recurrenceEnabled", checked)}
                        />
                      </div>

                      {formData.recurrenceEnabled && (
                        <div className="space-y-4 p-4 rounded-lg border bg-background/50">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">
                              Repeat Type
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: "Daily", value: StudyRoomRecurrenceMode.DAILY },
                                { label: "Weekly", value: StudyRoomRecurrenceMode.WEEKLY },
                                { label: "Custom", value: StudyRoomRecurrenceMode.CUSTOM_DATES },
                              ].map((mode) => (
                                <Button
                                  key={mode.value}
                                  type="button"
                                  variant={formData.recurrenceMode === mode.value ? "default" : "outline"}
                                  className="h-9 text-xs"
                                  onClick={() => updateField("recurrenceMode", mode.value)}
                                >
                                  {mode.label}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                Every
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                max="30"
                                value={formData.recurrenceInterval}
                                onChange={(e) => updateField("recurrenceInterval", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                Repeat Until
                              </Label>
                              <Input
                                type="date"
                                value={formData.recurrenceRepeatUntil}
                                min={formData.date || new Date().toISOString().split("T")[0]}
                                max={(() => {
                                  const base = formData.date ? new Date(formData.date) : new Date();
                                  base.setDate(base.getDate() + 365);
                                  return base.toISOString().split("T")[0];
                                })()}
                                onChange={(e) => updateField("recurrenceRepeatUntil", e.target.value)}
                              />
                            </div>
                          </div>

                          {formData.recurrenceMode === StudyRoomRecurrenceMode.WEEKLY && (
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                Weekdays
                              </Label>
                              <div className="grid grid-cols-7 gap-2">
                                {weekdayOptions.map((day) => {
                                  const selected = formData.recurrenceWeekdays.includes(day.value);
                                  return (
                                    <Button
                                      key={day.value}
                                      type="button"
                                      variant={selected ? "default" : "outline"}
                                      className="h-8 px-0 text-[11px]"
                                      onClick={() => {
                                        const next = selected
                                          ? formData.recurrenceWeekdays.filter((d) => d !== day.value)
                                          : [...formData.recurrenceWeekdays, day.value];
                                        updateField("recurrenceWeekdays", next.sort((a, b) => a - b));
                                      }}
                                    >
                                      {day.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {formData.recurrenceMode === StudyRoomRecurrenceMode.CUSTOM_DATES && (
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                Custom Dates
                              </Label>
                              <Textarea
                                rows={3}
                                placeholder="YYYY-MM-DD, YYYY-MM-DD, ..."
                                value={formData.recurrenceCustomDates}
                                onChange={(e) => updateField("recurrenceCustomDates", e.target.value)}
                                className="font-mono text-xs"
                              />
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">
                            This will create approximately {estimateOccurrences(formData)} sessions.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Settings & Earnings (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Settings Card */}
              <Card className="border-muted bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader>
                   <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground/80">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Users className="h-4 w-4" />
                      </div>
                      Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  
                  {/* Duration */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Session Duration</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {["30", "45", "60", "90"].map((mins) => (
                        <button 
                          key={mins}
                          type="button"
                          onClick={() => updateField("duration", mins)}
                          className={cn(
                            "py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 border",
                            formData.duration === mins 
                              ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800" 
                              : "bg-background border-input hover:border-blue-200 hover:bg-blue-50/50"
                          )}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <Label className="text-sm font-medium">Max participants</Label>
                        {sessionMode === "WEBINAR" ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Webinar: 2–100 attendees (required range)
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Up to 12 per session
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-bold bg-muted px-2.5 py-0.5 rounded-md min-w-[2rem] text-center shrink-0">
                        {maxParticipantsClamped}
                      </span>
                    </div>
                    <div className="pt-2 px-1">
                      <input
                        type="range"
                        min="2"
                        max={sessionMode === "WEBINAR" ? "100" : "12"}
                        step="1"
                        value={maxParticipantsClamped}
                        onChange={(e) =>
                          updateField("maxParticipants", e.target.value)
                        }
                        // Modified: Modern Slider Styling
                        className={cn(
                          "w-full h-2 rounded-lg appearance-none cursor-pointer outline-none",
                          // Track
                          "bg-slate-200 dark:bg-slate-700",
                          // Accent Color (Fill)
                          "accent-blue-600 dark:accent-blue-500",

                          // Webkit Thumb
                          "[&::-webkit-slider-thumb]:appearance-none",
                          "[&::-webkit-slider-thumb]:h-5",
                          "[&::-webkit-slider-thumb]:w-5",
                          "[&::-webkit-slider-thumb]:rounded-full",
                          "[&::-webkit-slider-thumb]:bg-white",
                          "[&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.1)]",
                          "[&::-webkit-slider-thumb]:border-2",
                          "[&::-webkit-slider-thumb]:border-blue-600",
                          "[&::-webkit-slider-thumb]:dark:border-blue-500",
                          "[&::-webkit-slider-thumb]:transition-transform",
                          "[&::-webkit-slider-thumb]:hover:scale-110",

                          // Firefox Thumb
                          "[&::-moz-range-thumb]:h-5",
                          "[&::-moz-range-thumb]:w-5",
                          "[&::-moz-range-thumb]:rounded-full",
                          "[&::-moz-range-thumb]:bg-white",
                          "[&::-moz-range-thumb]:shadow-sm",
                          "[&::-moz-range-thumb]:border-2",
                          "[&::-moz-range-thumb]:border-blue-600",
                          "[&::-moz-range-thumb]:dark:border-blue-500"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
                        <span>2</span>
                        <span>{sessionMode === "WEBINAR" ? "100" : "12"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fee Input — webinars are always free */}
                  <div className="space-y-3 pt-2">
                    <Label className="flex items-center justify-between text-sm font-medium">
                      Entry fee
                      <span className="text-xs font-normal bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Coins className="h-3 w-3" /> Coins
                      </span>
                    </Label>
                    {sessionMode === "WEBINAR" ? (
                      <p className="text-xs text-muted-foreground">
                        Set to 0 for a free webinar.
                      </p>
                    ) : (
                      <>
                        <div className="relative group flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-lg border-input bg-background hover:bg-muted hover:text-foreground shrink-0"
                            onClick={() => {
                              const val = parseInt(formData.joiningFee) || 0;
                              if (val > 0)
                                updateField("joiningFee", (val - 5).toString());
                            }}
                          >
                            <span className="text-xl font-bold leading-none mb-0.5">
                              −
                            </span>
                          </Button>

                          <div className="relative flex-1">
                            <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              type="number"
                              min="0"
                              value={formData.joiningFee}
                              onChange={(e) =>
                                updateField("joiningFee", e.target.value)
                              }
                              className="pl-9 h-11 text-lg font-medium bg-background transition-all focus:ring-2 ring-primary/20 text-center"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-lg border-input bg-background hover:bg-muted hover:text-foreground shrink-0"
                            onClick={() => {
                              const val = parseInt(formData.joiningFee) || 0;
                              updateField("joiningFee", (val + 5).toString());
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Set to 0 for a free session.
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Earnings Preview & Action - Sticky */}
              <div className="sticky top-8 space-y-4">
                <Card className="border shadow-lg overflow-hidden relative group bg-card">
                   {/* Subtle faint blur bg instead of heavy gradient */}
                  <div className="absolute inset-0 bg-primary/5 opacity-50" />
                  
                  <CardContent className="pt-6 pb-6 px-5 relative z-10 text-foreground">
                    <div className="flex items-center justify-between mb-6 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {sessionMode === "WEBINAR"
                              ? "Entry fee"
                              : "Est. earnings"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black tracking-tight tabular-nums">
                              {potentialEarnings}
                            </span>
                            <span className="text-lg font-bold text-amber-500">
                              Coins
                            </span>
                          </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, scale: 0.95 }}
                          animate={{ opacity: 1, height: "auto", scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          className="flex items-center justify-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/50 py-3 px-4 rounded-xl shadow-sm mb-2"
                        >
                           <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          {error}
                        </motion.div>
                      )}

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 text-base font-bold shadow-sm hover:shadow-md transition-all rounded-lg bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/60"
                        disabled={
                          createStudyRoomMutation.isPending || createRecurringRoomMutation.isPending ||
                          !isAuthLoaded || spamStatus.isVerifying || !spamStatus.isSafe
                        }
                      >
                        {(createStudyRoomMutation.isPending || createRecurringRoomMutation.isPending) ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Creating Room...
                          </>
                        ) : (
                          <>
                            Launch Session
                            <CheckCircle2 className="h-5 w-5 ml-2 opacity-60" />
                          </>
                        )}
                      </Button>
                      
                    </div>
                  </CardContent>
                </Card>
                
                <p className="text-xs text-center text-muted-foreground px-4">
                  By launching, you agree to the <span className="underline cursor-pointer hover:text-foreground">host guidelines</span>.
                </p>
              </div>

            </div>
          </div>
          </div>
        </form>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={(open) => {
        if (!open) {
          setShowSuccessDialog(false);
          router.push("/dashboard");
        }
      }}>
        <DialogContent className="w-[92vw] max-w-md p-0 overflow-hidden border border-border/40 shadow-2xl rounded-[20px] bg-background">
          <div className="p-4 sm:p-6 flex flex-col items-center text-center space-y-4 sm:space-y-6">
            
            {/* Animated unique success Icon */}
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" strokeWidth={2.5} />
              </div>
               <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                 <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
               </div>
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold tracking-tight">Room Launched!</DialogTitle>
              <DialogDescription className="text-muted-foreground text-base max-w-[280px] mx-auto leading-relaxed">
                 Your session is ready. Invite friends or wait for learners to join.
              </DialogDescription>
            </div>
            
                {createdRoom &&
              (() => {
                const webinarRegUrl = getWebinarRegistrationAbsUrl(createdRoom);
                const isWebinarRoom =
                  createdRoom.sessionMode === "WEBINAR" ||
                  !!createdRoom.webinarRegistrationSlug;
                return (
              <div className="w-full space-y-3 sm:space-y-4">
                {isWebinarRoom && webinarRegUrl && (
                  <div className="w-full space-y-1">
                    <p className="text-xs font-semibold text-left">
                      Registration link (attendees sign up here)
                    </p>
                    <div className="w-full relative flex items-center justify-between gap-1.5 p-1 pl-2 sm:p-1.5 sm:pl-3 rounded-lg sm:rounded-xl border border-primary/30 bg-primary/5">
                      <span className="text-[10px] sm:text-xs text-foreground/80 truncate flex-1 font-mono text-left select-all break-all">
                        {webinarRegUrl}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        className="h-7 px-2 shrink-0 text-[10px]"
                        onClick={() => {
                          navigator.clipboard.writeText(webinarRegUrl);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }}
                      >
                        {isCopied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                )}
                {/* Standard rooms only: public study room URL (webinars use registration link above). */}
                {!isWebinarRoom && (
                  <div className="w-full space-y-1">
                    <p className="text-xs font-semibold text-left text-muted-foreground">
                      Share link (sign in to join)
                    </p>
                    <div className="w-full relative flex items-center justify-between gap-1.5 p-1 pl-2 sm:p-1.5 sm:pl-3 rounded-lg sm:rounded-xl border border-input bg-muted/40 hover:bg-muted/60 transition-colors">
                    <span className="text-[10px] sm:text-xs text-foreground/70 truncate flex-1 font-mono text-center select-all">
                      {getStudyRoomShareUrl(createdRoom.slug || createdRoom.id)}
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-7 px-2 sm:h-8 sm:px-3 text-[9px] sm:text-[10px] uppercase tracking-wider font-bold rounded-md sm:rounded-lg bg-background shadow-sm border-border/60 hover:bg-accent hover:text-accent-foreground shrink-0"
                      onClick={() => {
                         navigator.clipboard.writeText(
                           getStudyRoomShareUrl(createdRoom.slug || createdRoom.id),
                         );
                         setIsCopied(true);
                         setTimeout(() => setIsCopied(false), 2000);
                      }}
                    >
                      {isCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2 w-full sm:grid sm:grid-cols-2 sm:gap-3">
                  <ShareButton
                    url={getStudyRoomShareUrl(createdRoom.slug || createdRoom.id)}
                    title={createdRoom.title}
                    description={
                      isWebinarRoom
                        ? "Register for this webinar"
                        : createdRoom.description || ""
                    }
                    className="w-full h-10 sm:h-11 text-xs sm:text-sm rounded-lg sm:rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 justify-center px-2 sm:px-3"
                  />
                  <Button
                    onClick={() =>
                      router.push(
                        getStudyRoomPagePath(createdRoom.slug || createdRoom.id),
                      )
                    }
                    className="w-full h-10 sm:h-11 text-xs sm:text-sm rounded-lg sm:rounded-xl font-bold shadow-sm hover:shadow-md transition-all bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/60 px-2 sm:px-3"
                  >
                    Enter Room
                  </Button>
                </div>
              </div>
                );
              })()}
            
             <Button variant="ghost" onClick={() => router.push("/dashboard")} className="text-muted-foreground hover:text-foreground text-xs hover:bg-transparent pt-2">
                Return to Dashboard
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
