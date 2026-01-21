'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface UseSpeechRecognitionProps {
  callId: string | null;
  userId: string | null;
  socket: Socket | null;
  enabled: boolean;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

/**
 * Custom hook for real-time speech recognition with auto-restart and throttle-free streaming
 */
export function useSpeechRecognition({
  callId,
  userId,
  socket,
  enabled,
}: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  
  // Add throttling refs for smart speech recognition
  const lastSentTextRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);
  const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    // Only start if enabled and all required props are present
    if (!enabled || !callId || !userId || !socket || !socket.connected) {
      // Stop recognition if it's running
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsListening(false);
      }
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Get interim results for real-time feel
    recognition.lang = 'en-US';

    shouldRestartRef.current = true;
    recognitionRef.current = recognition;

    // Handle results - smart throttling to avoid duplicates
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const lastResult = results[event.resultIndex];
      
      if (lastResult) {
        const transcript = lastResult[0].transcript.trim();
        const isFinal = lastResult.isFinal;
        const now = Date.now();

        // Skip empty or very short transcripts
        if (!transcript || transcript.length < 3) return;

        // For final results, always send immediately
        if (isFinal) {
          // Clear any pending interim send
          if (sendTimeoutRef.current) {
            clearTimeout(sendTimeoutRef.current);
            sendTimeoutRef.current = null;
          }

          // Only send if it's different from last sent text
          if (transcript !== lastSentTextRef.current) {
            socket.emit('transcript-chunk', {
              user: userId,
              text: transcript,
              timestamp: now,
              callId: callId,
              isFinal: true,
            });

            console.log(`🎤 [SpeechRecognition] Sent FINAL transcript: "${transcript}"`);
            lastSentTextRef.current = transcript;
            lastSentTimeRef.current = now;
          }
          return;
        }

        // For interim results, use smart throttling
        const timeSinceLastSend = now - lastSentTimeRef.current;
        const isSignificantlyDifferent = 
          transcript.length > lastSentTextRef.current.length + 3 || // 3+ new characters
          !transcript.startsWith(lastSentTextRef.current.substring(0, Math.min(10, lastSentTextRef.current.length))); // Different beginning

        // Send interim results only if:
        // 1. It's significantly different from last sent text, AND
        // 2. At least 800ms have passed since last send
        if (isSignificantlyDifferent && timeSinceLastSend > 800) {
          // Clear any existing timeout
          if (sendTimeoutRef.current) {
            clearTimeout(sendTimeoutRef.current);
          }

          // Send with slight delay to batch rapid changes
          sendTimeoutRef.current = setTimeout(() => {
            socket.emit('transcript-chunk', {
              user: userId,
              text: transcript,
              timestamp: Date.now(),
              callId: callId,
              isFinal: false,
            });

            console.log(`🎤 [SpeechRecognition] Sent interim transcript: "${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`); 
            lastSentTextRef.current = transcript;
            lastSentTimeRef.current = Date.now();
            sendTimeoutRef.current = null;
          }, 200);
        }
      }
    };

    // Handle errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Don't treat these as fatal errors
      if (event.error === 'no-speech') {
        console.log('⏸️  [SpeechRecognition] No speech detected, continuing...');
        return;
      }
      
      if (event.error === 'aborted') {
        console.log('🔄 [SpeechRecognition] Recognition aborted (likely due to restart), ignoring...');
        return;
      }

      // Network errors are common and not actionable - just log quietly
      if (event.error === 'network') {
        console.log('🌐 [SpeechRecognition] Network error (expected in some environments)');
        return;
      }

      // Only log and set error for actual problems
      if (event.error !== 'not-allowed') {
        console.error('🚨 [SpeechRecognition] Error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    // Auto-restart when recognition stops
    recognition.onend = () => {
      console.log('🔄 [SpeechRecognition] Recognition ended');
      setIsListening(false);

      // Restart if still enabled and recognition is still the current one
      if (shouldRestartRef.current && enabled && callId && userId && socket?.connected && recognitionRef.current === recognition) {
        console.log('🔄 [SpeechRecognition] Auto-restarting...');
        setTimeout(() => {
          // Double-check we should still restart
          if (shouldRestartRef.current && recognitionRef.current === recognition) {
            try {
              recognition.start();
              setIsListening(true);
              console.log('✅ [SpeechRecognition] Restarted successfully');
            } catch (err) {
              console.error('❌ [SpeechRecognition] Failed to restart:', err);
            }
          }
        }, 200); // Slightly longer delay to prevent rapid restarts
      }
    };

    // Start recognition with safety check
    try {
      // Double-check if already listening to prevent 'aborted' error
      if (recognitionRef.current && recognitionRef.current !== recognition) {
        console.log('🛑 [SpeechRecognition] Stopping previous recognition before starting new one');
        recognitionRef.current.stop();
      }
      
      recognition.start();
      setIsListening(true);
      console.log('🎤 [SpeechRecognition] Started listening');
    } catch (err) {
      console.error('❌ [SpeechRecognition] Failed to start:', err);
      // Don't set error for InvalidStateError (usually means already started)
      if (!(err as Error).toString().includes('InvalidStateError')) {
        setError('Failed to start speech recognition');
      }
    }

    // Cleanup
    return () => {
      shouldRestartRef.current = false;
      
      // Clear any pending sends
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log('🛑 [SpeechRecognition] Stopped listening');
        } catch (err) {
          console.error('Error stopping recognition:', err);
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
    };
  }, [callId, userId, socket, enabled]);

  return {
    isListening,
    error,
  };
}
