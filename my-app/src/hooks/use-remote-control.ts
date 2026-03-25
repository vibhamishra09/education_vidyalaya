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

export function useRemoteControl() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  
  // State for the screen sharer (the one being controlled)
  const [controllerId, setControllerId] = useState<string | null>(null);
  const [pendingRequestFrom, setPendingRequestFrom] = useState<{ id: string, name: string } | null>(null);
  
  // State for the controller (the one controlling someone else's screen)
  const [isControlling, setIsControlling] = useState(false);
  const [targetScreenShareId, setTargetScreenShareId] = useState<string | null>(null);
  const [isRequestPending, setIsRequestPending] = useState(false);
  
  // Broadcast channel to sync events across all open Webyalaya tabs/windows
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    broadcastRef.current = new BroadcastChannel('webyalaya-remote-control');
    // Sync base state initially
    broadcastRef.current.postMessage({ isControlled: !!controllerId });
    return () => broadcastRef.current?.close();
  }, [controllerId]);

  // Use refs for state values used in the data handler to avoid stale closures
  const controllerIdRef = useRef(controllerId);
  const isRequestPendingRef = useRef(isRequestPending);
  const isControllingRef = useRef(isControlling);
  const targetScreenShareIdRef = useRef(targetScreenShareId);

  useEffect(() => { controllerIdRef.current = controllerId; }, [controllerId]);
  useEffect(() => { isRequestPendingRef.current = isRequestPending; }, [isRequestPending]);
  useEffect(() => { isControllingRef.current = isControlling; }, [isControlling]);
  useEffect(() => { targetScreenShareIdRef.current = targetScreenShareId; }, [targetScreenShareId]);

  const lastMousePosRef = useRef({ x: 0, y: 0, time: 0 });

  /**
   * Execute synthetic events locally on the sharer's side.
   */
  const handleRemoteInput = useCallback((message: RemoteControlMessage) => {
    if (typeof window === 'undefined') return;

    try {
      const docWidth = window.innerWidth;
      const docHeight = window.innerHeight;
      const x = message.x !== undefined ? Math.round(message.x * docWidth) : 0;
      const y = message.y !== undefined ? Math.round(message.y * docHeight) : 0;
      
      // LOG: Monitor if events are being executed locally
      if (message.type !== 'mousemove' && message.type !== 'wheel') {
        console.log(`[RemoteControl] Executing ${message.type} at (${x}, ${y})`);
      }

      // 1. Broadcast to other tabs FIRST so they can also respond 
      if (broadcastRef.current) {
        broadcastRef.current.postMessage({
          type: message.type,
          x: message.x,
          y: message.y,
          deltaY: message.deltaY,
          button: message.button,
          key: message.key,
          isControlled: !!controllerIdRef.current
        });
      }

      // 2. Execute locally (in the Meeting Room tab itself)
      let elementAtPoint: Element | null = null;
      if (typeof document.elementsFromPoint === 'function') {
        elementAtPoint = document.elementsFromPoint(x, y).find(el => 
          !el.hasAttribute('data-remote-ignore') && 
          !el.closest('[data-remote-ignore="true"]')
        ) || null;
      }
      if (!elementAtPoint) elementAtPoint = document.elementFromPoint(x, y) || document.body;

      let event: Event | null = null;
      switch (message.type) {
        case 'mousemove':
          event = new MouseEvent('mousemove', { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y });
          break;
        case 'mousedown':
          event = new MouseEvent('mousedown', { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, button: message.button || 0 });
          break;
        case 'mouseup':
          event = new MouseEvent('mouseup', { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, button: message.button || 0 });
          break;
        case 'click': {
          const target = elementAtPoint;
          target.dispatchEvent(new MouseEvent('mousedown', { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, button: message.button || 0 }));
          target.dispatchEvent(new MouseEvent('mouseup', { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, button: message.button || 0 }));
          event = new MouseEvent('click', { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, button: message.button || 0 });
          
          if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement || target instanceof HTMLInputElement) {
            try { target.focus(); } catch(e) {}
            setTimeout(() => target.click(), 0);
          }
          break;
        }
        case 'keydown':
          if (message.key) event = new KeyboardEvent('keydown', { key: message.key, bubbles: true, cancelable: true });
          break;
        case 'keyup':
          if (message.key) event = new KeyboardEvent('keyup', { key: message.key, bubbles: true, cancelable: true });
          break;
        case 'wheel':
          event = new WheelEvent('wheel', { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y, deltaY: message.deltaY || 0 });
          let scrollTarget: HTMLElement | null = elementAtPoint as HTMLElement;
          while (scrollTarget && scrollTarget !== document.body) {
            const style = window.getComputedStyle(scrollTarget);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
               scrollTarget.scrollTop += message.deltaY || 0;
               break;
            }
            scrollTarget = scrollTarget.parentElement;
          }
          if (scrollTarget === document.body) window.scrollBy(0, message.deltaY || 0);
          break;
      }

      if (event) {
        elementAtPoint.dispatchEvent(event);
        if (message.x !== undefined && message.y !== undefined) {
          window.dispatchEvent(new CustomEvent('remote-cursor-move', { 
            detail: { x: message.x, y: message.y, type: message.type } 
          }));
        }
      }
    } catch (e) {
      console.warn('[RemoteControl] Error executing input:', e);
    }
  }, []);

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

        if (message.targetId && message.targetId !== localParticipant.identity) return;

        switch (message.type) {
          case 'request':
            if (localParticipant.isScreenShareEnabled) {
              setPendingRequestFrom({ id: participant.identity, name: participant.name || 'A participant' });
            }
            break;

          case 'granted':
            if (isRequestPendingRef.current && message.sourceId === targetScreenShareIdRef.current) {
              setIsRequestPending(false);
              setIsControlling(true);
            }
            break;

          case 'denied':
            if (isRequestPendingRef.current && message.sourceId === targetScreenShareIdRef.current) {
              setIsRequestPending(false);
              setTargetScreenShareId(null);
            }
            break;

          case 'stop':
            if (controllerIdRef.current === participant.identity) setControllerId(null);
            break;

          case 'revoke':
            if (isControllingRef.current && message.sourceId === targetScreenShareIdRef.current) {
              setIsControlling(false);
              setTargetScreenShareId(null);
            }
            break;

          case 'mousemove':
          case 'click':
          case 'mousedown':
          case 'mouseup':
          case 'keydown':
          case 'keyup':
          case 'wheel':
            if (controllerIdRef.current === participant.identity) {
              handleRemoteInput(message);
            }
            break;
        }
      } catch (e) {
        console.error('[RemoteControl] Parse error:', e);
      }
    };

    room.on('dataReceived', handleDataMessage);
    return () => { room.off('dataReceived', handleDataMessage); };
  }, [room, localParticipant, handleRemoteInput]);

  // Helper to publish data
  const sendMessage = useCallback((message: RemoteControlMessage) => {
    if (!room || !localParticipant) return;
    try {
      const fullMessage = { ...message, sourceId: localParticipant.identity };
      const data = new TextEncoder().encode(JSON.stringify(fullMessage));
      const reliable = ['request', 'granted', 'denied', 'revoke', 'stop', 'click'].includes(message.type);
      const options: { reliable: boolean; topic: string; destinationIdentities?: string[] } = { reliable, topic: 'remote-control' };
      if (message.targetId) options.destinationIdentities = [message.targetId];
      localParticipant.publishData(data, options);
    } catch (e) {
      console.error('[RemoteControl] Send error:', e);
    }
  }, [room, localParticipant]);

  // Public API
  const requestControl = useCallback((targetIdentity: string) => {
    setIsRequestPending(true);
    setTargetScreenShareId(targetIdentity);
    sendMessage({ type: 'request', targetId: targetIdentity });
  }, [sendMessage]);

  const stopControl = useCallback(() => {
    if (targetScreenShareId) sendMessage({ type: 'stop', targetId: targetScreenShareId });
    setIsControlling(false);
    setIsRequestPending(false);
    setTargetScreenShareId(null);
  }, [sendMessage, targetScreenShareId]);

  const sendInputEvent = useCallback((type: RemoteControlEventType, data: Partial<RemoteControlMessage>) => {
    if (!isControlling || !targetScreenShareId) return;
    if (type === 'mousemove') {
      const now = Date.now();
      if (now - lastMousePosRef.current.time < 16) return;
      lastMousePosRef.current = { x: data.x || 0, y: data.y || 0, time: now };
    }
    sendMessage({ type, targetId: targetScreenShareId, ...data });
  }, [isControlling, targetScreenShareId, sendMessage]);

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

  useEffect(() => {
    if (!localParticipant.isScreenShareEnabled && controllerId) revokeControl();
    if (!localParticipant.isScreenShareEnabled && pendingRequestFrom) denyControl();
  }, [localParticipant.isScreenShareEnabled, controllerId, pendingRequestFrom, revokeControl, denyControl]);

  useEffect(() => {
    return () => {
      if (isControlling) stopControl();
      if (controllerId) revokeControl();
    };
  }, [isControlling, controllerId, stopControl, revokeControl]);

  return { isControlling, isRequestPending, targetScreenShareId, requestControl, stopControl, sendInputEvent, controllerId, pendingRequestFrom, grantControl, denyControl, revokeControl };
}
