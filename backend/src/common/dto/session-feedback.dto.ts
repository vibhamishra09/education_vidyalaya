import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';

export class SessionFeedbackAnswersDto {
  // Q1-Q2: Getting Started
  @IsOptional()
  @IsNumber()
  timeSpentMinutes?: number;

  @IsOptional()
  @IsString()
  oneSentenceDescription?: string;

  // Q3-Q4: First Impressions
  @IsOptional()
  @IsString()
  firstFeeling?: string;

  @IsOptional()
  @IsString()
  clarityOfPurpose?: string;

  // Q5-Q7: Problem Solving
  @IsOptional()
  @IsString()
  problemHopingToSolve?: string;

  @IsOptional()
  @IsString()
  problemSolvedExtent?: string;

  @IsOptional()
  @IsString()
  previousSolution?: string;

  // Q8-Q10: Experience
  @IsOptional()
  @IsString()
  easeOfStart?: string;

  @IsOptional()
  @IsString()
  confidenceInteracting?: string;

  @IsOptional()
  @IsString()
  enjoyedMost?: string;

  // Q11-Q13: Friction Points
  @IsOptional()
  @IsString()
  feltStuck?: string;

  @IsOptional()
  @IsString()
  whereStuck?: string;

  @IsOptional()
  @IsString()
  removeForFriction?: string;

  // Q14-Q15: Value Assessment
  @IsOptional()
  @IsNumber()
  valueScore?: number;

  @IsOptional()
  @IsString()
  whatMakeMustUse?: string;

  // Q16-Q17: Peer Learning
  @IsOptional()
  @IsString()
  believePeerLearningHelpful?: string;

  @IsOptional()
  @IsString()
  trustIncreaseOption?: string;

  // Q18-Q20: Platform Comparison
  @IsOptional()
  @IsString()
  howDifferent?: string;

  @IsOptional()
  @IsString()
  alternativeIfNotExist?: string;

  @IsOptional()
  @IsString()
  platformComparison?: string;

  // Q21-Q23: Future Use
  @IsOptional()
  @IsString()
  likelihoodToContinue?: string;

  @IsOptional()
  @IsNumber()
  npsScore?: number;

  @IsOptional()
  @IsString()
  stopRecommending?: string;

  // Q24-Q26: Pricing & Features
  @IsOptional()
  @IsString()
  willingToPay?: string;

  @IsOptional()
  @IsArray()
  valuablePaidFeatures?: string[];

  @IsOptional()
  @IsString()
  whatMakesWorthPaying?: string;

  // Q27: Improvements
  @IsOptional()
  @IsString()
  whatWouldChange?: string;

  // Q28-Q29: Final Thoughts
  @IsOptional()
  @IsString()
  openToFeedbackCall?: string;

  @IsOptional()
  @IsString()
  finalThoughts?: string;
}

export class SessionFeedbackDto {
  @IsString()
  sessionId: string;

  @IsEnum(['studyRoom', 'peerSession'])
  sessionType: 'studyRoom' | 'peerSession';

  @IsBoolean()
  isHost: boolean;

  @IsOptional()
  answers?: SessionFeedbackAnswersDto;

  @IsOptional()
  @IsString()
  submittedAt?: string;
}
