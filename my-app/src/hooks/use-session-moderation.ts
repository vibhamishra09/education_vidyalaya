import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { getSocketIoBaseUrl } from '@/lib/socket-base-url';
import { joineeFlowLog } from '@/lib/joinee-flow-log';

// Room permissions interface for the "Lock" system
export interface RoomPermissions {
  allowAudio: boolean;
  allowVideo: boolean;
  allowChat: boolean;
  allowChatEveryone: boolean;
  allowChatHost: boolean;
  allowChatUser: boolean;
  allowParticipantList: boolean;
  allowScratchPad: boolean;
}

// Room settings stored in Redis (host view)
export interface RoomSettings {
  lockAudio: boolean;
  lockVideo: boolean;
  chatDisabled: boolean;
  hideParticipantList: boolean;
  chatRestrictToHostOnly: boolean;
  lockScratchPad: boolean;
}

export interface ParticipantChatLocks {
  everyone: boolean;
  host: boolean;
  user: boolean;
}

// Request from host to turn on audio/video
export interface PermissionRequest {
  type: 'audio' | 'video';
  hostId: string;
}

// Notification for participant when host mutes them
export interface ModerationNotification {
  type: 'muted' | 'video-disabled';
  isLocked: boolean;
}

// Pending request from participant to host
export interface ParticipantPermissionRequest {
  userId: string;
  type: 'audio' | 'video';
  timestamp: number;
}

// Flash Message interfaces
export interface FlashMessage {
  id: string;
  type: 'QUESTION' | 'AD_HOC' | 'MEDIA';
  content: string;
  options?: string[];
  duration?: number;
  position?: 'top' | 'center' | 'bottom';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  timestamp: number;
}

export interface FlashQuestion {
  id: string;
  text: string;
  options?: string[];
  type?: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN';
  order?: number;
  duration?: number;
  position?: 'top' | 'center' | 'bottom';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
}

function uniqStrings(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0))];
}

export function useSessionModeration({
  sessionId,
  sessionType,
  isHost: _isHost,
  token,
  userId,
  /** LiveKit identity, Clerk id, DB id — host targets `participant.identity` which may differ from Clerk id for guest links */
  identityMatchIds,
  enabled = true,
  /** Joinee-only: log meet/moderation socket steps to `logs/joinee-flow.txt` when NEXT_PUBLIC_JOINEE_FLOW_FILE=1 */
  meetFlowTrace = false,
}: {
  sessionId: string | null;
  sessionType: 'studyRoom' | 'peerSession' | null;
  isHost: boolean;
  token: string | null;
  userId?: string | null;
  identityMatchIds?: string[] | null;
  enabled?: boolean;
  meetFlowTrace?: boolean;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Room-wide permissions (Lock system) - computed for this user
  const [permissions, setPermissions] = useState<RoomPermissions>({
    allowAudio: true,
    allowVideo: true,
    allowChat: true,
    allowChatEveryone: true,
    allowChatHost: true,
    allowChatUser: true,
    allowParticipantList: true,
    allowScratchPad: true,
  });
  
  // Room settings from Redis (for host UI)
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    lockAudio: false,
    lockVideo: false,
    chatDisabled: false,
    hideParticipantList: false,
    chatRestrictToHostOnly: false,
    lockScratchPad: false,
  });

  const [participantChatLocks, setParticipantChatLocks] = useState<Record<string, ParticipantChatLocks>>({});
  
  // Host status from server
  const [isHostFromServer, setIsHostFromServer] = useState(false);
  
  // Pending permission request from host (for participants)
  const [pendingPermissionRequest, setPendingPermissionRequest] = useState<PermissionRequest | null>(null);
  const pendingPermissionRequestRef = useRef<PermissionRequest | null>(null);
  useEffect(() => {
    pendingPermissionRequestRef.current = pendingPermissionRequest;
  }, [pendingPermissionRequest]);
  
  // Notification when host mutes participant
  const [moderationNotification, setModerationNotification] = useState<ModerationNotification | null>(null);
  
  // Pending requests from participants (for host to see)
  const [pendingParticipantRequests, setPendingParticipantRequests] = useState<ParticipantPermissionRequest[]>([]);

  // Flash Message state
  const [activeFlashMessage, setActiveFlashMessage] = useState<FlashMessage | null>(null);
  const [flashQuestions, setFlashQuestions] = useState<FlashQuestion[]>([]);

  const connectingRef = useRef(false);
  const meetFlowTraceRef = useRef(meetFlowTrace);
  meetFlowTraceRef.current = meetFlowTrace;
  const userIdRef = useRef(userId);
  const identityMatchRef = useRef<string[]>(uniqStrings([userId, ...(identityMatchIds ?? [])]));

  // Keep the ref up to date
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    identityMatchRef.current = uniqStrings([userId, ...(identityMatchIds ?? [])]);
  }, [userId, identityMatchIds]);

  useEffect(() => {
    if (!sessionId || !sessionType || !token || !enabled || connectingRef.current) return;

    const traceMeet = (step: string, detail?: Record<string, unknown>) => {
      if (!meetFlowTraceRef.current) return;
      joineeFlowLog(step, { subsystem: 'meet_moderation', ...detail });
    };

    connectingRef.current = true;
    const url = getSocketIoBaseUrl();
    traceMeet('meet:moderation_socket_prepare', {
      url,
      sessionId: sessionId.slice(0, 8),
      sessionType,
    });
    const s = io(`${url}/session-moderation`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
    });

    s.on('connect', () => {
      setIsConnected(true);
      setSocket(s);
      traceMeet('meet:moderation_transport_connected', {
        sessionId: sessionId.slice(0, 8),
        sessionType,
      });
      s.emit('join-session', { sessionId, sessionType });
      traceMeet('meet:moderation_emit_join_session', {
        sessionId: sessionId.slice(0, 8),
        sessionType,
      });
    });

    s.on('connect_error', (err: Error) => {
      traceMeet('meet:moderation_connect_error', {
        message: err?.message,
        name: err?.name,
      });
    });

    s.on('disconnect', (reason: string) => {
      setIsConnected(false);
      traceMeet('meet:moderation_disconnect', { reason });
    });

    // New sync-permissions event from Redis-backed backend
    s.on('sync-permissions', (data: { 
      sessionId: string; 
      permissions: RoomPermissions;
      roomSettings: RoomSettings;
      isHost: boolean;
      flashQuestions?: FlashQuestion[];
      activeFlashMessage?: FlashMessage;
    }) => {
      traceMeet('meet:sync_permissions', {
        sessionId:
          typeof data.sessionId === 'string' ? data.sessionId.slice(0, 8) : undefined,
        isHost: data.isHost,
        allowChat: data.permissions?.allowChat,
        allowAudio: data.permissions?.allowAudio,
        allowVideo: data.permissions?.allowVideo,
      });
      console.log('[moderation] sync-permissions:', data);
      if (data.permissions) {
        setPermissions(data.permissions);
        const newChatDisabled = !data.permissions.allowChat;
        setChatDisabled(newChatDisabled);
      }
      if (data.roomSettings) {
        setRoomSettings(data.roomSettings);
      }
      setIsHostFromServer(data.isHost);
      
      if (data.flashQuestions) {
        setFlashQuestions(data.flashQuestions);
      }
      if (data.activeFlashMessage) {
        setActiveFlashMessage(data.activeFlashMessage);
      }
    });

    // Room settings updated (for host UI)
    s.on('room-settings-updated', (data: { settings: RoomSettings }) => {
      if (data.settings) {
        setRoomSettings(data.settings);
        setChatDisabled(data.settings.chatDisabled);
      }
    });

    // User-specific permissions updated
    s.on('user-permissions-updated', (data: { targetUserId: string; permissions: RoomPermissions }) => {
      if (identityMatchRef.current.includes(data.targetUserId) && data.permissions) {
        setPermissions(data.permissions);
        setChatDisabled(!data.permissions.allowChat);
        if (data.permissions.allowAudio === false) {
          setPendingPermissionRequest((prev) =>
            prev?.type === 'audio' ? null : prev,
          );
        }
        if (data.permissions.allowVideo === false) {
          setPendingPermissionRequest((prev) =>
            prev?.type === 'video' ? null : prev,
          );
        }
      }
    });

    s.on('moderation-joined', (data: { sessionId: string; permissions?: RoomPermissions }) => {
      traceMeet('meet:moderation_joined', {
        sessionId:
          typeof data.sessionId === 'string' ? data.sessionId.slice(0, 8) : undefined,
        allowChat: data.permissions?.allowChat,
      });
      console.log('[moderation] joined session with permissions:', data.permissions);
      if (data.permissions) {
        setPermissions(data.permissions);
        // Sync chatDisabled with permissions
        setChatDisabled(!data.permissions.allowChat);
      }
    });

    s.on('meeting-ended', (_data: { reason?: string }) => {
      console.log('[moderation] meeting-ended', _data);
      setMeetingEnded(true);
    });

    s.on('chat-toggled', (data: { disabled: boolean }) => {
      setChatDisabled(!!data.disabled);
    });

    // Handle permissions updates (Lock system)
    s.on('permissions-updated', (data: { targetUserId?: string; permissions: Partial<RoomPermissions> }) => {
      if (!data.targetUserId) {
        setPermissions(prev => ({ ...prev, ...data.permissions }));
        if (data.permissions.allowChat !== undefined) {
          setChatDisabled(!data.permissions.allowChat);
        }
      } else if (data.targetUserId && identityMatchRef.current.includes(data.targetUserId)) {
        setPermissions(prev => ({ ...prev, ...data.permissions }));
        if (data.permissions.allowChat !== undefined) {
          setChatDisabled(!data.permissions.allowChat);
        }
        if (data.permissions.allowAudio === false) {
          setPendingPermissionRequest((prev) =>
            prev?.type === 'audio' ? null : prev,
          );
        }
        if (data.permissions.allowVideo === false) {
          setPendingPermissionRequest((prev) =>
            prev?.type === 'video' ? null : prev,
          );
        }
      }
      // Update participant locks for UI feedback
      if (data.targetUserId && data.permissions) {
        const targetUserId = data.targetUserId;
        setParticipantChatLocks((prev) => {
          const existing = prev[targetUserId] || { everyone: false, host: false, user: false };
          return {
            ...prev,
            [targetUserId]: {
              everyone: data.permissions.allowChatEveryone !== undefined ? !data.permissions.allowChatEveryone : existing.everyone,
              host: data.permissions.allowChatHost !== undefined ? !data.permissions.allowChatHost : existing.host,
              user: data.permissions.allowChatUser !== undefined ? !data.permissions.allowChatUser : existing.user,
            }
          };
        });
      }
    });

    // Host requested participant to turn on audio
    s.on('host-requested-audio', (data: { targetUserId: string; hostId: string }) => {
      const forMe = identityMatchRef.current.includes(data.targetUserId);
      traceMeet('meet:host_requested_audio', {
        forMe,
        hostId:
          typeof data.hostId === 'string'
            ? data.hostId.slice(0, 12)
            : undefined,
        targetUserId:
          typeof data.targetUserId === 'string'
            ? data.targetUserId.slice(0, 12)
            : undefined,
      });
      if (meetFlowTraceRef.current) {
        joineeFlowLog('meet:host_request_audio_received', {
          subsystem: 'meet_moderation',
          forMe,
          hostId:
            typeof data.hostId === 'string' ? data.hostId.slice(0, 12) : null,
          targetUserId:
            typeof data.targetUserId === 'string'
              ? data.targetUserId.slice(0, 12)
              : null,
          sessionId: sessionId ? sessionId.slice(0, 8) : null,
        });
      }
      if (forMe) {
        setPendingPermissionRequest({ type: 'audio', hostId: data.hostId });
      }
    });

    // Host requested participant to turn on video
    s.on('host-requested-video', (data: { targetUserId: string; hostId: string }) => {
      const forMe = identityMatchRef.current.includes(data.targetUserId);
      traceMeet('meet:host_requested_video', {
        forMe,
        hostId:
          typeof data.hostId === 'string'
            ? data.hostId.slice(0, 12)
            : undefined,
        targetUserId:
          typeof data.targetUserId === 'string'
            ? data.targetUserId.slice(0, 12)
            : undefined,
      });
      if (meetFlowTraceRef.current) {
        joineeFlowLog('meet:host_request_video_received', {
          subsystem: 'meet_moderation',
          forMe,
          hostId:
            typeof data.hostId === 'string' ? data.hostId.slice(0, 12) : null,
          targetUserId:
            typeof data.targetUserId === 'string'
              ? data.targetUserId.slice(0, 12)
              : null,
          sessionId: sessionId ? sessionId.slice(0, 8) : null,
        });
      }
      if (forMe) {
        setPendingPermissionRequest({ type: 'video', hostId: data.hostId });
      }
    });

    // Host muted / disabled video — apply on device without joinee consent (handled in EnhancedVideoRoom).
    // If a "host asked you to turn on mic/camera" modal is open, close it; host override wins.
    s.on(
      'moderation-mute',
      (data: {
        action: 'mute' | 'unmute';
        targetUserId?: string;
        hostClerkId?: string;
      }) => {
        if (data.action !== 'mute') return;
        const ids = identityMatchRef.current;
        const appliesToMe =
          !data.targetUserId || ids.some((id) => id === data.targetUserId);
        if (!appliesToMe) return;
        setPendingPermissionRequest((prev) =>
          prev?.type === 'audio' ? null : prev,
        );
      },
    );

    s.on(
      'moderation-video',
      (data: {
        action: 'disable' | 'enable';
        targetUserId?: string;
        hostClerkId?: string;
      }) => {
        if (data.action !== 'disable') return;
        const ids = identityMatchRef.current;
        const appliesToMe =
          !data.targetUserId || ids.some((id) => id === data.targetUserId);
        if (!appliesToMe) return;
        setPendingPermissionRequest((prev) =>
          prev?.type === 'video' ? null : prev,
        );
      },
    );

    // Participant requested audio permission (host receives this)
    s.on('participant-requested-audio', (data: { userId: string }) => {
      setPendingParticipantRequests(prev => {
        const filtered = prev.filter(r => !(r.userId === data.userId && r.type === 'audio'));
        return [...filtered, { userId: data.userId, type: 'audio', timestamp: Date.now() }];
      });
    });

    // Participant requested video permission (host receives this)
    s.on('participant-requested-video', (data: { userId: string }) => {
      setPendingParticipantRequests(prev => {
        const filtered = prev.filter(r => !(r.userId === data.userId && r.type === 'video'));
        return [...filtered, { userId: data.userId, type: 'video', timestamp: Date.now() }];
      });
    });

    // Host responded to participant's audio request
    s.on('host-responded-participant-audio', (data: { userId: string; accepted: boolean }) => {
      if (identityMatchRef.current.includes(data.userId)) {
        if (data.accepted) {
          toast.success('🎤 Host approved your request!', { description: 'You can now unmute your microphone' });
        } else {
          toast.error('Host denied your unmute request');
        }
      }
    });

    // Host responded to participant's video request
    s.on('host-responded-participant-video', (data: { userId: string; accepted: boolean }) => {
      if (identityMatchRef.current.includes(data.userId)) {
        if (data.accepted) {
          toast.success('Host approved your request', { description: 'You can now enable your camera' });
        } else {
          toast.error('Host denied your video request');
        }
      }
    });

    // Flash Message Events
    s.on('flash-message', (data: { message: FlashMessage | null }) => {
      setActiveFlashMessage(data.message);
    });

    s.on('flash-questions-updated', (data: { questions: FlashQuestion[] }) => {
      setFlashQuestions(data.questions);
    });

    s.on('moderation-error', (data: { message?: string }) => {
      traceMeet('meet:moderation_error_event', { message: data?.message });
      setError(data?.message || 'Moderation error');
    });

    return () => {
      connectingRef.current = false;
      s.disconnect();
      setSocket(null);
    };
  }, [sessionId, sessionType, token, enabled]);

  const endMeetingForAll = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('end-meeting', { sessionId, sessionType });
  }, [socket, sessionId, sessionType]);

  const lockAudio = useCallback((locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { sessionId, sessionType, permissions: { allowAudio: !locked } });
  }, [socket, sessionId, sessionType]);

  const lockVideo = useCallback((locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { sessionId, sessionType, permissions: { allowVideo: !locked } });
  }, [socket, sessionId, sessionType]);

  const lockChat = useCallback((locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { sessionId, sessionType, permissions: { allowChat: !locked } });
    socket.emit('toggle-chat', { sessionId, sessionType, disabled: locked });
  }, [socket, sessionId, sessionType]);

  const lockUserAudio = useCallback((targetUserId: string, locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { sessionId, sessionType, permissions: { allowAudio: !locked }, targetUserId });
  }, [socket, sessionId, sessionType]);

  const lockUserVideo = useCallback((targetUserId: string, locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { sessionId, sessionType, permissions: { allowVideo: !locked }, targetUserId });
  }, [socket, sessionId, sessionType]);

  const lockUserChatAudience = useCallback((targetUserId: string, audience: 'everyone' | 'host' | 'user', locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    const permissionPatch: Partial<RoomPermissions> = {};
    if (audience === 'everyone') permissionPatch.allowChatEveryone = !locked;
    if (audience === 'host') permissionPatch.allowChatHost = !locked;
    if (audience === 'user') permissionPatch.allowChatUser = !locked;
    socket.emit('update-permissions', { sessionId, sessionType, permissions: permissionPatch, targetUserId });
  }, [socket, sessionId, sessionType]);

  const restrictChatToHostOnly = useCallback((restricted: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { sessionId, sessionType, permissions: { restrictChatToHostOnly: restricted } });
  }, [socket, sessionId, sessionType]);

  const hideParticipantList = useCallback((hidden: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { sessionId, sessionType, permissions: { allowParticipantList: !hidden } });
  }, [socket, sessionId, sessionType]);

  const lockScratchPad = useCallback((locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { sessionId, sessionType, permissions: { allowScratchPad: !locked } });
  }, [socket, sessionId, sessionType]);

  const muteAll = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('moderation-mute', { sessionId, sessionType, action: 'mute' });
  }, [socket, sessionId, sessionType]);

  const unmuteAll = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('moderation-mute', { sessionId, sessionType, action: 'unmute' });
  }, [socket, sessionId, sessionType]);

  const muteParticipant = useCallback((targetUserId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('moderation-mute', { sessionId, sessionType, action: 'mute', targetUserId });
  }, [socket, sessionId, sessionType]);

  const unmuteParticipant = useCallback((targetUserId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('moderation-mute', { sessionId, sessionType, action: 'unmute', targetUserId });
  }, [socket, sessionId, sessionType]);

  const disableVideoAll = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('moderation-video', { sessionId, sessionType, action: 'disable' });
  }, [socket, sessionId, sessionType]);

  const enableVideoAll = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('moderation-video', { sessionId, sessionType, action: 'enable' });
  }, [socket, sessionId, sessionType]);

  const disableVideoParticipant = useCallback((targetUserId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('moderation-video', { sessionId, sessionType, action: 'disable', targetUserId });
  }, [socket, sessionId, sessionType]);

  const enableVideoParticipant = useCallback((targetUserId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('moderation-video', { sessionId, sessionType, action: 'enable', targetUserId });
  }, [socket, sessionId, sessionType]);

  const toggleChatDisabled = useCallback((disabled: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('toggle-chat', { sessionId, sessionType, disabled });
  }, [socket, sessionId, sessionType]);

  const requestAudioOn = useCallback((targetUserId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('request-audio-on', { sessionId, sessionType, targetUserId });
  }, [socket, sessionId, sessionType]);

  const requestVideoOn = useCallback((targetUserId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('request-video-on', { sessionId, sessionType, targetUserId });
  }, [socket, sessionId, sessionType]);

  const respondToAudioRequest = useCallback((accepted: boolean) => {
    const pending = pendingPermissionRequestRef.current;
    if (meetFlowTraceRef.current) {
      joineeFlowLog('meet:emit_respond_audio_request', {
        subsystem: 'meet_moderation',
        accepted,
        hostId: pending?.hostId ? pending.hostId.slice(0, 12) : null,
        sessionId: sessionId ? sessionId.slice(0, 8) : null,
      });
    }
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('respond-audio-request', { sessionId, sessionType, accepted });
    setPendingPermissionRequest(null);
  }, [socket, sessionId, sessionType]);

  const respondToVideoRequest = useCallback((accepted: boolean) => {
    const pending = pendingPermissionRequestRef.current;
    if (meetFlowTraceRef.current) {
      joineeFlowLog('meet:emit_respond_video_request', {
        subsystem: 'meet_moderation',
        accepted,
        hostId: pending?.hostId ? pending.hostId.slice(0, 12) : null,
        sessionId: sessionId ? sessionId.slice(0, 8) : null,
      });
    }
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('respond-video-request', { sessionId, sessionType, accepted });
    setPendingPermissionRequest(null);
  }, [socket, sessionId, sessionType]);

  // Clear moderation notification (after showing toast)
  const clearModerationNotification = useCallback(() => {
    setModerationNotification(null);
  }, []);

  // Dismiss pending permission request (revert host-request unlock so room defaults apply again)
  const dismissPermissionRequest = useCallback(() => {
    const pending = pendingPermissionRequestRef.current;
    if (meetFlowTraceRef.current && pending) {
      joineeFlowLog('meet:permission_request_dismissed', {
        subsystem: 'meet_moderation',
        type: pending.type,
        hostId: pending.hostId ? pending.hostId.slice(0, 12) : null,
        sessionId: sessionId ? sessionId.slice(0, 8) : null,
      });
    }
    if (socket && sessionId && sessionType && pending) {
      if (pending.type === 'audio') {
        socket.emit('respond-audio-request', { sessionId, sessionType, accepted: false });
      } else {
        socket.emit('respond-video-request', { sessionId, sessionType, accepted: false });
      }
    }
    setPendingPermissionRequest(null);
  }, [socket, sessionId, sessionType]);

  const participantRequestAudio = useCallback(() => {
    if (meetFlowTraceRef.current) {
      joineeFlowLog('meet:emit_participant_request_audio', {
        subsystem: 'meet_moderation',
        sessionId: sessionId ? sessionId.slice(0, 8) : null,
        sessionType,
        socketConnected: !!socket?.connected,
      });
    }
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('participant-request-audio', { sessionId, sessionType });
  }, [socket, sessionId, sessionType]);

  const participantRequestVideo = useCallback(() => {
    if (meetFlowTraceRef.current) {
      joineeFlowLog('meet:emit_participant_request_video', {
        subsystem: 'meet_moderation',
        sessionId: sessionId ? sessionId.slice(0, 8) : null,
        sessionType,
        socketConnected: !!socket?.connected,
      });
    }
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('participant-request-video', { sessionId, sessionType });
  }, [socket, sessionId, sessionType]);

  const hostRespondParticipantAudio = useCallback((userId: string, accepted: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('host-respond-participant-audio', { sessionId, sessionType, userId, accepted });
    setPendingParticipantRequests(prev => prev.filter(r => !(r.userId === userId && r.type === 'audio')));
  }, [socket, sessionId, sessionType]);

  const hostRespondParticipantVideo = useCallback((userId: string, accepted: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('host-respond-participant-video', { sessionId, sessionType, userId, accepted });
    setPendingParticipantRequests(prev => prev.filter(r => !(r.userId === userId && r.type === 'video')));
  }, [socket, sessionId, sessionType]);

  const clearParticipantRequest = useCallback((userId: string, type: 'audio' | 'video') => {
    setPendingParticipantRequests(prev => prev.filter(r => !(r.userId === userId && r.type === type)));
  }, []);

  // Flash Message methods
  const flashUploadList = useCallback((questions: Omit<FlashQuestion, 'id'>[]) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash-upload-list', { sessionId, sessionType, questions });
  }, [socket, sessionId, sessionType]);

  const flashUpdateQuestion = useCallback((id: string, updates: Partial<FlashQuestion>) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash-update-question', { sessionId, sessionType, id, updates });
  }, [socket, sessionId, sessionType]);

  const flashReorder = useCallback((ids: string[]) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash-reorder', { sessionId, sessionType, ids });
  }, [socket, sessionId, sessionType]);

  const flashDeleteQuestion = useCallback((id: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash-delete-question', { sessionId, sessionType, id });
  }, [socket, sessionId, sessionType]);

  const flashShowQuestion = useCallback((id: string, duration?: number) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash-show-question', { sessionId, sessionType, id, duration });
  }, [socket, sessionId, sessionType]);

  const flashShowAdHoc = useCallback((content: string, type: 'AD_HOC' | 'MEDIA', duration?: number) => {
    if (!socket || !socket.connected || !sessionId || !sessionType) {
      console.warn('Cannot show flash message: socket not connected');
      return;
    }
    socket.emit('flash-show-adhoc', { sessionId, sessionType, content, type, duration });
  }, [socket, sessionId, sessionType]);

  const flashDismiss = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash-dismiss', { sessionId, sessionType });
  }, [socket, sessionId, sessionType]);

  const flashGetList = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash-get-list', { sessionId, sessionType });
  }, [socket, sessionId, sessionType]);

  const dismissFlashMessage = useCallback(() => {
    setActiveFlashMessage(null);
  }, []);

  return {
    socket,
    isConnected,
    meetingEnded,
    chatDisabled,
    permissions,
    roomSettings,
    isHostFromServer,
    error,
    endMeetingForAll,
    lockAudio,
    lockVideo,
    lockChat,
    lockUserAudio,
    lockUserVideo,
    lockUserChatAudience,
    restrictChatToHostOnly,
    hideParticipantList,
    lockScratchPad,
    muteAll,
    unmuteAll,
    muteParticipant,
    unmuteParticipant,
    disableVideoAll,
    enableVideoAll,
    disableVideoParticipant,
    enableVideoParticipant,
    toggleChatDisabled,
    requestAudioOn,
    requestVideoOn,
    respondToAudioRequest,
    respondToVideoRequest,
    pendingPermissionRequest,
    dismissPermissionRequest,
    moderationNotification,
    clearModerationNotification,
    participantRequestAudio,
    participantRequestVideo,
    hostRespondParticipantAudio,
    hostRespondParticipantVideo,
    pendingParticipantRequests,
    clearParticipantRequest,
    participantChatLocks,
    // Flash message state
    activeFlashMessage,
    flashQuestions,
    // Flash message actions
    flashUploadList,
    flashUpdateQuestion,
    flashReorder,
    flashDeleteQuestion,
    flashShowQuestion,
    flashShowAdHoc,
    flashDismiss,
    flashGetList,
    dismissFlashMessage,
  };
}
