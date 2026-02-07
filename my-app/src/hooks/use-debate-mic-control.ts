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
    if (!localParticipant || !userId) return;

    const isForCurrentUser = 
      event.participantId === userId || 
      event.participantId === localParticipant.identity ||
      localParticipant.identity === userId;

    if (isForCurrentUser) {
      if (micControlRef.current.enabled) return;
      micControlRef.current.enabled = true;
      micControlRef.current.disabled = false;

      localParticipant.setMicrophoneEnabled(true).catch((err) => {
        console.error('[useDebateMicControl] Failed to enable mic:', err);
      });

      setTimeout(() => {
        micControlRef.current.enabled = false;
      }, 1000);
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

  // Auto-mute when mic is locked (unless already muted)
  useEffect(() => {
    if (!localParticipant || !isMicLocked) return;

    // If mic is locked and user is not current speaker/moderator, ensure mic is muted
    if (isMicLocked && localParticipant.isMicrophoneEnabled) {
      localParticipant.setMicrophoneEnabled(false).catch((err) => {
        console.error('[useDebateMicControl] Failed to auto-mute:', err);
      });
    }
  }, [isMicLocked, localParticipant]);

  return {
    isMicLocked,
    canToggleMic,
    micLockReason,
    handleMicEnabled: handleMicEnabledInternal,
    handleMicDisabled: handleMicDisabledInternal,
  };
}
