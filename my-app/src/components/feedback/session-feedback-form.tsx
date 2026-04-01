"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  CheckCircle2,
  MessageSquareHeart,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SessionFeedbackAnswers,
  ClarityOption,
  ProblemSolvedOption,
  EaseOfStartOption,
  YesNoOption,
  ContinueUsingOption,
} from "@/types/api.types";

interface SessionFeedbackFormProps {
  sessionId: string;
  sessionType: "studyRoom" | "peerSession";
  isHost: boolean;
  onComplete: (answers: SessionFeedbackAnswers) => void;
  onSkip?: () => void;
  loading?: boolean;
  onBackToDashboard?: () => void;
}

// Question groups for pagination - Optimized from 4 to 3 pages
const QUESTION_GROUPS = [
  { 
    id: "core", 
    title: "The Core Experience", 
    icon: "✨", 
    questions: ["valueScore", "npsScore", "clarityOfPurpose", "likelihoodToContinue"] 
  },
  { 
    id: "value", 
    title: "Value & Impact", 
    icon: "🎯", 
    questions: ["problemHopingToSolve", "problemSolvedExtent", "whatMakeMustUse", "easeOfStart"] 
  },
  { 
    id: "feedback", 
    title: "Friction & Thoughts", 
    icon: "💡", 
    questions: ["feltStuck", "whereStuck", "removeForFriction", "finalThoughts"] 
  },
];



const CLARITY_OPTIONS: ClarityOption[] = [
  "Very clear", "Somewhat clear", "Not clear", "Confusing"
];

const PROBLEM_SOLVED_OPTIONS: ProblemSolvedOption[] = [
  "Completely", "Mostly", "Partially", "Not really"
];


const EASE_OF_START_OPTIONS: EaseOfStartOption[] = [
  "Extremely easy", "Easy", "Neutral", "Difficult", "Very difficult"
];

const YES_NO_OPTIONS: YesNoOption[] = ["Yes", "No"];



const CONTINUE_USING_OPTIONS: ContinueUsingOption[] = [
  "Very likely", "Likely", "Not sure", "Unlikely"
];


export function SessionFeedbackForm({
  sessionId: _sessionId,
  sessionType: _sessionType,
  isHost: _isHost,
  onComplete,
  onSkip: _onSkip,
  loading = false,
  onBackToDashboard,
}: SessionFeedbackFormProps) {
  const [currentGroup, setCurrentGroup] = useState(0);
  const [answers, setAnswers] = useState<SessionFeedbackAnswers>({});
  const [hoveredRating, setHoveredRating] = useState<{ field: string; value: number } | null>(null);

  const totalGroups = QUESTION_GROUPS.length;
  const progress = ((currentGroup + 1) / totalGroups) * 100;
  const currentGroupData = QUESTION_GROUPS[currentGroup];

  const updateAnswer = useCallback(<K extends keyof SessionFeedbackAnswers>(
    key: K,
    value: SessionFeedbackAnswers[K]
  ) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleNext = () => {
    if (currentGroup < totalGroups - 1) {
      setCurrentGroup(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentGroup > 0) {
      setCurrentGroup(prev => prev - 1);
    }
  };

  const handleSkipPage = () => {
    // Skip current page and move to next
    if (currentGroup < totalGroups - 1) {
      setCurrentGroup(prev => prev + 1);
    } else {
      // On last page, submit with current answers
      onComplete(answers);
    }
  };

  const handleSubmit = () => {
    onComplete(answers);
  };

  const renderScaleInput = (
    field: "valueScore" | "npsScore",
    min: number,
    max: number,
    label: string
  ) => {
    const value = answers[field];
    const currentHover = hoveredRating?.field === field ? hoveredRating.value : null;
    
    return (
      <div className="space-y-6">
        <Label className="text-base font-bold text-white tracking-tight">{label}</Label>
        <div className="flex flex-wrap gap-2.5 justify-center py-2">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => updateAnswer(field, num)}
              onMouseEnter={() => setHoveredRating({ field, value: num })}
              onMouseLeave={() => setHoveredRating(null)}
              className={cn(
                "w-11 h-11 rounded-xl font-semibold transition-all duration-200 border-2",
                value === num
                  ? "bg-gradient-to-br from-[#00DC6E] to-[#00DC6E]/80 text-white border-[#00DC6E] shadow-lg scale-110"
                  : currentHover !== null && num <= currentHover
                    ? "bg-[#00DC6E]/20 border-[#00DC6E]/50 scale-105 text-white"
                    : "bg-white/5 border-white/20 hover:border-[#00DC6E]/50 hover:scale-105 text-white"
              )}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-white/50 px-2">
          <span>👎 Not at all</span>
          <span>👍 Extremely</span>
        </div>
      </div>
    );
  };

  const renderRadioGroup = <T extends string>(
    field: keyof SessionFeedbackAnswers,
    options: T[],
    label: string
  ) => (
    <div className="space-y-5">
      <Label className="text-base font-bold text-white tracking-tight">{label}</Label>
      <div className="grid gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => updateAnswer(field, option as SessionFeedbackAnswers[typeof field])}
            className={cn(
              "flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left transition-all duration-200",
              answers[field] === option
                ? "bg-gradient-to-r from-[#00DC6E]/15 to-[#00DC6E]/5 border-[#00DC6E] shadow-sm"
                : "bg-white/5 border-white/20 hover:border-[#00DC6E]/50 hover:bg-white/10"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
              answers[field] === option
                ? "border-[#00DC6E] bg-[#00DC6E]"
                : "border-white/40"
            )}>
              {answers[field] === option && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-sm font-medium text-white">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTextInput = (
    field: keyof SessionFeedbackAnswers,
    label: string,
    placeholder: string,
    type: "input" | "textarea" = "textarea"
  ) => (
    <div className="space-y-4">
      <Label htmlFor={String(field)} className="text-base font-bold text-white tracking-tight">{label}</Label>
      {type === "textarea" ? (
        <Textarea
          id={String(field)}
          value={(answers[field] as string) || ""}
          onChange={(e) => updateAnswer(field, e.target.value as SessionFeedbackAnswers[typeof field])}
          placeholder={placeholder}
          rows={3}
          className="bg-white/5 border-2 border-white/20 rounded-xl resize-none focus:border-[#00DC6E] transition-colors text-white placeholder:text-white/40"
        />
      ) : (
        <Input
          id={String(field)}
          value={(answers[field] as string) || ""}
          onChange={(e) => updateAnswer(field, e.target.value as SessionFeedbackAnswers[typeof field])}
          placeholder={placeholder}
          className="bg-white/5 border-2 border-white/20 rounded-xl focus:border-[#00DC6E] transition-colors text-white placeholder:text-white/40"
        />
      )}
    </div>
  );



  const renderQuestionGroup = () => {
    const group = QUESTION_GROUPS[currentGroup];
    
    switch (group.id) {
      case "core":
        return (
          <div className="space-y-8">
            {renderScaleInput(
              "valueScore",
              1,
              10,
              "Q1. On a scale of 1–10, how valuable does Webyalaya feel to you right now?"
            )}
            {renderScaleInput(
              "npsScore",
              0,
              10,
              "Q2. How likely are you to recommend Webyalaya to a friend or colleague?"
            )}
            {renderRadioGroup(
              "clarityOfPurpose",
              CLARITY_OPTIONS,
              "Q3. How clear was it to understand what Webyalaya does within the first 30 seconds?"
            )}
            {renderRadioGroup(
              "likelihoodToContinue",
              CONTINUE_USING_OPTIONS,
              "Q4. How likely are you to continue using Webyalaya after beta?"
            )}
          </div>
        );

      case "value":
        return (
          <div className="space-y-8">
            {renderTextInput(
              "problemHopingToSolve",
              "Q5. What problem were you hoping Webyalaya would solve for you?",
              "Describe the problem you were trying to solve..."
            )}
            {renderRadioGroup(
              "problemSolvedExtent",
              PROBLEM_SOLVED_OPTIONS,
              "Q6. To what extent does Webyalaya currently solve that problem?"
            )}
            {renderTextInput(
              "whatMakeMustUse",
              "Q7. What would make Webyalaya a must-use platform for you?",
              "What features or improvements would make it essential..."
            )}
            {renderRadioGroup(
              "easeOfStart",
              EASE_OF_START_OPTIONS,
              "Q8. How easy was it to get started without any guidance?"
            )}
          </div>
        );

      case "feedback":
        return (
          <div className="space-y-8">
            {renderRadioGroup(
              "feltStuck",
              YES_NO_OPTIONS,
              "Q9. At any point, did you feel stuck, confused, or unsure what to do next?"
            )}
            {answers.feltStuck === "Yes" && renderTextInput(
              "whereStuck",
              "Q10. If yes, where did you feel stuck or confused? Please explain.",
              "Describe where you felt stuck..."
            )}
            {renderTextInput(
              "removeForFriction",
              "Q11. If you could remove one thing that caused friction, what would it be?",
              "What would you remove..."
            )}
            {renderTextInput(
              "finalThoughts",
              "Q12. Any final thoughts or brutally honest feedback?",
              "We appreciate your honesty..."
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border border-white/10 shadow-2xl bg-[#141414] overflow-hidden">
      {/* Header */}
      <CardHeader className="relative pb-4 bg-gradient-to-r from-[#00DC6E]/10 via-[#00DC6E]/5 to-transparent border-b border-white/5">
        {onBackToDashboard && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white/50 hover:text-white hover:bg-white/10"
            onClick={onBackToDashboard}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#00DC6E] to-[#00DC6E]/80 flex items-center justify-center shadow-lg">
            <MessageSquareHeart className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white">Help Shape Webyalaya</h2>
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-white/60 mt-1">
              Your feedback directly shapes our platform&apos;s future
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentGroupData.icon}</span>
              <span className="font-semibold text-white">{currentGroupData.title}</span>
            </div>
            <span className="text-sm text-white/60 bg-white/10 px-3 py-1 rounded-full">
              {currentGroup + 1} of {totalGroups}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00DC6E] to-[#00DC6E]/70 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Questions - scrollable area */}
        <div className="max-h-[500px] overflow-y-auto pr-4 -mr-2 scrollbar-thin scroll-smooth">
          {renderQuestionGroup()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentGroup === 0}
              className="gap-1 text-white/70 hover:text-white hover:bg-white/10 disabled:text-white/30"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            {onBackToDashboard && (
              <Button 
                variant="ghost" 
                onClick={onBackToDashboard}
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                Exit to Dashboard
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={handleSkipPage} 
              className="text-white/50 hover:text-white hover:bg-white/10"
            >
              Skip this section
            </Button>

            {currentGroup < totalGroups - 1 ? (
              <Button onClick={handleNext} className="gap-1 px-6 bg-[#00DC6E] hover:bg-[#00DC6E]/90 text-white">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="gap-2 px-6 bg-gradient-to-r from-[#00DC6E] to-[#00DC6E]/80 hover:from-[#00DC6E]/90 hover:to-[#00DC6E]/70 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
