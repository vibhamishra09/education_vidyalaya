"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Users, Clock, Loader2, Coins, CheckCircle2, RotateCcw } from "lucide-react";
import { CreateStudyRoomDto, StudyRoom } from "@/types/api.types";
import { ShareButton } from "@/components/share/share-button";
import { useFormPersistence } from "@/hooks/use-local-storage";
import { useCreateStudyRoom } from "@/hooks/use-study-rooms";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface StudyRoomFormData {
  title: string;
  description: string;
  skills: string[];
  date: string;
  time: string;
  duration: string;
  maxParticipants: string;
  joiningFee: string;
  gmeetLink: string;
}

const initialFormData: StudyRoomFormData = {
  title: "",
  description: "",
  skills: [],
  date: "",
  time: "",
  duration: "60",
  maxParticipants: "10",
  joiningFee: "0",
  gmeetLink: "",
};

export function CreateStudyRoomClient() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded } = useAuth();
  const createStudyRoomMutation = useCreateStudyRoom();

  // Use form persistence hook for automatic localStorage sync
  const { formData, setFormData, updateField, clearForm, hasStoredData } = useFormPersistence<StudyRoomFormData>(
    "create_study_room",
    initialFormData,
    {
      debounceMs: 300,
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours
      excludeFields: ["date", "time"], // Don't persist date/time as they can become stale
    }
  );

  const [isInstantRoom, setIsInstantRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<StudyRoom | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Auto-fill date/time when instant room is enabled
  useEffect(() => {
    if (isInstantRoom) {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().slice(0, 5); // HH:MM format
      setFormData((prev) => ({
        ...prev,
        date: dateStr,
        time: timeStr,
      }));
    }
  }, [isInstantRoom, setFormData]);

  // Handle clearing form and localStorage
  const handleClearForm = useCallback(() => {
    clearForm();
    setFormData(initialFormData);
  }, [clearForm, setFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure auth is loaded before submitting
    if (!isAuthLoaded) {
      setError('Please wait for authentication to load');
      return;
    }
    
    setError(null);
    
    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const createData: CreateStudyRoomDto = {
      title: formData.title,
      description: formData.description || undefined,
      skills: formData.skills,
      date: formData.date,
      time: formData.time,
      duration: parseInt(formData.duration),
      maxParticipants: parseInt(formData.maxParticipants),
      joiningFee: parseFloat(formData.joiningFee) / 100, // Convert mAYA input to AYA for storage
      gmeetLink: formData.gmeetLink || undefined,
      timezone: userTimezone,
    };
    
    createStudyRoomMutation.mutate(createData, {
      onSuccess: (room) => {
        // Clear form from localStorage on successful submission
        clearForm();
        
        // Success - show success dialog with share link
        setCreatedRoom(room);
        setShowSuccessDialog(true);
      },
      onError: (err: unknown) => {
        console.error('Error creating study room:', err);
        const errorMessage = err instanceof Error ? err.message : 
          (err && typeof err === 'object' && 'message' in err) ? String((err as { message: string }).message) : 
          'Failed to create study room';
        setError(errorMessage);
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Study Room</h1>
          <p className="text-muted-foreground">
            Host a group learning session and share your knowledge
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Room Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Restore Draft Notice */}
                {hasStoredData && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        📝 Draft restored from your previous session
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearForm}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Room Title *</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., React Hooks Deep Dive"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What will you be teaching in this session?"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Skills/Topics */}
                <div className="space-y-2">
                  <SkillInput
                    label="Topics / Skills *"
                    placeholder="Type skills separated by commas (e.g., JavaScript, React, Node.js)..."
                    selectedSkills={formData.skills}
                    onSkillsChange={(skills) => updateField("skills", skills)}
                    maxSkills={20}
                  />
                  {formData.skills.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Select at least one topic
                    </p>
                  )}
                </div>

                {/* Instant Room Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="instant-room" className="text-base font-semibold cursor-pointer">
                      Create Instant Room
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Start immediately. No waiting time required.
                    </p>
                  </div>
                  <Switch
                    id="instant-room"
                    checked={isInstantRoom}
                    onCheckedChange={setIsInstantRoom}
                  />
                </div>

                {/* Date & Time */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date {!isInstantRoom && "*"}</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => updateField("date", e.target.value)}
                      required={!isInstantRoom}
                      disabled={isInstantRoom}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time {!isInstantRoom && "*"}</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => updateField("time", e.target.value)}
                      required={!isInstantRoom}
                      disabled={isInstantRoom}
                    />
                  </div>
                </div>

                {/* Duration & Max Participants */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes) *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        max="240"
                        step="1"
                        value={formData.duration}
                        onChange={(e) => updateField("duration", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[15, 30, 45, 60].map((mins) => (
                        <Button
                          key={mins}
                          type="button"
                          variant={formData.duration === String(mins) ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateField("duration", String(mins))}
                          className="text-xs"
                        >
                          {mins} min
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants">Max Participants *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="maxParticipants"
                        type="number"
                        min="2"
                        max="10"
                        value={formData.maxParticipants}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string for typing, but clamp final value
                          if (value === "") {
                            updateField("maxParticipants", value);
                          } else {
                            const numValue = parseInt(value, 10);
                            // Clamp value between 2 and 10
                            const clampedValue = Math.min(10, Math.max(2, numValue));
                            updateField("maxParticipants", String(clampedValue));
                          }
                        }}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Between 2 and 10 participants
                    </p>
                  </div>
                </div>

                {/* Joining Fee */}
                <div className="space-y-2">
                  <Label htmlFor="joiningFee">Joining Fee (<span className="text-xs">m</span>AYA) *</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="joiningFee"
                      type="number"
                      min="0"
                      max="100000"
                      step="1"
                      value={formData.joiningFee}
                      onChange={(e) => updateField("joiningFee", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Amount participants will pay to join (whole numbers only)
                  </p>
                </div>

                {/* Google Meet Link */}
                <div className="space-y-2">
                  <Label htmlFor="gmeetLink">Google Meet Link (Optional)</Label>
                  <Input
                    id="gmeetLink"
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={formData.gmeetLink}
                    onChange={(e) => updateField("gmeetLink", e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Create a Google Meet and paste the link here. Participants will use this to join the session.
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Earning Potential</h4>
                  <p className="text-sm text-muted-foreground">
                    Each participant will pay {parseInt(formData.joiningFee) || 0} <span className="text-xs">m</span>AYA to join. With{" "}
                    {formData.maxParticipants} participants, you could earn up to{" "}
                    <span className="font-semibold text-foreground">
                      {parseInt(formData.maxParticipants) * (parseInt(formData.joiningFee) || 0)} <span className="text-xs">m</span>AYA
                    </span>
                    .
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.back()}
                    disabled={createStudyRoomMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      createStudyRoomMutation.isPending ||
                      !isAuthLoaded ||
                      !formData.title ||
                      formData.skills.length === 0 ||
                      (!isInstantRoom && (!formData.date || !formData.time))
                    }
                  >
                    {createStudyRoomMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : !isAuthLoaded ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Create Study Room"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Success Dialog with Share Link */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Study Room Created!</DialogTitle>
            <DialogDescription className="text-center">
              Your study room is ready. Share the link with your friends to start learning together.
            </DialogDescription>
          </DialogHeader>
          
          {createdRoom && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Room Link:</p>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/studyroom/${createdRoom.id}`}
                    readOnly
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <ShareButton
                  url={`${typeof window !== "undefined" ? window.location.origin : ""}/studyroom/${createdRoom.id}`}
                  title={createdRoom.title}
                  description={createdRoom.description || ""}
                  variant="default"
                  size="default"
                  className="w-full"
                />
                <Button
                  variant="outline"
                  onClick={() => router.push(`/studyroom/${createdRoom.id}`)}
                  className="w-full"
                >
                  Go to Study Room
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSuccessDialog(false);
                router.push("/dashboard");
              }}
            >
              Back to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

