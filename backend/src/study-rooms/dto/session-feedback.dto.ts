import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';

// DTO for submitting session feedback
export class SessionFeedbackDto {
  @IsString()
  sessionId: string;

  @IsString()
  sessionType: 'studyRoom' | 'peerSession';

  @IsBoolean()
  isHost: boolean;

  @IsObject()
  answers: SessionFeedbackAnswers;

  @IsOptional()
  @IsString()
  submittedAt?: string;
}

// Type for all feedback answers stored as JSON
export interface SessionFeedbackAnswers {
  // Q1-Q2: Getting Started
  timeSpentMinutes?: number;
  oneSentenceDescription?: string;

  // Q3-Q4: First Impressions
  firstFeeling?: 'Excited' | 'Curious' | 'Confused' | 'Neutral' | 'Disgusting';
  clarityOfPurpose?:
    | 'Very clear'
    | 'Somewhat clear'
    | 'Not clear'
    | 'Confusing';

  // Q5-Q7: Problem Solving
  problemHopingToSolve?: string;
  problemSolvedExtent?: 'Completely' | 'Mostly' | 'Partially' | 'Not really';
  previousSolution?:
    | 'YouTube or online videos'
    | 'Paid courses'
    | 'Friends or peers'
    | 'Self-learning'
    | "Couldn't find a solution";

  // Q8-Q10: Experience
  easeOfStart?:
    | 'Extremely easy'
    | 'Easy'
    | 'Neutral'
    | 'Difficult'
    | 'Very difficult';
  confidenceInteracting?: string;
  enjoyedMost?: string;

  // Q11-Q13: Friction Points
  feltStuck?: 'Yes' | 'No';
  whereStuck?: string;
  removeForFriction?: string;

  // Q14-Q15: Value Assessment
  valueScore?: number; // 1-10
  whatMakeMustUse?: string;

  // Q16-Q17: Peer Learning
  believePeerLearningHelpful?: 'Yes' | 'No';
  trustIncreaseOption?:
    | 'User profiles & credibility'
    | 'Ratings & reviews'
    | 'AI Moderation & guidelines'
    | 'Verified users';

  // Q18-Q20: Platform Comparison
  howDifferent?: string;
  alternativeIfNotExist?: string;
  platformComparison?:
    | 'Human'
    | 'Practical'
    | 'Interactive'
    | 'Flexible'
    | 'Confusing'
    | 'Less useful';

  // Q21-Q23: Future Use
  likelihoodToContinue?: 'Very likely' | 'Likely' | 'Not sure' | 'Unlikely';
  npsScore?: number; // 0-10
  stopRecommending?: string;

  // Q24-Q26: Pricing & Features
  willingToPay?: 'Yes, definitely' | 'Maybe, if the value is clear' | 'No';
  valuablePaidFeatures?: string[];
  whatMakesWorthPaying?: string;

  // Q27: Improvements
  whatWouldChange?: string;

  // Q28-Q29: Final Thoughts
  openToFeedbackCall?: 'Yes' | 'No';
  finalThoughts?: string;
}
