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
  onNotification?: (title: string, message?: string, type?: 'info' | 'warning' | 'error' | 'success') => void;
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
  onNotification,
}: UseDebateMicControlOptions): UseDebateMicControlReturn {
  const { localParticipant } = useLocalParticipant();
  const _room = useRoomContext();
  const isModerator = userRole === 'host' || userRole === 'moderator';
  const isCurrentSpeaker = currentSpeakerId === userId;
  const micControlRef = useRef<{ enabled: boolean; disabled: boolean }>({ enabled: false, disabled: false });
  const lastNotificationAtRef = useRef<Record<string, number>>({});

  const shouldNotify = useCallback((key: string, cooldownMs: number = 5000) => {
    const now = Date.now();
    const lastAt = lastNotificationAtRef.current[key] || 0;
    if (now - lastAt < cooldownMs) return false;
    lastNotificationAtRef.current[key] = now;
    return true;
  }, []);

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
      // Don't auto-enable, just unlock - user can manually unmute
      console.log('[useDebateMicControl] Mic unlocked for current speaker - user can now unmute');
      if (shouldNotify('mic-unlocked', 7000)) {
        onNotification?.('🎤 Microphone Unlocked', 'It\'s your turn! You can now unmute your microphone.', 'info');
      }
    }
  }, [localParticipant, userId, onNotification, shouldNotify]);

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

      localParticipant.setMicrophoneEnabled(false).catch((_err) => {
        console.error('[useDebateMicControl] Failed to disable mic:', _err);
      });

      setTimeout(() => {
        micControlRef.current.disabled = false;
      }, 1000);
    }
  }, [localParticipant, userId]);

  // Intercept callbacks to also apply mic state
  useEffect(() => {
    if (onMicEnabled) {
      const _original = onMicEnabled;
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

  // Show notification when it's user's turn but mic is muted
  const prevIsCurrentSpeakerRef = useRef(false);
  const notificationShownRef = useRef(false);
  useEffect(() => {
    if (!localParticipant || !userId || debateStatus !== DebateStatus.LIVE) {
      prevIsCurrentSpeakerRef.current = false;
      notificationShownRef.current = false;
      return;
    }
    
    // Check if user just became the current speaker
    const justBecameSpeaker = isCurrentSpeaker && !prevIsCurrentSpeakerRef.current;
    const _wasCurrentSpeaker = prevIsCurrentSpeakerRef.current;
    prevIsCurrentSpeakerRef.current = isCurrentSpeaker;
    
    // If user just became the current speaker and mic is muted, show notification
    if (justBecameSpeaker && !localParticipant.isMicrophoneEnabled) {
      if (shouldNotify('turn-reminder', 7000)) {
        onNotification?.('🎤 It\'s your turn to speak!', 'Please unmute your microphone to participate.', 'warning');
      }
      notificationShownRef.current = true;
    } else if (!isCurrentSpeaker) {
      // Reset notification flag when it's no longer their turn
      notificationShownRef.current = false;
    }
  }, [isCurrentSpeaker, localParticipant, userId, debateStatus, currentSpeakerId, onNotification, shouldNotify]);

  // Lock mic when it's not user's turn - force mute if they try to unmute
  useEffect(() => {
    if (!localParticipant) return;

    // If mic is locked (not user's turn), ensure mic is muted
    if (isMicLocked && localParticipant.isMicrophoneEnabled) {
      console.log('[useDebateMicControl] Auto-muting because mic is locked (not your turn)');
      localParticipant.setMicrophoneEnabled(false).catch((_err) => {
        console.error('[useDebateMicControl] Failed to auto-mute:', _err);
      });
    }
  }, [isMicLocked, localParticipant]);

  // Prevent manual unmute when mic is locked
  const prevMicEnabledRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!localParticipant) return;
    
    const currentMicEnabled = localParticipant.isMicrophoneEnabled;
    const wasEnabled = prevMicEnabledRef.current;
    
    // If user manually tried to unmute while locked, mute them again
    if (isMicLocked && currentMicEnabled && wasEnabled === false) {
      console.log('[useDebateMicControl] User tried to unmute while locked, muting again');
      localParticipant.setMicrophoneEnabled(false).catch((_err) => {
        console.error('[useDebateMicControl] Failed to enforce mute:', _err);
      });
      if (shouldNotify('mic-locked', 5000)) {
        onNotification?.('🔒 Microphone Locked', micLockReason || 'You cannot unmute during this phase.', 'warning');
      }
    }
    
    prevMicEnabledRef.current = currentMicEnabled;
  }, [localParticipant, isMicLocked, micLockReason, onNotification, shouldNotify]);

  return {
    isMicLocked,
    canToggleMic,
    micLockReason,
    handleMicEnabled: handleMicEnabledInternal,
    handleMicDisabled: handleMicDisabledInternal,
  };
}
