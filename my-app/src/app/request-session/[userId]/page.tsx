"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { SocialLinksDisplay } from "@/components/ui/social-links-display";
import { usersApi, peerSessionsApi } from "@/lib/api";
import { User } from "@/types/api.types";
import { setAuthToken } from "@/lib/api-client";
import { ImprovedAvailabilityCalendar } from "@/components/availability/improved-availability-calendar";
import { useFormPersistence } from "@/hooks/use-local-storage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCoins } from "@/lib/utils/coin-format";

interface SessionFormData {
  skills: string[];
  date: string;
  time: string;
  duration: string;
  message: string;
  gmeetLink: string;
}

const initialFormData: SessionFormData = {
  skills: [],
  date: "",
  time: "",
  duration: "60",
  message: "",
  gmeetLink: "",
};

export default function RequestSessionPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const { userId } = use(params);
  const { isSignedIn, isLoaded, getToken } = useAuth();
  
  const [peer, setPeer] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Use form persistence hook - store per-user to avoid conflicts
  const { formData, setFormData, updateField, clearForm, hasStoredData } = useFormPersistence<SessionFormData>(
    `request_session_${userId}`,
    initialFormData,
    {
      debounceMs: 300,
      expiresIn: 4 * 60 * 60 * 1000, // 4 hours
      excludeFields: ["date", "time"], // Don't persist date/time as they can become stale
    }
  );

  // Handle clearing form
  const handleClearForm = useCallback(() => {
    clearForm();
    setFormData(initialFormData);
  }, [clearForm, setFormData]);

  useEffect(() => {
    const fetchData = async () => {
      // Wait for Clerk to load
      if (!isLoaded) {
        return;
      }

      // Check if user is signed in
      if (!isSignedIn) {
        setError('Please sign in to request a session');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get token and set it for API calls
        const token = await getToken();
        if (token) {
          setAuthToken(token);
          console.log('Token set for API calls:', token);
        }
        
        // Fetch peer user data and current user data in parallel
        const [peerData, currentUserData] = await Promise.all([
          usersApi.getPublicUserProfile(userId),
          usersApi.getCurrentUser()
        ]);

        setPeer(peerData);
        setCurrentUser(currentUserData.user);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, isLoaded, isSignedIn, getToken]);

  // Check availability when date, time, or duration changes
  useEffect(() => {
    const checkAvailability = async () => {
      // Only check if we have all required data
      if (!peer || !formData.date || !formData.time || !formData.duration) {
        setAvailabilityWarning(null);
        return;
      }

      try {
        setCheckingAvailability(true);
        setAvailabilityWarning(null);

        // Construct the ISO date string for the requested time
        const dateTimeString = `${formData.date}T${formData.time}:00`;
        const localDateTime = new Date(dateTimeString);

        // Check if the time is in the past
        if (localDateTime < new Date()) {
          setAvailabilityWarning('Cannot book sessions in the past');
          return;
        }

        // Call the availability check API
        const result = await peerSessionsApi.checkAvailability(
          peer.id,
          localDateTime.toISOString(),
          parseInt(formData.duration)
        );

        if (!result.isAvailable) {
          setAvailabilityWarning(result.reason || 'This time slot is not available');
        }
      } catch (err) {
        console.error('Error checking availability:', err);
        // Don't show error for availability check failures
      } finally {
        setCheckingAvailability(false);
      }
    };

    // Debounce the availability check
    const timeoutId = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [peer, formData.date, formData.time, formData.duration]);

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Initializing...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !peer || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              {error || "User not found"}
            </h1>
            <Link href="/browse">
              <Button className="mt-4">Back to Browse</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check if user is trying to request session to themselves
  const isSelfRequest = peer.id === currentUser.id;

  const costPerHour = peer?.hourlyRate ? (typeof peer.hourlyRate === 'string' ? parseFloat(peer.hourlyRate) : peer.hourlyRate) : 0;
  const calculatedCost = peer?.hourlyRate ? (parseInt(formData.duration) / 60) * costPerHour : 0;

  const toggleSkill = (skillId: string) => {
    const newSkills = formData.skills.includes(skillId)
      ? formData.skills.filter((id) => id !== skillId)
      : [...formData.skills, skillId];
    updateField("skills", newSkills);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!peer || !currentUser) return;

    // Prevent users from requesting sessions to themselves
    if (peer.id === currentUser.id) {
      setError('You cannot request a session to yourself.');
      return;
    }

    // Check if peer has set their hourly rate
    if (!peer.hourlyRate) {
      setError('This user has not set their hourly rate yet. Please contact them directly or ask them to set their rate in their profile.');
      return;
    }

    // Note: We allow booking even when there's an availability warning
    // The warning is just informational to let the user know there's a higher chance of cancellation
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Get user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const requestData = {
        peerId: peer.id,
        skills: formData.skills,
        date: formData.date,
        time: formData.time,
        duration: parseInt(formData.duration),
        message: formData.message || undefined,
        cost: calculatedCost,
        gmeetLink: formData.gmeetLink || undefined,
        timezone: userTimezone,
      };
      
      await peerSessionsApi.requestPeerSession(requestData);
      
      // Clear form from localStorage on successful submission
      clearForm();
      
      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error('Error requesting session:', err);
      // Handle specific error codes
      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = err as { response: { data: { code: string; message: string } } };
        if (apiError.response?.data?.code === 'CANNOT_REQUEST_SELF') {
          setError(apiError.response.data.message || 'You cannot request a session to yourself.');
        } else if (apiError.response?.data?.code === 'TIME_SLOT_UNAVAILABLE') {
          setError(apiError.response.data.message || 'The selected time slot is not available.');
        } else if (apiError.response?.data?.code === 'INSUFFICIENT_FUNDS') {
          setError('You do not have enough AYA tokens to book this session. Please add funds to your wallet.');
        } else {
          setError(apiError.response?.data?.message || 'Failed to send session request');
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send session request';
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href={`/profile/${userId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Request Session</h1>
          <p className="text-muted-foreground">
            Request a one-on-one learning session with {peer.name}
          </p>
        </div>

        {/* Error message if trying to request to self */}
        {isSelfRequest && (
          <Card className="mb-8 border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Cannot Request Session</p>
              </div>
              <p className="text-destructive mt-2">
                You cannot request a session to yourself. Please select a different user.
              </p>
              <Link href="/browse" className="mt-4 inline-block">
                <Button variant="outline">Browse Other Users</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Restore Draft Notice */}
                  {hasStoredData && !isSelfRequest && (
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

                  {/* Peer Info */}
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={peer.avatar} alt={peer.name} />
                      <AvatarFallback>{peer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{peer.name}</p>
                        <SocialLinksDisplay socialLinks={peer.socialLinks} size="sm" maxDisplay={4} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{peer.username || peer.email.split('@')[0]}
                      </p>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    <Label>Topics / Skills (Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {peer.hasSkills?.map((skillName) => (
                        <Badge
                          key={skillName}
                          variant={
                            formData.skills.includes(skillName)
                              ? "default"
                              : "outline"
                          }
                          className={isSelfRequest ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                          onClick={() => !isSelfRequest && toggleSkill(skillName)}
                        >
                          {skillName}
                        </Badge>
                      ))}
                    </div>
                    {formData.skills.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Select topics (optional - if none selected, session will be categorized as Communication)
                      </p>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="240"
                      step="1"
                      value={formData.duration}
                      onChange={(e) => updateField("duration", e.target.value)}
                      required
                      disabled={isSelfRequest}
                    />
                    <div className="flex flex-wrap gap-2">
                      {[15, 30, 45, 60].map((mins) => (
                        <Button
                          key={mins}
                          type="button"
                          variant={formData.duration === String(mins) ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateField("duration", String(mins))}
                          disabled={isSelfRequest}
                          className="text-xs"
                        >
                          {mins} min
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Availability Calendar */}
                  {!isSelfRequest && (
                    <ImprovedAvailabilityCalendar
                      peerId={peer.id}
                      onSlotSelect={(date, time, duration, isAvailable, reason) => {
                        updateField("date", date);
                        updateField("time", time);
                        updateField("duration", duration.toString());

                        // Set warning if slot is not available
                        if (!isAvailable) {
                          setAvailabilityWarning(
                            `This time slot may not be ideal: ${reason || 'User may not be available'}. There is a high chance this booking might be cancelled.`
                          );
                        } else {
                          setAvailabilityWarning(null);
                        }
                      }}
                      selectedDate={formData.date}
                      selectedTime={formData.time}
                      selectedDuration={parseInt(formData.duration)}
                    />
                  )}

                  {/* Manual Date & Time (fallback/override) */}
                  <details className="space-y-4">
                    <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                      Or manually enter date and time
                    </summary>
                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => updateField("date", e.target.value)}
                          required
                          min={new Date().toISOString().split("T")[0]}
                          disabled={isSelfRequest}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Time *</Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => updateField("time", e.target.value)}
                          required
                          disabled={isSelfRequest}
                        />
                      </div>
                    </div>
                  </details>

                  {/* Availability Warning */}
                  {checkingAvailability && formData.date && formData.time && formData.duration && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <p className="text-sm text-blue-600 dark:text-blue-400">Checking availability...</p>
                      </div>
                    </div>
                  )}

                  {availabilityWarning && !checkingAvailability && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950 border-2 border-orange-300 dark:border-orange-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-1">
                            ⚠️ High Cancellation Risk
                          </p>
                          <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                            {availabilityWarning}
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-400 italic">
                            You can still proceed with booking, but be prepared for potential cancellation.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!checkingAvailability && !availabilityWarning && formData.date && formData.time && formData.duration && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                        <p className="text-sm text-green-600 dark:text-green-400">This time slot is available!</p>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell the peer what you'd like to learn..."
                      value={formData.message}
                      onChange={(e) => updateField("message", e.target.value)}
                      rows={4}
                      disabled={isSelfRequest}
                    />
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
                      disabled={isSelfRequest}
                    />
                    <p className="text-sm text-muted-foreground">
                      Create a Google Meet and paste the link here. Both participants will use this to join the session.
                    </p>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
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
                        isSelfRequest ||
                        submitting ||
                        !formData.date ||
                        !formData.time ||
                        !peer?.hourlyRate ||
                          (typeof currentUser.coins === 'string' ? parseFloat(currentUser.coins) : currentUser.coins) < calculatedCost
                      }
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Request"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">
                      {formData.duration} minutes
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rate</span>
                    <span className="font-medium">
                      {peer?.hourlyRate ? <>{formatCoins(costPerHour)} AYA/hour</> : 'Not set'}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total Cost</span>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-600" />
                        <span className="font-semibold">
                          {peer?.hourlyRate ? <>{formatCoins(calculatedCost)} AYA</> : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Your Balance
                    </span>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">{formatCoins(typeof currentUser.coins === 'string' ? parseFloat(currentUser.coins) : currentUser.coins)} AYA</span>
                    </div>
                  </div>

                  {(typeof currentUser.coins === 'string' ? parseFloat(currentUser.coins) : currentUser.coins) < calculatedCost && (
                    <p className="text-sm text-destructive mt-2">
                      Insufficient balance
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
