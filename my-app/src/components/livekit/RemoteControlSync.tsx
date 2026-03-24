'use client';

import { useEffect, useState, useRef } from 'react';
import { MousePointer2 } from 'lucide-react';
import { RemoteControlMessage } from '@/hooks/use-remote-control';

/**
 * RemoteControlSync handles cross-tab remote control input.
 * It listens for broadcasted events from the Meeting Room and executes them in the current tab.
 */
export function RemoteControlSync() {
  const [isBeingControlled, setIsBeingControlled] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = new BroadcastChannel('webyalaya-remote-control');

    const handleMessage = (event: MessageEvent<RemoteControlMessage & { isControlled?: boolean }>) => {
      const { type, x, y, deltaY, button, key, isControlled } = event.data;

      // Sync the "Controlled" status banner state
      if (isControlled !== undefined) {
          setIsBeingControlled(isControlled);
      }

      // If no coordinate data, it's just a status sync
      if (x === undefined || y === undefined) return;

      try {
        const docWidth = window.innerWidth;
        const docHeight = window.innerHeight;
        const targetX = Math.round(x * docWidth);
        const targetY = Math.round(y * docHeight);

        // Update the local "Fake Cursor" UI in this tab
        if (cursorRef.current) {
            cursorRef.current.style.left = `${x * 100}%`;
            cursorRef.current.style.top = `${y * 100}%`;
            cursorRef.current.style.display = 'flex';
            
            if (type === 'click' || type === 'mousedown') {
                cursorRef.current.style.transform = 'scale(0.8)';
                setTimeout(() => { if (cursorRef.current) cursorRef.current.style.transform = 'scale(1)'; }, 100);
            }
        }

        // Find and target element (ignoring UI overlays)
        let target: Element | null = null;
        if (typeof document.elementsFromPoint === 'function') {
          target = document.elementsFromPoint(targetX, targetY).find(el => 
            !el.hasAttribute('data-remote-ignore') && 
            !el.closest('[data-remote-ignore="true"]')
          ) || null;
        }
        if (!target) target = document.elementFromPoint(targetX, targetY) || document.body;

        switch (type) {
          case 'mousemove':
            target.dispatchEvent(new MouseEvent('mousemove', { view: window, bubbles: true, cancelable: true, clientX: targetX, clientY: targetY }));
            break;
          case 'mousedown':
            target.dispatchEvent(new MouseEvent('mousedown', { view: window, bubbles: true, cancelable: true, clientX: targetX, clientY: targetY, button: button || 0 }));
            break;
          case 'mouseup':
            target.dispatchEvent(new MouseEvent('mouseup', { view: window, bubbles: true, cancelable: true, clientX: targetX, clientY: targetY, button: button || 0 }));
            break;
          case 'click':
            if (target instanceof HTMLElement) {
              target.dispatchEvent(new MouseEvent('mousedown', { view: window, bubbles: true, cancelable: true, clientX: targetX, clientY: targetY, button: button || 0 }));
              target.dispatchEvent(new MouseEvent('mouseup', { view: window, bubbles: true, cancelable: true, clientX: targetX, clientY: targetY, button: button || 0 }));
              target.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true, clientX: targetX, clientY: targetY, button: button || 0 }));
              
              try { target.focus(); } catch(e) {}
              if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement || target instanceof HTMLInputElement) {
                setTimeout(() => target.click(), 0);
              }
            }
            break;
          case 'keydown':
            if (key) target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
            break;
          case 'keyup':
            if (key) target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
            break;
          case 'wheel':
            target.dispatchEvent(new WheelEvent('wheel', { view: window, bubbles: true, cancelable: true, clientX: targetX, clientY: targetY, deltaY: deltaY || 0 }));
            let sTarget: HTMLElement | null = target as HTMLElement;
            while (sTarget && sTarget !== document.body) {
              const style = window.getComputedStyle(sTarget);
              if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                 sTarget.scrollTop += deltaY || 0;
                 break;
              }
              sTarget = sTarget.parentElement;
            }
            if (sTarget === document.body) window.scrollBy(0, deltaY || 0);
            break;
        }
      } catch (e) {
        // Fail silently
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  if (!isBeingControlled) return null;

  return (
    <>
      {/* Global Status Banner for all tabs */}
      <div 
        data-remote-ignore="true"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[2147483647] bg-amber-500/95 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md border border-amber-300/30 pointer-events-none animate-in fade-in slide-in-from-top-4">
        <MousePointer2 className="h-4 w-4 animate-bounce" />
        <span className="text-xs font-black uppercase tracking-tight">Viewing shared page: Remote control active</span>
      </div>

      {/* Global Neon Cursor for all tabs */}
      <div
        ref={cursorRef}
        className="fixed z-[2147483646] pointer-events-none hidden flex-col items-center transition-transform duration-75"
        style={{ left: '50%', top: '50%', willChange: 'left, top' }}
      >
        <div className="relative">
            <svg width="42" height="42" viewBox="0 0 24 24" className="drop-shadow-[0_0_8px_rgba(34,211,238,1)]">
              <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="#22d3ee" stroke="#000" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            <div className="absolute top-[3px] left-[5px] w-2 h-2 bg-white rounded-full blur-[0.5px]"></div>
        </div>
        <div className="mt-1 bg-[#22d3ee] text-black text-[9px] font-black px-2 py-0.5 rounded shadow-xl tracking-tighter uppercase border border-black/20">
          Remote Control
        </div>
      </div>
    </>
  );
}
