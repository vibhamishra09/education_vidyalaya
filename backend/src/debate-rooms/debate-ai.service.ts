import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { LoggerService } from '../common/logger';

interface TranscriptWithParticipant {
  id: string;
  participantId: string;
  turnNumber: number;
  text: string;
  participant: {
    id: string;
    user: {
      id: string;
      name: string;
    };
    team: {
      side: 'FOR' | 'AGAINST';
    };
  };
}

interface TeamWithParticipants {
  id: string;
  side: 'FOR' | 'AGAINST';
  participants: {
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
    };
  }[];
}

export interface ParticipantEvaluation {
  participantId: string;
  ideaScore: number;
  clarityScore: number;
  rebuttalScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
}

@Injectable()
export class DebateAiService {
  private genAI: GoogleGenAI | null = null;

  constructor(private configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DebateAiService.name);
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY not configured. AI evaluations will not work.',
      );
    } else {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Evaluate all participants in a debate
   */
  async evaluateDebate(
    topic: string,
    transcripts: TranscriptWithParticipant[],
    teams: TeamWithParticipants[],
  ): Promise<ParticipantEvaluation[]> {
    if (!this.genAI) {
      this.logger.error('AI service not configured');
      // Return default scores if AI is not configured
      return this.generateDefaultEvaluations(teams);
    }

    // Group transcripts by participant
    const participantTranscripts = new Map<string, {
      participant: TranscriptWithParticipant['participant'];
      texts: string[];
    }>();

    for (const transcript of transcripts) {
      const existing = participantTranscripts.get(transcript.participantId);
      if (existing) {
        existing.texts.push(transcript.text);
      } else {
        participantTranscripts.set(transcript.participantId, {
          participant: transcript.participant,
          texts: [transcript.text],
        });
      }
    }

    // Format the debate transcript for AI
    const formattedTranscript = this.formatTranscriptForAI(transcripts);
    const participantList = this.formatParticipantList(teams);

    // Build the evaluation prompt
    const prompt = this.buildEvaluationPrompt(
      topic,
      formattedTranscript,
      participantList,
    );

    try {
      const model = this.genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const response = await model;
      const responseText = response.text || '';

      // Parse AI response
      const evaluations = this.parseAIResponse(responseText, teams);
      
      this.logger.log(`Generated evaluations for ${evaluations.length} participants`);
      return evaluations;
    } catch (error) {
      this.logger.error('AI evaluation failed:', error);
      return this.generateDefaultEvaluations(teams);
    }
  }

  /**
   * Format transcripts for AI consumption
   */
  private formatTranscriptForAI(transcripts: TranscriptWithParticipant[]): string {
    const sortedTranscripts = [...transcripts].sort((a, b) => a.turnNumber - b.turnNumber);
    
    return sortedTranscripts
      .map((t) => {
        const speaker = t.participant.user.name;
        const side = t.participant.team.side;
        return `[Turn ${t.turnNumber + 1}] [Team ${side}] ${speaker}:\n${t.text}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Format participant list for AI
   */
  private formatParticipantList(teams: TeamWithParticipants[]): string {
    const lines: string[] = [];
    
    for (const team of teams) {
      lines.push(`\nTeam ${team.side}:`);
      for (const p of team.participants) {
        lines.push(`  - ${p.user.name} (ID: ${p.id})`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Build the comprehensive evaluation prompt
   */
  private buildEvaluationPrompt(
    topic: string,
    transcript: string,
    participantList: string,
  ): string {
    return `You are an expert debate judge and evaluator. You will analyze a debate and provide detailed evaluations for each participant.

## DEBATE TOPIC/MOTION
"${topic}"

## PARTICIPANTS
${participantList}

## DEBATE TRANSCRIPT
${transcript}

## YOUR TASK
Evaluate EACH participant based on the following criteria (score 0-10 for each):

1. **Idea Score (0-10)**: Quality, originality, and relevance of arguments presented
   - Are the arguments logically sound?
   - Do they directly address the motion?
   - Are they well-researched or insightful?

2. **Clarity Score (0-10)**: How clearly the participant expressed their ideas
   - Was the speech well-structured?
   - Was the language clear and understandable?
   - Was the pacing appropriate?

3. **Rebuttal Score (0-10)**: Quality of responses to opposing arguments
   - Did they address opponents' points?
   - Were counter-arguments effective?
   - Did they anticipate and preempt opposition?

4. **Overall Score (0-10)**: Weighted average considering all factors
   - Formula suggestion: (Idea * 0.4 + Clarity * 0.3 + Rebuttal * 0.3)

## RESPONSE FORMAT
Respond with a JSON array containing one object per participant. Each object MUST have:
- participantId: The participant's ID (from the list above)
- ideaScore: number (0-10)
- clarityScore: number (0-10)
- rebuttalScore: number (0-10)
- overallScore: number (0-10)
- strengths: array of 2-3 specific strength points
- weaknesses: array of 2-3 specific areas for improvement
- suggestions: array of 2-3 actionable suggestions
- summary: 2-3 sentence summary of their performance

## IMPORTANT GUIDELINES
- Be fair and objective
- Base evaluations ONLY on what was said in the transcript
- If a participant didn't speak (no transcript), give scores of 0 and note they didn't participate
- Provide constructive, specific feedback
- Consider the debate format (alternating turns between teams)

Respond ONLY with the JSON array, no additional text:`;
  }

  /**
   * Parse AI response into structured evaluations
   */
  private parseAIResponse(
    responseText: string,
    teams: TeamWithParticipants[],
  ): ParticipantEvaluation[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = responseText;
      
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      } else {
        // Try to find JSON array directly
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonStr = arrayMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Validate and normalize each evaluation
      return parsed.map((item: any) => this.normalizeEvaluation(item));
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      this.logger.debug('Raw response:', responseText);
      return this.generateDefaultEvaluations(teams);
    }
  }

  /**
   * Normalize and validate a single evaluation
   */
  private normalizeEvaluation(item: any): ParticipantEvaluation {
    const clampScore = (score: any): number => {
      const num = Number(score) || 0;
      return Math.max(0, Math.min(10, num));
    };

    const ensureStringArray = (arr: any): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr.filter((s) => typeof s === 'string').slice(0, 5);
    };

    return {
      participantId: String(item.participantId || ''),
      ideaScore: clampScore(item.ideaScore),
      clarityScore: clampScore(item.clarityScore),
      rebuttalScore: clampScore(item.rebuttalScore),
      overallScore: clampScore(item.overallScore),
      strengths: ensureStringArray(item.strengths),
      weaknesses: ensureStringArray(item.weaknesses),
      suggestions: ensureStringArray(item.suggestions),
      summary: String(item.summary || 'No summary provided.'),
    };
  }

  /**
   * Generate default evaluations when AI is unavailable
   */
  private generateDefaultEvaluations(
    teams: TeamWithParticipants[],
  ): ParticipantEvaluation[] {
    const evaluations: ParticipantEvaluation[] = [];

    for (const team of teams) {
      for (const participant of team.participants) {
        evaluations.push({
          participantId: participant.id,
          ideaScore: 5,
          clarityScore: 5,
          rebuttalScore: 5,
          overallScore: 5,
          strengths: ['Participated in the debate'],
          weaknesses: ['AI evaluation was unavailable'],
          suggestions: ['Please request manual review'],
          summary: 'Automated evaluation was not available. Default scores assigned.',
        });
      }
    }

    return evaluations;
  }
}
