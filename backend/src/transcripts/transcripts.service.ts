import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { redisClient } from '../redis/redis.provider';
import { LoggerService } from '../common/logger';

interface TranscriptEntry {
  user: string;
  text: string;
  timestamp: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class TranscriptsService {
  private genAI: GoogleGenAI;

  // Rate limiting: max 10 summary requests per call ID per hour
  private summaryRateLimits = new Map<string, RateLimitEntry>();
  private readonly MAX_SUMMARIES_PER_HOUR = 10;
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

  // Cache for recent summaries to prevent duplicate API calls
  private summaryCache = new Map<
    string,
    { summary: string; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(TranscriptsService.name);
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY not configured. AI summaries will not work.',
      );
    } else {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Store a transcript chunk in Redis with TTL
   */
  async storeTranscriptChunk(
    callId: string,
    userName: string,
    text: string,
    timestamp: number,
  ): Promise<void> {
    const key = `call:${callId}:transcripts`;

    // Format timestamp as readable time
    const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Format as: "timestamp: username: transcription"
    const formattedEntry = `${timeStr}: ${userName}: ${text}`;
    const entry: TranscriptEntry = {
      user: userName,
      text: formattedEntry,
      timestamp,
    };

    // Push JSON string to Redis list
    await redisClient.rPush(key, JSON.stringify(entry));

    // Set TTL to 2 hours (7200 seconds) if not already set
    const ttl = await redisClient.ttl(key);
    if (ttl === -1) {
      await redisClient.expire(key, 7200);
    }

    this.logger.debug(
      `Stored transcript chunk for call ${callId}: "${formattedEntry}"`,
    );
  }

  /**
   * Compile all transcript chunks for a call into a sorted, clean transcript
   */
  async compileTranscript(callId: string): Promise<string> {
    const key = `call:${callId}:transcripts`;

    // Fetch all transcript chunks from Redis
    const rawChunks = await redisClient.lRange(key, 0, -1);

    if (rawChunks.length === 0) {
      this.logger.warn(`No transcript chunks found for call ${callId}`);
      return '';
    }

    // Parse and sort by timestamp
    const entries: TranscriptEntry[] = rawChunks
      .map((chunk) => {
        try {
          return JSON.parse(chunk) as TranscriptEntry;
        } catch (error) {
          this.logger.error(
            `Failed to parse transcript chunk: ${chunk}`,
            error,
          );
          return null;
        }
      })
      .filter((entry): entry is TranscriptEntry => entry !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Concatenate into clean chronological transcript with line breaks
    const transcript = entries.map((entry) => entry.text).join('\n');

    this.logger.log(
      `Compiled transcript for call ${callId}: ${entries.length} chunks, ${transcript.length} characters`,
    );

    return transcript;
  }

  /**
   * Check if rate limit is exceeded for a call ID
   */
  private checkRateLimit(callId: string): boolean {
    const now = Date.now();
    const limit = this.summaryRateLimits.get(callId);

    // Clean up expired entries
    if (limit && now > limit.resetTime) {
      this.summaryRateLimits.delete(callId);
      return true;
    }

    // Check if limit exceeded
    if (limit && limit.count >= this.MAX_SUMMARIES_PER_HOUR) {
      const remainingTime = Math.ceil((limit.resetTime - now) / 1000 / 60);
      this.logger.warn(
        `Rate limit exceeded for call ${callId}. Resets in ${remainingTime} minutes.`,
      );
      return false;
    }

    return true;
  }

  /**
   * Increment rate limit counter for a call ID
   */
  private incrementRateLimit(callId: string): void {
    const now = Date.now();
    const limit = this.summaryRateLimits.get(callId);

    if (limit && now <= limit.resetTime) {
      limit.count++;
    } else {
      this.summaryRateLimits.set(callId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW_MS,
      });
    }
  }

  /**
   * Clean up old rate limit and cache entries
   */
  private cleanupOldEntries(): void {
    const now = Date.now();

    // Clean rate limits
    for (const [callId, limit] of this.summaryRateLimits.entries()) {
      if (now > limit.resetTime) {
        this.summaryRateLimits.delete(callId);
      }
    }

    // Clean cache
    for (const [callId, cache] of this.summaryCache.entries()) {
      if (now - cache.timestamp > this.CACHE_TTL_MS) {
        this.summaryCache.delete(callId);
      }
    }
  }

  /**
   * Generate AI summary using Gemini 2.0 Flash with rate limiting
   */
  async generateSummary(transcript: string, callId?: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    if (!transcript || transcript.trim().length === 0) {
      return '## No transcript available\n\nThe meeting had no recorded transcript.';
    }

    // Check cache first if callId provided
    if (callId) {
      const cached = this.summaryCache.get(callId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        this.logger.log(`Using cached summary for call ${callId}`);
        return cached.summary;
      }

      // Check rate limit
      if (!this.checkRateLimit(callId)) {
        throw new Error(
          `Rate limit exceeded for call ${callId}. Please try again later.`,
        );
      }
    }

    // Clean up old entries periodically
    this.cleanupOldEntries();

    try {
      const prompt = `You are analyzing a meeting transcript with timestamps and speaker names. Ignore audio glitches, repetitions, "hello?", "can you hear me?", and other irrelevant technical noise from speech recognition.

Focus only on:
- decisions made
- agreements reached
- blockers identified
- tasks assigned
- responsibilities discussed
- key insights shared

Output the final result ONLY in the following Markdown format:

## Executive Summary
- Brief overview of the meeting purpose and outcomes
- Key decisions made

## Key Discussion Points
- Important topics discussed
- Technical insights shared
- Problems identified

## Action Items (with assignees)
- Specific tasks with responsible persons
- Deadlines if mentioned
- Next steps

Transcript:\n${transcript}`;

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Empty response from Gemini API');
      }

      let summary = rawText.trim();

      // Clean up any markdown code blocks if present
      if (summary.startsWith('```')) {
        summary = summary.replace(/^```(?:markdown)?\\s*|```$/g, '').trim();
      }

      this.logger.log(`Generated AI summary: ${summary.length} characters`);

      // Increment rate limit and cache result
      if (callId) {
        this.incrementRateLimit(callId);
        this.summaryCache.set(callId, {
          summary,
          timestamp: Date.now(),
        });
        this.logger.log(
          `Cached summary for call ${callId}. Rate limit: ${this.summaryRateLimits.get(callId)?.count}/${this.MAX_SUMMARIES_PER_HOUR}`,
        );
      }

      return summary;
    } catch (error) {
      this.logger.error('Failed to generate AI summary:', error);
      throw new Error('Failed to generate meeting summary');
    }
  }

  /**
   * Compile transcript and generate summary for a call
   */
  async compileAndSummarize(callId: string): Promise<string> {
    try {
      // Compile transcript
      const transcript = await this.compileTranscript(callId);

      if (!transcript || transcript.trim().length === 0) {
        this.logger.warn(`No transcript to summarize for call ${callId}`);
        return '## No transcript available\n\nThe meeting had no recorded transcript.';
      }

      // Log the complete transcript for the meeting
      this.logger.log(
        `\n📝 COMPLETE TRANSCRIPT FOR CALL ${callId}:\n${transcript}\n`,
      );

      // Generate AI summary with rate limiting
      const summary = await this.generateSummary(transcript, callId);

      // Log the generated summary
      this.logger.log(`\n📋 AI SUMMARY FOR CALL ${callId}:\n${summary}\n`);

      // Delete Redis key to free memory
      const key = `call:${callId}:transcripts`;
      await redisClient.del(key);
      this.logger.log(`Deleted transcript data for call ${callId}`);

      return summary;
    } catch (error) {
      this.logger.error(
        `Failed to compile and summarize call ${callId}:`,
        error,
      );
      throw error;
    }
  }
}
