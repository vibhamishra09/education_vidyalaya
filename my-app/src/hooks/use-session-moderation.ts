import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

// Flash message types
export interface FlashQuestion {
  id: string;
  text: string;
  duration?: number;      // seconds (0 = manual dismiss)
  position?: 'top' | 'center' | 'bottom';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  bgColor?: string;
}

export interface ActiveFlashMessage extends FlashQuestion {
  hostId: string;
}

// Room permissions interface for the "Lock" system
export interface RoomPermissions {
  allowAudio: boolean;
  allowVideo: boolean;
  allowChat: boolean;
  allowChatEveryone: boolean;
  allowChatHost: boolean;
  allowChatUser: boolean;
  allowParticipantList: boolean;
}

// Room settings stored in Redis (host view)
export interface RoomSettings {
  lockAudio: boolean;
  lockVideo: boolean;
  chatDisabled: boolean;
  hideParticipantList: boolean;
  chatRestrictToHostOnly: boolean;
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

export function useSessionModeration({ sessionId, sessionType, isHost: _isHost, token, userId, enabled = true } : { sessionId: string | null; sessionType: 'studyRoom' | 'peerSession' | null; isHost: boolean; token: string | null; userId?: string | null; enabled?: boolean }) {
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
  });
  
  // Room settings from Redis (for host UI)
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    lockAudio: false,
    lockVideo: false,
    chatDisabled: false,
    hideParticipantList: false,
    chatRestrictToHostOnly: false,
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

  // Flash message state
  const [activeFlashMessage, setActiveFlashMessage] = useState<ActiveFlashMessage | null>(null);
  // Host's own question list (only populated for hosts)
  const [flashQuestions, setFlashQuestions] = useState<FlashQuestion[]>([]);

  const connectingRef = useRef(false);
  const userIdRef = useRef(userId);
  
  // Keep the ref up to date
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!sessionId || !sessionType || !token || !enabled || connectingRef.current) return;

    connectingRef.current = true;
    const url = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const s = io(url, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
    });

    s.on('connect', () => {
      setIsConnected(true);
      setSocket(s);
      s.emit('join-session', { sessionId, sessionType });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // New sync-permissions event from Redis-backed backend
    s.on('sync-permissions', (data: { 
      sessionId: string; 
      permissions: RoomPermissions;
      roomSettings: RoomSettings;
      isHost: boolean;
    }) => {
      console.log('[moderation] sync-permissions:', data);
      if (data.permissions) {
        setPermissions(data.permissions);
        const newChatDisabled = !data.permissions.allowChat;
        console.log('[moderation] sync-permissions: setting chatDisabled to', newChatDisabled);
        setChatDisabled(newChatDisabled);
      }
      if (data.roomSettings) {
        setRoomSettings(data.roomSettings);
      }
      setIsHostFromServer(data.isHost);
    });

    // Room settings updated (for host UI)
    s.on('room-settings-updated', (data: { settings: RoomSettings }) => {
      console.log('[moderation] room-settings-updated:', data);
      if (data.settings) {
        setRoomSettings(data.settings);
        console.log('[moderation] room-settings-updated: setting chatDisabled to', data.settings.chatDisabled);
        setChatDisabled(data.settings.chatDisabled);
      }
    });

    // User-specific permissions updated
    s.on('user-permissions-updated', (data: { targetUserId: string; permissions: RoomPermissions }) => {
      console.log('[moderation] user-permissions-updated:', data, 'my userId:', userIdRef.current);
      if (data.targetUserId === userIdRef.current && data.permissions) {
        setPermissions(data.permissions);
        setChatDisabled(!data.permissions.allowChat);
      }
    });

    s.on('moderation-joined', (data: { sessionId: string; permissions?: RoomPermissions }) => {
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
      console.log('[moderation] chat-toggled', data);
      console.log('[moderation] chat-toggled: setting chatDisabled to', !!data.disabled);
      setChatDisabled(!!data.disabled);
    });

    // Handle permissions updates (Lock system)
    s.on('permissions-updated', (data: { targetUserId?: string; permissions: Partial<RoomPermissions> }) => {
      console.log('[moderation] permissions-updated', data);
      // If it's a room-wide update, apply to everyone
      if (!data.targetUserId) {
        setPermissions(prev => ({
          ...prev,
          ...data.permissions,
        }));
        // Sync chatDisabled with permissions
        if (data.permissions.allowChat !== undefined) {
          const newChatDisabled = !data.permissions.allowChat;
          console.log('[moderation] permissions-updated (room-wide): setting chatDisabled to', newChatDisabled);
          setChatDisabled(newChatDisabled);
        }
      } else if (data.targetUserId === userIdRef.current) {
        // If it's targeted at this specific user, apply the override
        setPermissions(prev => ({
          ...prev,
          ...data.permissions,
        }));
        // Sync chatDisabled with permissions
        if (data.permissions.allowChat !== undefined) {
          const newChatDisabled = !data.permissions.allowChat;
          console.log('[moderation] permissions-updated (user-specific): setting chatDisabled to', newChatDisabled);
          setChatDisabled(newChatDisabled);
        }
      }
      if (data.targetUserId && data.permissions) {
        const targetUserId = data.targetUserId;
        setParticipantChatLocks((prev) => {
          const existing = prev[targetUserId] || {
            everyone: false,
            host: false,
            user: false,
          };
          const next = {
            everyone:
              data.permissions.allowChatEveryone !== undefined
                ? !data.permissions.allowChatEveryone
                : existing.everyone,
            host:
              data.permissions.allowChatHost !== undefined
                ? !data.permissions.allowChatHost
                : existing.host,
            user:
              data.permissions.allowChatUser !== undefined
                ? !data.permissions.allowChatUser
                : existing.user,
          };
          return { ...prev, [targetUserId]: next };
        });
      }
    });

    // Host requested participant to turn on audio
    s.on('host-requested-audio', (data: { targetUserId: string; hostId: string }) => {
      console.log('[moderation] host-requested-audio', data);
      if (data.targetUserId === userIdRef.current) {
        setPendingPermissionRequest({ type: 'audio', hostId: data.hostId });
      }
    });

    // Host requested participant to turn on video
    s.on('host-requested-video', (data: { targetUserId: string; hostId: string }) => {
      console.log('[moderation] host-requested-video', data);
      if (data.targetUserId === userIdRef.current) {
        setPendingPermissionRequest({ type: 'video', hostId: data.hostId });
      }
    });

    // User response to audio request (for host notification)
    s.on('audio-request-response', (data: { userId: string; accepted: boolean }) => {
      console.log('[moderation] audio-request-response', data);
      // Host can use this to show a notification about the response
    });

    // User response to video request (for host notification)
    s.on('video-request-response', (data: { userId: string; accepted: boolean }) => {
      console.log('[moderation] video-request-response', data);
      // Host can use this to show a notification about the response
    });

    // Confirmation that host's request was sent
    s.on('request-sent-confirmation', (data: { type: 'audio' | 'video'; targetUserId: string }) => {
      console.log('[moderation] request-sent-confirmation', data);
      // Host receives this after successfully sending a request
    });

    // Participant requested audio permission (host receives this)
    s.on('participant-requested-audio', (data: { userId: string; requestType: 'audio' }) => {
      console.log('[moderation] participant-requested-audio', data);
      // Add to pending requests (avoid duplicates)
      setPendingParticipantRequests(prev => {
        // Remove existing request from same user for same type
        const filtered = prev.filter(r => !(r.userId === data.userId && r.type === 'audio'));
        return [...filtered, { userId: data.userId, type: 'audio', timestamp: Date.now() }];
      });
    });

    // Participant requested video permission (host receives this)
    s.on('participant-requested-video', (data: { userId: string; requestType: 'video' }) => {
      console.log('[moderation] participant-requested-video', data);
      // Add to pending requests (avoid duplicates)
      setPendingParticipantRequests(prev => {
        const filtered = prev.filter(r => !(r.userId === data.userId && r.type === 'video'));
        return [...filtered, { userId: data.userId, type: 'video', timestamp: Date.now() }];
      });
    });

    // Host responded to participant's audio request (participant receives this)
    s.on('host-responded-participant-audio', (data: { userId: string; accepted: boolean }) => {
      console.log('[moderation] host-responded-participant-audio received:', data);
      console.log('[moderation] comparing data.userId:', data.userId, 'with my userIdRef.current:', userIdRef.current);
      console.log('[moderation] match:', data.userId === userIdRef.current);
      
      // Show toast for the participant whose request was processed
      if (data.userId === userIdRef.current) {
        console.log('[moderation] MATCH! Showing toast...');
        if (data.accepted) {
          toast.success('🎤 Host approved your request!', {
            description: 'You can now unmute your microphone',
            duration: 5000,
          });
        } else {
          toast.error('Host denied your unmute request');
        }
      }
    });

    // Host responded to participant's video request (participant receives this)
    s.on('host-responded-participant-video', (data: { userId: string; accepted: boolean }) => {
      console.log('[moderation] host-responded-participant-video', data, 'my userId:', userIdRef.current);
      if (data.userId === userIdRef.current) {
        // This participant's request was processed
        if (data.accepted) {
          toast.success('Host approved your request', {
            description: 'You can now enable your camera',
            duration: 4000,
          });
        } else {
          toast.error('Host denied your video request');
        }
      }
    });

    s.on('moderation-error', (data: { message?: string }) => {
      setError(data?.message || 'Moderation error');
    });

    // Flash message events
    s.on('flash:message', (data: ActiveFlashMessage) => {
      console.log('[moderation] flash:message received', data);
      setActiveFlashMessage(data);
      // Auto-dismiss after duration if specified
      if (data.duration && data.duration > 0) {
        setTimeout(() => {
          setActiveFlashMessage((current) => (current?.id === data.id ? null : current));
        }, data.duration * 1000);
      }
    });

    s.on('flash:dismissed', () => {
      console.log('[moderation] flash:dismissed');
      setActiveFlashMessage(null);
    });

    // Host receives their question list (after upload, edit, reorder, or get-list)
    s.on('flash:list-updated', (data: { hostId: string; questions: FlashQuestion[] }) => {
      console.log('[moderation] flash:list-updated', data.questions.length, 'questions');
      setFlashQuestions(data.questions);
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

  // Lock/unlock audio for all (persistent permission)
  const lockAudio = useCallback((locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { 
      sessionId, 
      sessionType, 
      permissions: { allowAudio: !locked } 
    });
  }, [socket, sessionId, sessionType]);

  // Lock/unlock video for all (persistent permission)
  const lockVideo = useCallback((locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { 
      sessionId, 
      sessionType, 
      permissions: { allowVideo: !locked } 
    });
  }, [socket, sessionId, sessionType]);

  // Lock/unlock chat for all (persistent permission)
  const lockChat = useCallback((locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { 
      sessionId, 
      sessionType, 
      permissions: { allowChat: !locked } 
    });
    // Also emit the legacy chat-toggled for backwards compatibility
    socket.emit('toggle-chat', { sessionId, sessionType, disabled: locked });
  }, [socket, sessionId, sessionType]);

  // Lock permissions for a specific user
  const lockUserAudio = useCallback((targetUserId: string, locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { 
      sessionId, 
      sessionType, 
      permissions: { allowAudio: !locked },
      targetUserId,
    });
  }, [socket, sessionId, sessionType]);

  const lockUserVideo = useCallback((targetUserId: string, locked: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', { 
      sessionId, 
      sessionType, 
      permissions: { allowVideo: !locked },
      targetUserId,
    });
  }, [socket, sessionId, sessionType]);

  const lockUserChatAudience = useCallback(
    (targetUserId: string, audience: 'everyone' | 'host' | 'user', locked: boolean) => {
      if (!socket || !sessionId || !sessionType) return;
      const permissionPatch: Partial<RoomPermissions> = {};
      if (audience === 'everyone') permissionPatch.allowChatEveryone = !locked;
      if (audience === 'host') permissionPatch.allowChatHost = !locked;
      if (audience === 'user') permissionPatch.allowChatUser = !locked;

      socket.emit('update-permissions', {
        sessionId,
        sessionType,
        permissions: permissionPatch,
        targetUserId,
      });

      setParticipantChatLocks((prev) => {
        const existing = prev[targetUserId] || {
          everyone: false,
          host: false,
          user: false,
        };
        return {
          ...prev,
          [targetUserId]: {
            ...existing,
            [audience]: locked,
          },
        };
      });
    },
    [socket, sessionId, sessionType],
  );

  // Restrict all users to send messages to host only
  const restrictChatToHostOnly = useCallback((restricted: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('update-permissions', {
      sessionId,
      sessionType,
      permissions: { restrictChatToHostOnly: restricted },
    });
  }, [socket, sessionId, sessionType]);

  const hideParticipantList = useCallback(
    (hidden: boolean) => {
      if (!socket || !sessionId || !sessionType) return;
      socket.emit('update-permissions', {
        sessionId,
        sessionType,
        permissions: { allowParticipantList: !hidden },
      });
    },
    [socket, sessionId, sessionType],
  );

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

  // Host requests participant to turn on audio (privacy: cannot force)
  const requestAudioOn = useCallback((targetUserId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('request-audio-on', { sessionId, sessionType, targetUserId });
  }, [socket, sessionId, sessionType]);

  // Host requests participant to turn on video (privacy: cannot force)
  const requestVideoOn = useCallback((targetUserId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('request-video-on', { sessionId, sessionType, targetUserId });
  }, [socket, sessionId, sessionType]);

  // Participant responds to audio request (accept/deny)
  const respondToAudioRequest = useCallback((accepted: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('respond-audio-request', { sessionId, sessionType, accepted });
    setPendingPermissionRequest(null);
  }, [socket, sessionId, sessionType]);

  // Participant responds to video request (accept/deny)
  const respondToVideoRequest = useCallback((accepted: boolean) => {
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
    if (socket && sessionId && sessionType && pending) {
      if (pending.type === 'audio') {
        socket.emit('respond-audio-request', { sessionId, sessionType, accepted: false });
      } else {
        socket.emit('respond-video-request', { sessionId, sessionType, accepted: false });
      }
    }
    setPendingPermissionRequest(null);
  }, [socket, sessionId, sessionType]);

  // Participant requests permission to unmute audio
  const participantRequestAudio = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('participant-request-audio', { sessionId, sessionType });
  }, [socket, sessionId, sessionType]);

  // Participant requests permission to enable video
  const participantRequestVideo = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('participant-request-video', { sessionId, sessionType });
  }, [socket, sessionId, sessionType]);

  // Host responds to participant's audio request
  const hostRespondParticipantAudio = useCallback((userId: string, accepted: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('host-respond-participant-audio', { sessionId, sessionType, userId, accepted });
    // Remove from pending requests
    setPendingParticipantRequests(prev => prev.filter(r => !(r.userId === userId && r.type === 'audio')));
  }, [socket, sessionId, sessionType]);

  // Host responds to participant's video request
  const hostRespondParticipantVideo = useCallback((userId: string, accepted: boolean) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('host-respond-participant-video', { sessionId, sessionType, userId, accepted });
    // Remove from pending requests
    setPendingParticipantRequests(prev => prev.filter(r => !(r.userId === userId && r.type === 'video')));
  }, [socket, sessionId, sessionType]);

  // Clear a specific pending participant request
  const clearParticipantRequest = useCallback((userId: string, type: 'audio' | 'video') => {
    setPendingParticipantRequests(prev => prev.filter(r => !(r.userId === userId && r.type === type)));
  }, []);

  // ─── Flash Message Actions ────────────────────────────────────────────────

  /** Host uploads / replaces their full question list */
  const flashUploadList = useCallback((questions: FlashQuestion[]) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash:upload-list', { sessionId, sessionType, questions });
  }, [socket, sessionId, sessionType]);

  /** Host updates a single question's text or metadata */
  const flashUpdateQuestion = useCallback((questionId: string, updates: Partial<Omit<FlashQuestion, 'id'>>) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash:update-question', { sessionId, sessionType, questionId, updates });
  }, [socket, sessionId, sessionType]);

  /** Host reorders the list by providing new ordered IDs */
  const flashReorder = useCallback((orderedIds: string[]) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash:reorder', { sessionId, sessionType, orderedIds });
  }, [socket, sessionId, sessionType]);

  /** Host deletes a question */
  const flashDeleteQuestion = useCallback((questionId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash:delete-question', { sessionId, sessionType, questionId });
  }, [socket, sessionId, sessionType]);

  /** Host flashes a specific question from their list to all participants */
  const flashShowQuestion = useCallback((questionId: string) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash:show', { sessionId, sessionType, questionId });
  }, [socket, sessionId, sessionType]);

  /** Host flashes an ad-hoc message to all participants */
  const flashShowAdHoc = useCallback((text: string, meta?: Omit<FlashQuestion, 'id' | 'text'>) => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash:show', { sessionId, sessionType, text, ...meta });
  }, [socket, sessionId, sessionType]);

  /** Host dismisses the current flash message for everyone */
  const flashDismiss = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash:dismiss', { sessionId, sessionType });
  }, [socket, sessionId, sessionType]);

  /** Host refreshes their question list from the server */
  const flashGetList = useCallback(() => {
    if (!socket || !sessionId || !sessionType) return;
    socket.emit('flash:get-list', { sessionId, sessionType });
  }, [socket, sessionId, sessionType]);

  /** Participant locally dismisses the flash overlay (does NOT dismiss for others) */
  const dismissFlashMessage = useCallback(() => {
    setActiveFlashMessage(null);
  }, []);

  return {
    socket,
    isConnected,
    meetingEnded,
    chatDisabled,
    permissions, // Computed permissions for this user
    roomSettings, // Room settings from Redis (for host UI)
    isHostFromServer, // Host status from server
    error,
    endMeetingForAll,
    // Lock functions (persistent permissions)
    lockAudio,
    lockVideo,
    lockChat,
    lockUserAudio,
    lockUserVideo,
    lockUserChatAudience,
    restrictChatToHostOnly,
    hideParticipantList,
    // Immediate actions (mute/unmute)
    muteAll,
    unmuteAll,
    muteParticipant,
    unmuteParticipant,
    disableVideoAll,
    enableVideoAll,
    disableVideoParticipant,
    enableVideoParticipant,
    toggleChatDisabled,
    // Request functions (host asks participant to enable)
    requestAudioOn,
    requestVideoOn,
    // Response functions (participant accepts/denies)
    respondToAudioRequest,
    respondToVideoRequest,
    // Pending request state (for participant modal)
    pendingPermissionRequest,
    dismissPermissionRequest,
    // Moderation notification (for participant toast)
    moderationNotification,
    clearModerationNotification,
    // Participant request functions (participant asks host for permission)
    participantRequestAudio,
    participantRequestVideo,
    // Host response functions (host approves/denies participant request)
    hostRespondParticipantAudio,
    hostRespondParticipantVideo,
    // Pending participant requests (for host to see in participant list)
    pendingParticipantRequests,
    clearParticipantRequest,
    participantChatLocks,
    // Flash message state
    activeFlashMessage,
    flashQuestions,
    // Flash message actions (host only)
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
