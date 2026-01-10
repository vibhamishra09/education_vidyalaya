"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  ArrowLeft, Users, Loader2, Coins, CheckCircle2, 
  RotateCcw, Sparkles, Calendar, Video, Layers, 
  Banknote, 
  Clock 
} from "lucide-react";
import { CreateStudyRoomDto, StudyRoom } from "@/types/api.types";
import { ShareButton } from "@/components/share/share-button";
import { useFormPersistence } from "@/hooks/use-local-storage";
import { useCreateStudyRoom } from "@/hooks/use-study-rooms";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  maxParticipants: "5",
  joiningFee: "10",
  gmeetLink: "",
};

export function CreateStudyRoomClient() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded } = useAuth();
  const createStudyRoomMutation = useCreateStudyRoom();

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
  const [error, setError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<StudyRoom | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

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

  const handleClearForm = useCallback(() => {
    clearForm();
    setFormData(initialFormData);
  }, [clearForm, setFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthLoaded) {
      setError('Please wait for authentication to load');
      return;
    }
    setError(null);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const createData: CreateStudyRoomDto = {
      title: formData.title,
      description: formData.description || undefined,
      skills: formData.skills,
      date: formData.date,
      time: formData.time,
      duration: parseInt(formData.duration),
      maxParticipants: parseInt(formData.maxParticipants),
      joiningFee: parseFloat(formData.joiningFee),
      gmeetLink: formData.gmeetLink || undefined,
      timezone: userTimezone,
    };
    
    createStudyRoomMutation.mutate(createData, {
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

  const potentialEarnings = (parseInt(formData.maxParticipants) || 0) * (parseInt(formData.joiningFee) || 0);

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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* LEFT COLUMN: Main Content (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Section 1: Room Details */}
              <section className="space-y-6">
                
                {/* Modified Title Input with Box/Attraction Driver */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Room Name
                  </Label>
                  <div className="relative group transition-all duration-200">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/0 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                    <div className="relative bg-card border-2 border-dashed border-muted group-hover:border-primary/30 group-focus-within:border-primary/50 group-focus-within:border-solid rounded-xl transition-all duration-200 flex items-center">
                       <Input
                         id="title"
                         placeholder="Enter a catchy title..."
                         value={formData.title}
                         onChange={(e) => updateField("title", e.target.value)}
                         className="h-auto py-4 px-4 text-2xl md:text-3xl font-bold border-none shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/30 w-full"
                         required
                         autoFocus
                       />
                       {/* Visual hint that disappears on type/focus */}
                       <div className="absolute right-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/50 px-2 py-1 rounded border">
                            Edit
                          </span>
                       </div>
                    </div>
                  </div>
                </div>

                <Card className="border-muted bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground/80">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Layers className="h-4 w-4" />
                      </div>
                      What's this room about?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Provide a brief agenda or learning outcomes..."
                        value={formData.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        rows={4}
                        className="resize-none bg-background/50 focus:bg-background transition-colors"
                      />
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

                  <div className="space-y-2 pt-2 border-t border-dashed">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground mt-2">
                       <Video className="h-3.5 w-3.5" /> 
                       Google Meet Link <span className="text-[10px] normal-case bg-muted px-1.5 rounded-sm">Optional</span>
                    </Label>
                    <Input
                      type="url"
                      placeholder="https://meet.google.com/abc-defg-hij"
                      value={formData.gmeetLink}
                      onChange={(e) => updateField("gmeetLink", e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
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
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">Max Participants</Label>
                      <span className="text-sm font-bold bg-muted px-2.5 py-0.5 rounded-md min-w-[2rem] text-center">
                        {formData.maxParticipants}
                      </span>
                    </div>
                    <div className="pt-2 px-1">
                      <input
                        type="range"
                        min="2"
                        max="20"
                        step="1"
                        value={formData.maxParticipants}
                        onChange={(e) => updateField("maxParticipants", e.target.value)}
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
                        <span>10</span>
                        <span>20</span>
                      </div>
                    </div>
                  </div>

                  {/* Fee Input */}
                  <div className="space-y-3 pt-2">
                    <Label className="flex items-center justify-between text-sm font-medium">
                      Entry Fee
                      <span className="text-xs font-normal bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Coins className="h-3 w-3" /> mAYA
                      </span>
                    </Label>
                    <div className="relative group">
                      <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        type="number"
                        min="0"
                        value={formData.joiningFee}
                        onChange={(e) => updateField("joiningFee", e.target.value)}
                        className="pl-9 h-11 text-lg font-medium bg-background transition-all focus:ring-2 ring-primary/20"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set to 0 for a free session.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Earnings Preview & Action - Sticky */}
              <div className="sticky top-8 space-y-4">
                <Card className="border shadow-lg overflow-hidden relative group bg-card">
                   {/* Subtle faint blur bg instead of heavy gradient */}
                  <div className="absolute inset-0 bg-primary/5 opacity-50" />
                  
                  <CardContent className="pt-8 pb-8 px-6 relative z-10 text-foreground">
                    <div className="flex items-start justify-between mb-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">Projected Earnings</p>
                        </div>
                        <h3 className="text-4xl font-black flex items-baseline gap-1.5 tracking-tight text-foreground tabular-nums">
                          {potentialEarnings} <span className="text-lg font-bold text-amber-500">mAYA</span>
                        </h3>
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20 border border-amber-200/50 flex items-center justify-center shadow-inner">
                        <Coins className="h-6 w-6 text-amber-600 dark:text-amber-400 drop-shadow-sm" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all bg-gradient-to-r from-primary to-primary/90 hover:to-primary"
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
                      
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-destructive text-center bg-destructive/10 border border-destructive/20 py-2.5 px-3 rounded-lg"
                        >
                          {error}
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <p className="text-xs text-center text-muted-foreground px-4">
                  By launching, you agree to the <span className="underline cursor-pointer hover:text-foreground">host guidelines</span>.
                </p>
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
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl">
          {/* Decorative Header */}
          <div className="h-32 bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
               <CheckCircle2 className="h-10 w-10 text-white drop-shadow-md" />
            </div>
          </div>
          
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2">
              <DialogTitle className="text-2xl font-bold text-foreground">Room Created Successfully!</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                Your study session is ready. Share the link below to invite participants.
              </DialogDescription>
            </div>
            
            {createdRoom && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-2 pl-4 rounded-xl border bg-muted/40 hover:bg-muted/60 transition-colors">
                  <span className="text-sm text-muted-foreground truncate flex-1 font-mono">
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/studyroom/${createdRoom.id}`}
                  </span>
                  <Button size="sm" variant="secondary" className="h-9 rounded-lg shadow-sm" onClick={() => {
                     navigator.clipboard.writeText(`${window.location.origin}/studyroom/${createdRoom.id}`);
                  }}>
                    Copy
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <ShareButton
                    url={`${typeof window !== "undefined" ? window.location.origin : ""}/studyroom/${createdRoom.id}`}
                    title={createdRoom.title}
                    description={createdRoom.description || ""}
                    className="w-full"
                  />
                  <Button
                    onClick={() => router.push(`/studyroom/${createdRoom.id}`)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Enter Room
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="bg-muted/20 p-4 flex justify-center border-t">
             <Button variant="link" onClick={() => router.push("/dashboard")} className="text-muted-foreground hover:text-foreground text-xs h-auto p-0">
                Return to Dashboard
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}