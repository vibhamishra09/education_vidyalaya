import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ExtensionRequest {
  userId: string;
  name: string;
  timestamp: number;
}

interface UseSessionExtensionProps {
  sessionId: string | null;
  sessionType: 'studyRoom' | 'peerSession' | null;
  isHost: boolean;
  token: string | null;
  enabled?: boolean;
}

interface UseSessionExtensionReturn {
  hasExtended: boolean;
  extendedEndTime: number | null;
  extensionMinutes: number | null;
  isConnected: boolean;
  pendingRequest: ExtensionRequest | null;
  requestExtension: (minutes?: number) => void;
  approveExtension: (currentEndTime: number, minutes?: number) => void;
  dismissRequest: () => void;
  error: string | null;
}

export function useSessionExtension({
  sessionId,
  sessionType,
  isHost,
  token,
  enabled = true,
}: UseSessionExtensionProps): UseSessionExtensionReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasExtended, setHasExtended] = useState(false);
  const [extendedEndTime, setExtendedEndTime] = useState<number | null>(null);
  const [extensionMinutes, setExtensionMinutes] = useState<number | null>(null);
  const [pendingRequest, setPendingRequest] = useState<ExtensionRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketConnectingRef = useRef(false);

  // Connect to the extension socket
  useEffect(() => {
    if (!sessionId || !sessionType || !token || !enabled || socketConnectingRef.current) {
      return;
    }

    let socketInstance: Socket | null = null;
    socketConnectingRef.current = true;

    const connectSocket = () => {
      try {
        const url = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
        console.log('🔌 [Extension] Connecting to WebSocket:', url);

        socketInstance = io(url, {
          transports: ['websocket'],
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketInstance.on('connect', () => {
          console.log('✅ [Extension] Socket connected');
          setIsConnected(true);
          setSocket(socketInstance);

          // Join the session room
          socketInstance?.emit('join-session', { sessionId, sessionType });
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('🔌 [Extension] Socket disconnected:', reason);
          setIsConnected(false);
        });

        socketInstance.on('connect_error', (err) => {
          console.error('🚨 [Extension] Connection error:', err.message);
          setError('Failed to connect to extension service');
        });

        // Handle extension state updates
        socketInstance.on('extension-state', (data: { hasExtended: boolean; newEndTime?: number }) => {
          console.log('📡 [Extension] State received:', data);
          setHasExtended(data.hasExtended);
          if (data.newEndTime) {
            setExtendedEndTime(data.newEndTime);
          }
        });

        // Handle extension request (for host)
        socketInstance.on('extension-requested', (data: { requestedBy: { userId: string; name: string }; timestamp: number }) => {
          console.log('📨 [Extension] Request received from:', data.requestedBy.name);
          if (isHost) {
            setPendingRequest({
              userId: data.requestedBy.userId,
              name: data.requestedBy.name,
              timestamp: data.timestamp,
            });
          }
        });

        // Handle session extended event
        socketInstance.on('session-extended', (data: { newEndTime: number; hasExtended: boolean; extensionMinutes: number }) => {
          console.log('✅ [Extension] Session extended! New end time:', new Date(data.newEndTime).toISOString());
          setHasExtended(data.hasExtended);
          setExtendedEndTime(data.newEndTime);
          setExtensionMinutes(data.extensionMinutes);
          setPendingRequest(null);
        });

        // Handle extension request sent confirmation
        socketInstance.on('extension-request-sent', (data: { message: string }) => {
          console.log('📤 [Extension] Request sent:', data.message);
        });

        // Handle errors
        socketInstance.on('extension-error', (data: { message: string }) => {
          console.error('❌ [Extension] Error:', data.message);
          setError(data.message);
        });

      } catch (err) {
        console.error('❌ [Extension] Failed to connect:', err);
        setError('Failed to initialize extension service');
      }
    };

    connectSocket();

    return () => {
      socketConnectingRef.current = false;
      if (socketInstance) {
        socketInstance.disconnect();
        console.log('🛑 [Extension] Socket disconnected');
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [sessionId, sessionType, token, enabled, isHost]);

  // Request extension (for participants)
  const requestExtension = useCallback((minutes: number = 10) => {
    if (!socket || !sessionId || !sessionType) {
      setError('Not connected to extension service');
      return;
    }

    if (hasExtended) {
      setError('Session has already been extended');
      return;
    }

    console.log(`📤 [Extension] Sending request for ${minutes} minutes...`);
    socket.emit('request-extension', { sessionId, sessionType, extensionMinutes: minutes });
  }, [socket, sessionId, sessionType, hasExtended]);

  // Approve extension (for host)
  const approveExtension = useCallback((currentEndTime: number, minutes: number = 10) => {
    if (!socket || !sessionId || !sessionType) {
      setError('Not connected to extension service');
      return;
    }

    if (hasExtended) {
      setError('Session has already been extended');
      return;
    }

    console.log(`✅ [Extension] Approving extension for ${minutes} minutes...`);
    socket.emit('extend-session', {
      sessionId,
      sessionType,
      currentEndTime,
      extensionMinutes: minutes,
    });
  }, [socket, sessionId, sessionType, hasExtended]);

  // Dismiss pending request
  const dismissRequest = useCallback(() => {
    setPendingRequest(null);
  }, []);

  return {
    hasExtended,
    extendedEndTime,
    extensionMinutes,
    isConnected,
    pendingRequest,
    requestExtension,
    approveExtension,
    dismissRequest,
    error,
  };
}
