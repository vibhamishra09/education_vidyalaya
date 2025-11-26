"use client";

import { useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkillInput } from "@/components/ui/skill-input";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ArrowRight, ArrowLeft, CheckCircle, Sparkles, Upload } from "lucide-react";
import { uploadFile, validateImageFile } from "@/lib/upload";
import { setAuthToken } from "@/lib/api-client";

type OnboardingStep = "profile" | "skills" | "complete";

const RANDOM_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
];

export default function OnboardingPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<OnboardingStep>("profile");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile step
  const [displayName, setDisplayName] = useState(user?.fullName || "");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [school, setSchool] = useState("");
  const [hourlyRate, setHourlyRate] = useState(0);
  const [avatar, setAvatar] = useState<string>(
    user?.imageUrl || RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)]
  );

  // Skills step
  const [skillsIHave, setSkillsIHave] = useState<string[]>([]);
  const [skillsIWant, setSkillsIWant] = useState<string[]>([]);


  const handleRandomAvatar = () => {
    setAvatar(RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingAvatar(true);
    try {
      // Get auth token
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      // Upload file
      const fileUrl = await uploadFile(file, 'avatar');
      setAvatar(fileUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingAvatar(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('displayName', displayName);
      formData.append('avatar', avatar);
      formData.append('bio', bio);
      formData.append('location', location);
      formData.append('school', school);
      formData.append('hourlyRate', (hourlyRate / 100).toString()); // Convert mAYA input to AYA for storage
      formData.append('skillsIHave', JSON.stringify(skillsIHave));
      formData.append('skillsIWant', JSON.stringify(skillsIWant));

      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete onboarding");
      }

      // Reload the user's data from the Clerk API to get updated metadata
      await user.reload();

      // Get the redirect URL from search params or default to dashboard
      const redirectUrl = searchParams.get('redirect_url') || '/dashboard';

      // Redirect immediately after onboarding completion
      router.push(redirectUrl);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-secondary-50 dark:from-gray-900 dark:via-background dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <AnimatePresence mode="wait">
          {step === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2">
                <CardHeader className="text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 via-purple-600 to-secondary-500 mx-auto mb-4 shadow-primary">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-3xl">Welcome to Webyalaya!</CardTitle>
                  <CardDescription className="text-base">
                    Let&apos;s set up your profile to get started
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Selection */}
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-32 w-32 border-4 border-primary-200">
                      <AvatarImage src={avatar} alt="Profile" />
                      <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <label>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploadingAvatar}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingAvatar}
                          asChild
                        >
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingAvatar ? 'Uploading...' : 'Upload Image'}
                          </span>
                        </Button>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRandomAvatar}
                        disabled={uploadingAvatar}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Random Avatar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAvatar(user?.imageUrl || avatar)}
                        disabled={uploadingAvatar}
                      >
                        Use Clerk Avatar
                      </Button>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter your display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      This is how other users will see your name
                    </p>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Bio <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {bio.length}/500 characters
                    </p>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Location <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <Input
                      placeholder="e.g., New York, USA"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your city or general location
                    </p>
                  </div>

                  {/* School/Institution */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      School/Institution <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <Input
                      placeholder="e.g., MIT, Harvard University"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your school, university, or institution name
                    </p>
                  </div>

                  {/* Hourly Rate */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Hourly Rate (<span className="text-xs">m</span>AYA) <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">🪙</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={hourlyRate || ""}
                        onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set your hourly rate in mAYA tokens for teaching sessions. You can change this later in your profile.
                    </p>
                  </div>

                  {/* Rewards Info */}
                  <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                        <span className="text-2xl">🪙</span>
                      </div>
                      <div>
                        <p className="font-semibold">Welcome Bonus!</p>
                        <p className="text-sm text-muted-foreground">
                          You&apos;ll receive 1000 <span className="text-xs">m</span>AYA to start your learning journey
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setStep("skills")} 
                      size="lg"
                      disabled={!displayName.trim()}
                    >
                      Next: Add Skills
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "skills" && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-2xl">Select Your Skills</CardTitle>
                  <CardDescription>
                    Choose skills you have and skills you want to learn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Skills I Have */}
                  <SkillInput
                    label="Skills I Have"
                    placeholder="Type skills separated by commas (e.g., JavaScript, React, Node.js)..."
                    selectedSkills={skillsIHave}
                    onSkillsChange={setSkillsIHave}
                    maxSkills={20}
                  />

                  {/* Skills I Want */}
                  <SkillInput
                    label="Skills I Want to Learn"
                    placeholder="Type skills separated by commas (e.g., Python, Machine Learning, AWS)..."
                    selectedSkills={skillsIWant}
                    onSkillsChange={setSkillsIWant}
                    maxSkills={20}
                  />

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep("profile")}>
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                    <Button
                      onClick={handleCompleteOnboarding}
                      disabled={loading}
                      size="lg"
                    >
                      {loading ? "Completing..." : "Complete Setup"}
                      <CheckCircle className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <Card className="border-2 border-primary-500">
                <CardContent className="pt-12 pb-12 space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 mx-auto"
                  >
                    <CheckCircle className="w-12 h-12 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-3xl font-bold mb-2">All Set!</h2>
                    <p className="text-muted-foreground text-lg">
                      Welcome to the Webyalaya community
                    </p>
                  </div>
                  <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6 inline-block">
                    <p className="text-sm text-muted-foreground mb-2">Your starting balance</p>
                    <p className="text-4xl font-bold text-primary-600">🪙 10 Coins</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const redirectUrl = searchParams.get('redirect_url') || '/dashboard';
                      if (redirectUrl === '/dashboard') {
                        return 'Redirecting to dashboard...';
                      } else if (redirectUrl.includes('/browse')) {
                        return 'Redirecting to search results...';
                      } else if (redirectUrl.includes('/study-room')) {
                        return 'Redirecting to study room...';
                      } else if (redirectUrl.includes('/profile')) {
                        return 'Redirecting to profile...';
                      } else {
                        return 'Redirecting...';
                      }
                    })()}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
