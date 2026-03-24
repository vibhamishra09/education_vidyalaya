import { useState, useCallback, useEffect, useRef } from 'react';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import type { Participant } from 'livekit-client';

export type RemoteControlEventType = 
  | 'request'
  | 'granted'
  | 'denied'
  | 'revoke'
  | 'stop'
  | 'mousemove'
  | 'click'
  | 'mousedown'
  | 'mouseup'
  | 'keydown'
  | 'keyup'
  | 'wheel';

export interface RemoteControlMessage {
  type: RemoteControlEventType;
  targetId?: string; // Who the message is intended for
  sourceId?: string; // Who sent the message
  x?: number; // Normalized X coordinate (0.0 to 1.0)
  y?: number; // Normalized Y coordinate (0.0 to 1.0)
  key?: string; // For keyboard events
  deltaY?: number; // For scroll events
  button?: number; // For mouse clicks (0=left, 1=middle, 2=right)
}

interface UseRemoteControlProps {
  currentUserId?: string; // The ID of the current user
}

export function useRemoteControl({ currentUserId }: UseRemoteControlProps = {}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  
  // State for the screen sharer (the one being controlled)
  const [controllerId, setControllerId] = useState<string | null>(null);
  const [pendingRequestFrom, setPendingRequestFrom] = useState<{ id: string, name: string } | null>(null);
  
  // State for the controller (the one controlling someone else's screen)
  const [isControlling, setIsControlling] = useState(false);
  const [targetScreenShareId, setTargetScreenShareId] = useState<string | null>(null);
  const [isRequestPending, setIsRequestPending] = useState(false);
  
  // Ref to track last mouse position to throttle updates
  const lastMousePosRef = useRef({ x: 0, y: 0, time: 0 });

  // Handle incoming data channel messages
  useEffect(() => {
    if (!room) return;

    const handleDataMessage = (
      payload: Uint8Array,
      participant?: Participant | undefined,
      kind?: import('livekit-client').DataPacket_Kind,
      topic?: string
    ) => {
      if (topic !== 'remote-control') return;
      if (!participant) return;

      try {
        const text = new TextDecoder().decode(payload);
        const message = JSON.parse(text) as RemoteControlMessage;

        // Ensure we are the intended recipient if a target was specified
        if (message.targetId && message.targetId !== localParticipant.identity) {
          return;
        }

        // Handle different message types
        switch (message.type) {
          // Received by the Screen Sharer
          case 'request':
            if (localParticipant.isScreenShareEnabled) {
              setPendingRequestFrom({
                id: participant.identity,
                name: participant.name || 'A participant'
              });
            }
            break;

          // Received by the Controller
          case 'granted':
            if (isRequestPending && message.sourceId === targetScreenShareId) {
              setIsRequestPending(false);
              setIsControlling(true);
            }
            break;

          // Received by the Controller
          case 'denied':
            if (isRequestPending && message.sourceId === targetScreenShareId) {
              setIsRequestPending(false);
              setTargetScreenShareId(null);
            }
            break;

          // Received by the Screen Sharer (controller stopped)
          case 'stop':
            if (controllerId === participant.identity) {
              setControllerId(null);
            }
            break;

          // Received by the Controller (sharer revoked)
          case 'revoke':
            if (isControlling && message.sourceId === targetScreenShareId) {
              setIsControlling(false);
              setTargetScreenShareId(null);
            }
            break;

          // Input Events - Received by the Screen Sharer
          case 'mousemove':
          case 'click':
          case 'mousedown':
          case 'mouseup':
          case 'keydown':
          case 'keyup':
          case 'wheel':
            if (controllerId === participant.identity) {
              handleRemoteInput(message);
            }
            break;
        }
      } catch (e) {
        console.error('Failed to parse remote control message', e);
      }
    };

    room.on('dataReceived', handleDataMessage);
    
    return () => {
      room.off('dataReceived', handleDataMessage);
    };
  }, [room, localParticipant, isRequestPending, targetScreenShareId, isControlling, controllerId]);

  // Helper to send messages over data channel
  const sendMessage = useCallback((message: RemoteControlMessage) => {
    if (!room || !localParticipant) return;
    
    try {
      // Add source ID to all messages
      const fullMessage = { ...message, sourceId: localParticipant.identity };
      const data = new TextEncoder().encode(JSON.stringify(fullMessage));
      
      // Use DataPacket_Kind.RELIABLE for important state changes, LOSSY for high-frequency input
      const reliable = ['request', 'granted', 'denied', 'revoke', 'stop', 'click'].includes(message.type);
      
      const options = { reliable, topic: 'remote-control' } as any; // Using any to bypass strict type checking for livekit-client versions
      
      // If we have a specific target, try to send only to them for efficiency
      if (message.targetId) {
        const targetParticipant = Array.from(room.remoteParticipants.values())
          .find(p => p.identity === message.targetId);
        
        if (targetParticipant) {
          options.destinationIdentities = [message.targetId];
        }
      }
      
      localParticipant.publishData(data, options);
    } catch (e) {
      console.error('Failed to send remote control message', e);
    }
  }, [room, localParticipant]);

  // Execute synthetic events when receiving remote input
  const handleRemoteInput = useCallback((message: RemoteControlMessage) => {
    // Only process if we actually have the window object
    if (typeof window === 'undefined') return;

    try {
      // Convert normalized coordinates back to actual screen coordinates
      // Since video can be responsive/scaled, we dispatch events on the document
      // and let the browser's hit testing handle the rest.
      // Note: This is an approximation. For true accuracy in a web app, 
      // the receiving end needs to map coordinates to the corresponding DOM element.
      
      const x = message.x !== undefined ? Math.round(message.x * window.innerWidth) : 0;
      const y = message.y !== undefined ? Math.round(message.y * window.innerHeight) : 0;
      
      let event: Event | null = null;
      const elementAtPoint = document.elementFromPoint(x, y) || document.body;

      // Note: Browsers block programmatic interaction with cross-origin content (iframes)
      // and certain native controls. Synthetic events also cannot trigger default actions
      // like following a link, but they will trigger attached React/JS event listeners.

      switch (message.type) {
        case 'mousemove':
          event = new MouseEvent('mousemove', {
            view: window, bubbles: true, cancelable: true, clientX: x, clientY: y,
          });
          break;
        case 'mousedown':
          event = new MouseEvent('mousedown', {
            view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, button: message.button || 0,
          });
          break;
        case 'mouseup':
          event = new MouseEvent('mouseup', {
            view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, button: message.button || 0,
          });
          break;
        case 'click':
          event = new MouseEvent('click', {
            view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, button: message.button || 0,
          });
          // For synthetic clicks to actually do something, we often need to click the element directly
          if (elementAtPoint instanceof HTMLElement) {
            elementAtPoint.click();
          }
          break;
        case 'keydown':
          if (message.key) {
            event = new KeyboardEvent('keydown', {
              key: message.key, bubbles: true, cancelable: true,
            });
            // Try to set value if focus is in an input
            const activeEl = document.activeElement;
            if (activeEl && (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement)) {
              if (message.key.length === 1 && !message.key.match(/^[A-Z]$/)) {
                // Very basic fallback for standard characters
                // Better handled via React state updates if possible
              }
            }
          }
          break;
        case 'keyup':
          if (message.key) {
            event = new KeyboardEvent('keyup', {
              key: message.key, bubbles: true, cancelable: true,
            });
          }
          break;
        case 'wheel':
          event = new WheelEvent('wheel', {
             view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, deltaY: message.deltaY || 0,
          });
          // Also manually scroll the nearest scrollable parent
          let scrollTarget: HTMLElement | null = elementAtPoint as HTMLElement;
          while (scrollTarget && scrollTarget !== document.body) {
            const style = window.getComputedStyle(scrollTarget);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
               scrollTarget.scrollTop += message.deltaY || 0;
               break;
            }
            scrollTarget = scrollTarget.parentElement;
          }
          if (scrollTarget === document.body) {
             window.scrollBy(0, message.deltaY || 0);
          }
          break;
      }

      if (event) {
        elementAtPoint.dispatchEvent(event);
        
        // Visual feedback cursor update handled by component
        if (message.x !== undefined && message.y !== undefined) {
          window.dispatchEvent(new CustomEvent('remote-cursor-move', { 
            detail: { x: message.x, y: message.y } 
          }));
        }
      }
    } catch (e) {
      console.warn('Error handling remote input:', e);
    }
  }, []);

  // --- API for the Controller ---

  const requestControl = useCallback((targetIdentity: string) => {
    setIsRequestPending(true);
    setTargetScreenShareId(targetIdentity);
    sendMessage({ type: 'request', targetId: targetIdentity });
  }, [sendMessage]);

  const stopControl = useCallback(() => {
    if (targetScreenShareId) {
      sendMessage({ type: 'stop', targetId: targetScreenShareId });
    }
    setIsControlling(false);
    setIsRequestPending(false);
    setTargetScreenShareId(null);
  }, [sendMessage, targetScreenShareId]);

  const sendInputEvent = useCallback((type: RemoteControlEventType, data: Partial<RemoteControlMessage>) => {
    if (!isControlling || !targetScreenShareId) return;
    
    // Throttle mousemove events
    if (type === 'mousemove') {
      const now = Date.now();
      if (now - lastMousePosRef.current.time < 30) { // ~30fps max
        return;
      }
      lastMousePosRef.current = { x: data.x || 0, y: data.y || 0, time: now };
    }

    sendMessage({
      type,
      targetId: targetScreenShareId,
      ...data
    });
  }, [isControlling, targetScreenShareId, sendMessage]);

  // --- API for the Screen Sharer ---

  const grantControl = useCallback(() => {
    if (pendingRequestFrom) {
      setControllerId(pendingRequestFrom.id);
      sendMessage({ type: 'granted', targetId: pendingRequestFrom.id });
      setPendingRequestFrom(null);
    }
  }, [pendingRequestFrom, sendMessage]);

  const denyControl = useCallback(() => {
    if (pendingRequestFrom) {
      sendMessage({ type: 'denied', targetId: pendingRequestFrom.id });
      setPendingRequestFrom(null);
    }
  }, [pendingRequestFrom, sendMessage]);

  const revokeControl = useCallback(() => {
    if (controllerId) {
      sendMessage({ type: 'revoke', targetId: controllerId });
      setControllerId(null);
    }
  }, [controllerId, sendMessage]);

  // Clean up if screen share stops
  useEffect(() => {
    if (!localParticipant.isScreenShareEnabled && controllerId) {
      revokeControl();
    }
    if (!localParticipant.isScreenShareEnabled && pendingRequestFrom) {
      denyControl();
    }
  }, [localParticipant.isScreenShareEnabled, controllerId, pendingRequestFrom, revokeControl, denyControl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isControlling) {
        stopControl();
      }
      if (controllerId) {
        revokeControl();
      }
    };
  }, [isControlling, controllerId, stopControl, revokeControl]);

  return {
    // Controller state & methods
    isControlling,
    isRequestPending,
    targetScreenShareId,
    requestControl,
    stopControl,
    sendInputEvent,
    
    // Sharer state & methods
    controllerId,
    pendingRequestFrom,
    grantControl,
    denyControl,
    revokeControl
  };
}
