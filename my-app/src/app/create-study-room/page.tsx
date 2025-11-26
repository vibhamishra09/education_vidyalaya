"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkillInput } from "@/components/ui/skill-input";
import { ArrowLeft, Users, Clock, Loader2, Coins } from "lucide-react";
import { studyRoomsApi } from "@/lib/api";
import { CreateStudyRoomDto } from "@/types/api.types";
import Link from "next/link";

export default function CreateStudyRoomPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    skills: [] as string[],
    date: "",
    time: "",
    duration: "60",
    maxParticipants: "10",
    joiningFee: "0.00",
    gmeetLink: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
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
      
      await studyRoomsApi.createStudyRoom(createData);
      
      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error('Error creating study room:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create study room';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
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
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Room Title *</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., React Hooks Deep Dive"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>

                {/* Skills/Topics */}
                <div className="space-y-2">
                  <SkillInput
                    label="Topics / Skills *"
                    placeholder="Type skills separated by commas (e.g., JavaScript, React, Node.js)..."
                    selectedSkills={formData.skills}
                    onSkillsChange={(skills) =>
                      setFormData((prev) => ({ ...prev, skills }))
                    }
                    maxSkills={20}
                  />
                  {formData.skills.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Select at least one topic
                    </p>
                  )}
                </div>

                {/* Date & Time */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, date: e.target.value }))
                      }
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, time: e.target.value }))
                      }
                      required
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
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            duration: e.target.value,
                          }))
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Between 1 and 240 minutes
                    </p>
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
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            maxParticipants: e.target.value,
                          }))
                        }
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
                      step="0.01"
                      value={formData.joiningFee}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          joiningFee: e.target.value,
                        }))
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Amount participants will pay to join (0-1000 coins, supports decimals)
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        gmeetLink: e.target.value,
                      }))
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Create a Google Meet and paste the link here. Participants will use this to join the session.
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Earning Potential</h4>
                  <p className="text-sm text-muted-foreground">
                    Each participant will pay {parseFloat(formData.joiningFee).toFixed(2)} <span className="text-xs">m</span>AYA to join. With{" "}
                    {formData.maxParticipants} participants, you could earn up to{" "}
                    <span className="font-semibold text-foreground">
                      {(parseInt(formData.maxParticipants) * parseFloat(formData.joiningFee)).toFixed(2)} <span className="text-xs">m</span>AYA
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
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      submitting ||
                      !formData.title ||
                      formData.skills.length === 0 ||
                      !formData.date ||
                      !formData.time
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
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
    </div>
  );
}
