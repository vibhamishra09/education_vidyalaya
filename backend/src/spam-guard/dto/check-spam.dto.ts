export class CheckSpamDto {
  text: string;
  context?: 'title' | 'description' | 'chat' | 'profile' | 'general';
}

export class SpamResultDto {
  valid: boolean;
  score: number;
  reasons: string[];
  suggestion: string;
  detail: { toxic: number; spam: number; gibberish: number };
}