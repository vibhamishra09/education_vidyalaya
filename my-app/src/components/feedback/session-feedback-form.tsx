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
  FirstFeelingOption,
  ClarityOption,
  ProblemSolvedOption,
  PreviousSolutionOption,
  EaseOfStartOption,
  YesNoOption,
  TrustIncreaseOption,
  PlatformComparisonOption,
  ContinueUsingOption,
  WillingToPayOption,
  PaidFeatureOption,
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

// Question groups for pagination
const QUESTION_GROUPS = [
  { id: "intro", title: "Getting Started", icon: "🚀", questions: [1, 2] },
  { id: "first-impression", title: "First Impressions", icon: "✨", questions: [3, 4] },
  { id: "problem-solving", title: "Problem Solving", icon: "🎯", questions: [5, 6, 7] },
  { id: "experience", title: "Your Experience", icon: "💡", questions: [8, 9, 10] },
  { id: "friction", title: "Points of Friction", icon: "🔧", questions: [11, 12, 13] },
  { id: "value", title: "Value Assessment", icon: "💎", questions: [14, 15] },
  { id: "peer-learning", title: "Peer Learning", icon: "🤝", questions: [16, 17] },
  { id: "comparison", title: "Platform Comparison", icon: "⚖️", questions: [18, 19, 20] },
  { id: "future-use", title: "Future Use", icon: "🔮", questions: [21, 22, 23] },
  { id: "pricing", title: "Pricing & Features", icon: "💰", questions: [24, 25, 26] },
  { id: "improvements", title: "Improvements", icon: "🛠️", questions: [27] },
  { id: "final", title: "Final Thoughts", icon: "🎁", questions: [28, 29] },
];

const FIRST_FEELING_OPTIONS: FirstFeelingOption[] = [
  "Excited", "Curious", "Confused", "Neutral", "Disgusting"
];

const CLARITY_OPTIONS: ClarityOption[] = [
  "Very clear", "Somewhat clear", "Not clear", "Confusing"
];

const PROBLEM_SOLVED_OPTIONS: ProblemSolvedOption[] = [
  "Completely", "Mostly", "Partially", "Not really"
];

const PREVIOUS_SOLUTION_OPTIONS: PreviousSolutionOption[] = [
  "YouTube or online videos", "Paid courses", "Friends or peers", "Self-learning", "Couldn't find a solution"
];

const EASE_OF_START_OPTIONS: EaseOfStartOption[] = [
  "Extremely easy", "Easy", "Neutral", "Difficult", "Very difficult"
];

const YES_NO_OPTIONS: YesNoOption[] = ["Yes", "No"];

const TRUST_INCREASE_OPTIONS: TrustIncreaseOption[] = [
  "User profiles & credibility", "Ratings & reviews", "AI Moderation & guidelines", "Verified users"
];

const PLATFORM_COMPARISON_OPTIONS: PlatformComparisonOption[] = [
  "Human", "Practical", "Interactive", "Flexible", "Confusing", "Less useful"
];

const CONTINUE_USING_OPTIONS: ContinueUsingOption[] = [
  "Very likely", "Likely", "Not sure", "Unlikely"
];

const WILLING_TO_PAY_OPTIONS: WillingToPayOption[] = [
  "Yes, definitely", "Maybe, if the value is clear", "No"
];

const PAID_FEATURE_OPTIONS: PaidFeatureOption[] = [
  "Unlimited live learning sessions",
  "Access to high-quality peers / mentors",
  "Debate Rooms",
  "Session recordings and notes",
  "Sessions being moderated and rated by AI",
  "Verified experts / credibility badges",
  "AI-powered learning recommendations",
  "Certificates / proof of learning",
  "Community-only learning circles",
];

export function SessionFeedbackForm({
  sessionId,
  sessionType,
  isHost,
  onComplete,
  onSkip,
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
      <div className="space-y-4">
        <Label className="text-base font-medium">{label}</Label>
        <div className="flex flex-wrap gap-2 justify-center">
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
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary shadow-lg scale-110"
                  : currentHover !== null && num <= currentHover
                    ? "bg-primary/20 border-primary/50 scale-105"
                    : "bg-background/50 border-border hover:border-primary/50 hover:scale-105"
              )}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-2">
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
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>
      <div className="grid gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => updateAnswer(field, option as SessionFeedbackAnswers[typeof field])}
            className={cn(
              "flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left transition-all duration-200",
              answers[field] === option
                ? "bg-gradient-to-r from-primary/15 to-primary/5 border-primary shadow-sm"
                : "bg-background/50 border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
              answers[field] === option
                ? "border-primary bg-primary"
                : "border-muted-foreground/40"
            )}>
              {answers[field] === option && (
                <Check className="w-3 h-3 text-primary-foreground" />
              )}
            </div>
            <span className="text-sm font-medium">{option}</span>
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
    <div className="space-y-2">
      <Label htmlFor={String(field)} className="text-base font-medium">{label}</Label>
      {type === "textarea" ? (
        <Textarea
          id={String(field)}
          value={(answers[field] as string) || ""}
          onChange={(e) => updateAnswer(field, e.target.value as SessionFeedbackAnswers[typeof field])}
          placeholder={placeholder}
          rows={3}
          className="bg-background/50 border-2 rounded-xl resize-none focus:border-primary transition-colors"
        />
      ) : (
        <Input
          id={String(field)}
          value={(answers[field] as string) || ""}
          onChange={(e) => updateAnswer(field, e.target.value as SessionFeedbackAnswers[typeof field])}
          placeholder={placeholder}
          className="bg-background/50 border-2 rounded-xl focus:border-primary transition-colors"
        />
      )}
    </div>
  );

  const renderNumberInput = (
    field: keyof SessionFeedbackAnswers,
    label: string,
    placeholder: string
  ) => (
    <div className="space-y-2">
      <Label htmlFor={String(field)} className="text-base font-medium">{label}</Label>
      <Input
        id={String(field)}
        type="number"
        min={0}
        value={(answers[field] as number) || ""}
        onChange={(e) => updateAnswer(field, parseInt(e.target.value) || undefined as SessionFeedbackAnswers[typeof field])}
        placeholder={placeholder}
        className="bg-background/50 border-2 rounded-xl focus:border-primary transition-colors max-w-[200px]"
      />
    </div>
  );

  const renderMultiSelect = (
    field: "valuablePaidFeatures",
    options: PaidFeatureOption[],
    label: string
  ) => {
    const selected = answers[field] || [];
    
    return (
      <div className="space-y-3">
        <Label className="text-base font-medium">{label}</Label>
        <div className="grid gap-2">
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    updateAnswer(field, selected.filter((o) => o !== option));
                  } else {
                    updateAnswer(field, [...selected, option]);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left transition-all duration-200",
                  isSelected
                    ? "bg-gradient-to-r from-primary/15 to-primary/5 border-primary shadow-sm"
                    : "bg-background/50 border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                )}>
                  {isSelected && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium">{option}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQuestionGroup = () => {
    const group = QUESTION_GROUPS[currentGroup];
    
    switch (group.id) {
      case "intro":
        return (
          <div className="space-y-6">
            {renderNumberInput(
              "timeSpentMinutes",
              "Q1. Approximately how much total time did you spend on Webyalaya? (in minutes)",
              "e.g., 30"
            )}
            {renderTextInput(
              "oneSentenceDescription",
              "Q2. In one sentence, how would you describe Webyalaya to a friend?",
              "Describe Webyalaya in one sentence..."
            )}
          </div>
        );

      case "first-impression":
        return (
          <div className="space-y-6">
            {renderRadioGroup(
              "firstFeeling",
              FIRST_FEELING_OPTIONS,
              "Q3. What was your first feeling when you landed on Webyalaya?"
            )}
            {renderRadioGroup(
              "clarityOfPurpose",
              CLARITY_OPTIONS,
              "Q4. How clear was it to understand what Webyalaya does within the first 30 seconds?"
            )}
          </div>
        );

      case "problem-solving":
        return (
          <div className="space-y-6">
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
            {renderRadioGroup(
              "previousSolution",
              PREVIOUS_SOLUTION_OPTIONS,
              "Q7. Before Webyalaya, how were you trying to solve this problem?"
            )}
          </div>
        );

      case "experience":
        return (
          <div className="space-y-6">
            {renderRadioGroup(
              "easeOfStart",
              EASE_OF_START_OPTIONS,
              "Q8. How easy was it to get started without any guidance?"
            )}
            {renderTextInput(
              "confidenceInteracting",
              "Q9. Did you feel confident interacting with other users on the platform? Why or why not?",
              "Share your experience..."
            )}
            {renderTextInput(
              "enjoyedMost",
              "Q10. What did you enjoy the most while using Webyalaya?",
              "What stood out to you..."
            )}
          </div>
        );

      case "friction":
        return (
          <div className="space-y-6">
            {renderRadioGroup(
              "feltStuck",
              YES_NO_OPTIONS,
              "Q11. At any point, did you feel stuck, confused, or unsure what to do next?"
            )}
            {answers.feltStuck === "Yes" && renderTextInput(
              "whereStuck",
              "Q12. If yes, where did you feel stuck or confused? Please explain.",
              "Describe where you felt stuck..."
            )}
            {renderTextInput(
              "removeForFriction",
              "Q13. If you could remove one thing that caused friction, what would it be?",
              "What would you remove..."
            )}
          </div>
        );

      case "value":
        return (
          <div className="space-y-6">
            {renderScaleInput(
              "valueScore",
              1,
              10,
              "Q14. On a scale of 1–10, how valuable does Webyalaya feel to you right now?"
            )}
            {renderTextInput(
              "whatMakeMustUse",
              "Q15. What would make Webyalaya a must-use platform for you?",
              "What features or improvements would make it essential..."
            )}
          </div>
        );

      case "peer-learning":
        return (
          <div className="space-y-6">
            {renderRadioGroup(
              "believePeerLearningHelpful",
              YES_NO_OPTIONS,
              "Q16. Do you believe learning from peers is helpful?"
            )}
            {renderRadioGroup(
              "trustIncreaseOption",
              TRUST_INCREASE_OPTIONS,
              "Q17. What would increase your trust the most?"
            )}
          </div>
        );

      case "comparison":
        return (
          <div className="space-y-6">
            {renderTextInput(
              "howDifferent",
              "Q18. How is Webyalaya different from other learning platforms you've used?",
              "What makes it unique..."
            )}
            {renderTextInput(
              "alternativeIfNotExist",
              "Q19. If Webyalaya didn't exist, what would you use instead?",
              "What alternatives would you consider..."
            )}
            {renderRadioGroup(
              "platformComparison",
              PLATFORM_COMPARISON_OPTIONS,
              "Q20. Compared to traditional learning platforms, Webyalaya feels more:"
            )}
          </div>
        );

      case "future-use":
        return (
          <div className="space-y-6">
            {renderRadioGroup(
              "likelihoodToContinue",
              CONTINUE_USING_OPTIONS,
              "Q21. How likely are you to continue using Webyalaya after beta?"
            )}
            {renderScaleInput(
              "npsScore",
              0,
              10,
              "Q22. How likely are you to recommend Webyalaya to a friend or colleague?"
            )}
            {renderTextInput(
              "stopRecommending",
              "Q23. What would stop you from recommending Webyalaya?",
              "What concerns would prevent you from recommending it..."
            )}
          </div>
        );

      case "pricing":
        return (
          <div className="space-y-6">
            {renderRadioGroup(
              "willingToPay",
              WILLING_TO_PAY_OPTIONS,
              "Q24. Would you be open to paying ₹1 per day for unlimited learning sessions and access to advanced features on Webyalaya?"
            )}
            {renderMultiSelect(
              "valuablePaidFeatures",
              PAID_FEATURE_OPTIONS,
              "Q25. Which of these features would you find most valuable as a paid user? (Select all that apply)"
            )}
            {renderTextInput(
              "whatMakesWorthPaying",
              "Q26. What would make Webyalaya worth paying for every day?",
              "What value would justify the cost..."
            )}
          </div>
        );

      case "improvements":
        return (
          <div className="space-y-6">
            {renderTextInput(
              "whatWouldChange",
              "Q27. If you were building Webyalaya with us, what would you change or improvise?",
              "Share your ideas for improvement..."
            )}
          </div>
        );

      case "final":
        return (
          <div className="space-y-6">
            {renderRadioGroup(
              "openToFeedbackCall",
              YES_NO_OPTIONS,
              "Q28. Would you be open to a 15-minute feedback call with our team?"
            )}
            {renderTextInput(
              "finalThoughts",
              "Q29. Any final thoughts or brutally honest feedback?",
              "We appreciate your honesty..."
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-0 shadow-2xl bg-background/95 backdrop-blur overflow-hidden">
      {/* Header */}
      <CardHeader className="relative pb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        {onBackToDashboard && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            onClick={onBackToDashboard}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <MessageSquareHeart className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Help Shape Webyalaya</h2>
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-muted-foreground mt-1">
              Your feedback directly shapes our platform's future
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentGroupData.icon}</span>
              <span className="font-semibold">{currentGroupData.title}</span>
            </div>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {currentGroup + 1} of {totalGroups}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Questions - scrollable area */}
        <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2 scrollbar-thin">
          {renderQuestionGroup()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentGroup === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            {onBackToDashboard && (
              <Button 
                variant="ghost" 
                onClick={onBackToDashboard}
                className="text-muted-foreground hover:text-foreground"
              >
                Exit to Dashboard
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={handleSkipPage} 
              className="text-muted-foreground hover:text-foreground"
            >
              Skip this section
            </Button>

            {currentGroup < totalGroups - 1 ? (
              <Button onClick={handleNext} className="gap-1 px-6">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="gap-2 px-6 bg-gradient-to-r from-primary to-primary/80"
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
