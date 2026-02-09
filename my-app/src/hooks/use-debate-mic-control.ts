'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { DebateStatus, DebateUserRole, MicEnabledEvent, MicDisabledEvent } from '@/types/debate.types';

interface UseDebateMicControlOptions {
  debateStatus: DebateStatus;
  currentSpeakerId: string | null;
  userRole: DebateUserRole;
  userId?: string;
  onMicEnabled?: (event: MicEnabledEvent) => void;
  onMicDisabled?: (event: MicDisabledEvent) => void;
}

interface UseDebateMicControlReturn {
  isMicLocked: boolean;
  canToggleMic: boolean;
  micLockReason: string | null;
  handleMicEnabled: (event: MicEnabledEvent) => void;
  handleMicDisabled: (event: MicDisabledEvent) => void;
}

/**
 * Hook to manage microphone control during debate turns
 * Enforces turn-based mic control while allowing manual control during prep/ended phases
 */
export function useDebateMicControl({
  debateStatus,
  currentSpeakerId,
  userRole,
  userId,
  onMicEnabled,
  onMicDisabled,
}: UseDebateMicControlOptions): UseDebateMicControlReturn {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const isModerator = userRole === 'host' || userRole === 'moderator';
  const isCurrentSpeaker = currentSpeakerId === userId;
  const micControlRef = useRef<{ enabled: boolean; disabled: boolean }>({ enabled: false, disabled: false });

  // Determine if mic is locked and why
  const isMicLocked = (() => {
    if (debateStatus === DebateStatus.PREP) {
      // During prep, only moderators can use mic
      return !isModerator;
    }
    if (debateStatus === DebateStatus.LIVE) {
      // During live debate, only current speaker can use mic
      return !isCurrentSpeaker && !isModerator;
    }
    if (debateStatus === DebateStatus.ENDED || debateStatus === DebateStatus.PROCESSED) {
      // After debate ends, only moderators can use mic
      return !isModerator;
    }
    // During WAITING, manual control allowed
    return false;
  })();

  // Determine if user can manually toggle mic
  const canToggleMic = (() => {
    if (debateStatus === DebateStatus.PREP) {
      return isModerator; // Only moderators during prep
    }
    if (debateStatus === DebateStatus.LIVE) {
      return isCurrentSpeaker || isModerator; // Current speaker or moderators
    }
    if (debateStatus === DebateStatus.ENDED || debateStatus === DebateStatus.PROCESSED) {
      return isModerator; // Only moderators after debate ends
    }
    return true; // Manual control during WAITING
  })();

  const micLockReason = (() => {
    if (!isMicLocked) return null;
    if (debateStatus === DebateStatus.PREP) {
      return 'Only moderators can speak during prep phase';
    }
    if (debateStatus === DebateStatus.LIVE) {
      return isCurrentSpeaker ? null : 'Not your turn to speak';
    }
    if (debateStatus === DebateStatus.ENDED || debateStatus === DebateStatus.PROCESSED) {
      return 'Debate has ended. Only moderators can speak.';
    }
    return null;
  })();

  // Handle mic enabled/disabled events when callbacks are invoked
  // The parent will call these callbacks, and we intercept them to apply mic state
  const handleMicEnabledInternal = useCallback((event: MicEnabledEvent) => {
    if (!localParticipant || !userId) {
      console.log('[useDebateMicControl] Missing localParticipant or userId:', { hasLocalParticipant: !!localParticipant, hasUserId: !!userId });
      return;
    }

    console.log('[useDebateMicControl] Mic enabled event received:', {
      eventParticipantId: event.participantId,
      userId,
      localParticipantIdentity: localParticipant.identity,
      reason: event.reason,
    });

    const isForCurrentUser = 
      event.participantId === userId || 
      event.participantId === localParticipant.identity ||
      localParticipant.identity === userId;

    console.log('[useDebateMicControl] Is for current user?', isForCurrentUser);

    if (isForCurrentUser) {
      if (micControlRef.current.enabled) {
        console.log('[useDebateMicControl] Mic already enabled, skipping');
        return;
      }
      micControlRef.current.enabled = true;
      micControlRef.current.disabled = false;

      console.log('[useDebateMicControl] Enabling microphone...');
      console.log('[useDebateMicControl] Current mic state before enable:', localParticipant.isMicrophoneEnabled);
      
      localParticipant.setMicrophoneEnabled(true).then(() => {
        console.log('[useDebateMicControl] Microphone enabled successfully');
        console.log('[useDebateMicControl] Mic state after enable:', localParticipant.isMicrophoneEnabled);
        
        // Verify it's actually enabled
        setTimeout(() => {
          const isEnabled = localParticipant.isMicrophoneEnabled;
          console.log('[useDebateMicControl] Mic state after 500ms:', isEnabled);
          if (!isEnabled) {
            console.warn('[useDebateMicControl] Warning: Microphone was enabled but is now disabled. This might indicate a permission issue.');
          } else {
            // Check if we have an audio track
            const audioTrack = localParticipant.audioTrackPublications.values().next().value;
            if (audioTrack) {
              console.log('[useDebateMicControl] Audio track found:', {
                trackSid: audioTrack.trackSid,
                isMuted: audioTrack.isMuted,
                kind: audioTrack.kind,
              });
            } else {
              console.warn('[useDebateMicControl] Warning: No audio track found after enabling mic');
            }
          }
        }, 500);
      }).catch((err) => {
        console.error('[useDebateMicControl] Failed to enable mic:', err);
        // Check for specific error types
        if (err instanceof Error) {
          if (err.message.includes('permission') || err.name === 'NotAllowedError') {
            console.error('[useDebateMicControl] Microphone permission denied. User needs to grant permission in browser settings.');
          } else if (err.message.includes('track') || err.message.includes('not found')) {
            console.error('[useDebateMicControl] Microphone track not found. This might be a LiveKit connection issue.');
          } else {
            console.error('[useDebateMicControl] Unknown error enabling microphone:', err.message);
          }
        }
      });

      setTimeout(() => {
        micControlRef.current.enabled = false;
      }, 1000);
    } else {
      console.log('[useDebateMicControl] Event not for current user, ignoring');
    }
  }, [localParticipant, userId]);

  const handleMicDisabledInternal = useCallback((event: MicDisabledEvent) => {
    if (!localParticipant || !userId) return;

    const isForCurrentUser = 
      event.participantId === userId || 
      event.participantId === localParticipant.identity ||
      localParticipant.identity === userId;

    if (isForCurrentUser) {
      if (micControlRef.current.disabled) return;
      micControlRef.current.disabled = true;
      micControlRef.current.enabled = false;

      localParticipant.setMicrophoneEnabled(false).catch((err) => {
        console.error('[useDebateMicControl] Failed to disable mic:', err);
      });

      setTimeout(() => {
        micControlRef.current.disabled = false;
      }, 1000);
    }
  }, [localParticipant, userId]);

  // Intercept callbacks to also apply mic state
  useEffect(() => {
    if (onMicEnabled) {
      const original = onMicEnabled;
      // We can't modify the callback, so we'll call our handler when the callback is invoked
      // The parent needs to call both the original callback and our handler
      // For now, we'll rely on the parent calling handleMicEnabledInternal
    }
  }, [onMicEnabled, handleMicEnabledInternal]);

  useEffect(() => {
    if (onMicDisabled) {
      // Same as above
    }
  }, [onMicDisabled, handleMicDisabledInternal]);

  // Auto-enable mic when user becomes current speaker
  useEffect(() => {
    if (!localParticipant || !userId || debateStatus !== DebateStatus.LIVE) return;
    
    // If user is current speaker and mic is not enabled, enable it
    if (isCurrentSpeaker && !localParticipant.isMicrophoneEnabled) {
      console.log('[useDebateMicControl] Auto-enabling mic for current speaker');
      localParticipant.setMicrophoneEnabled(true).then(() => {
        console.log('[useDebateMicControl] Auto-enabled microphone successfully');
      }).catch((err) => {
        console.error('[useDebateMicControl] Failed to auto-enable mic:', err);
        // If permission error, log it clearly
        if (err instanceof Error && err.message.includes('permission')) {
          console.error('[useDebateMicControl] Microphone permission denied. User needs to grant permission.');
        }
      });
    }
  }, [isCurrentSpeaker, localParticipant, userId, debateStatus]);

  // Auto-mute when mic is locked (unless already muted)
  useEffect(() => {
    if (!localParticipant || !isMicLocked) return;

    // If mic is locked and user is not current speaker/moderator, ensure mic is muted
    if (isMicLocked && localParticipant.isMicrophoneEnabled) {
      console.log('[useDebateMicControl] Auto-muting because mic is locked');
      localParticipant.setMicrophoneEnabled(false).catch((err) => {
        console.error('[useDebateMicControl] Failed to auto-mute:', err);
      });
    }
  }, [isMicLocked, localParticipant, isCurrentSpeaker]);

  return {
    isMicLocked,
    canToggleMic,
    micLockReason,
    handleMicEnabled: handleMicEnabledInternal,
    handleMicDisabled: handleMicDisabledInternal,
  };
}
