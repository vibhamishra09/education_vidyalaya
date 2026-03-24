import React, { useRef, useEffect, MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent, WheelEvent as ReactWheelEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MousePointer2, X, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RemoteControlEventType } from '@/hooks/use-remote-control';

interface RemoteControlOverlayProps {
  isControlling: boolean;
  isSharing: boolean;
  controllerId: string | null;
  targetScreenShareId: string | null;
  onSendInput: (type: RemoteControlEventType, data: any) => void;
  onStopControl: () => void;
  onRevokeControl: () => void;
  className?: string;
}

export function RemoteControlOverlay({
  isControlling,
  isSharing,
  controllerId,
  targetScreenShareId,
  onSendInput,
  onStopControl,
  onRevokeControl,
  className
}: RemoteControlOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [clicks, setClicks] = useState<{ x: number; y: number; id: number }[]>([]);

  /**
   * IMPORTANT: Coordinate mapping logic for the CONTROLLER side.
   * Maps clientX/Y to normalized [0, 1] coordinates relative to the actual video content.
   * Accounts for letterboxing (black bars) resulting from 'object-contain' scaling.
   */
  const getNormalizedCoords = (clientX: number, clientY: number) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    
    // Find the video element in the same container
    const container = overlayRef.current.parentElement;
    const video = container?.querySelector('video');
    
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const videoRect = video.getBoundingClientRect();
        
        // Account for 'object-fit: contain' black bars
        const videoRatio = video.videoWidth / video.videoHeight;
        const elementRatio = videoRect.width / videoRect.height;
        
        let contentWidth = videoRect.width;
        let contentHeight = videoRect.height;
        let leftOffset = 0;
        let topOffset = 0;
        
        if (videoRatio > elementRatio) {
            // Letterboxed (bars top/bottom)
            contentHeight = videoRect.width / videoRatio;
            topOffset = (videoRect.height - contentHeight) / 2;
        } else {
            // Pillarboxed (bars left/right)
            contentWidth = videoRect.height * videoRatio;
            leftOffset = (videoRect.width - contentWidth) / 2;
        }
        
        // Calculate coords relative to the actual video pixels area
        const x = (clientX - (videoRect.left + leftOffset)) / contentWidth;
        const y = (clientY - (videoRect.top + topOffset)) / contentHeight;
        
        return { 
            x: Math.max(0, Math.min(1, x)), 
            y: Math.max(0, Math.min(1, y)) 
        };
    }
    
    // Fallback mapping if video element is not available (not ideal)
    const containerRect = overlayRef.current.getBoundingClientRect();
    return { 
        x: Math.max(0, Math.min(1, (clientX - containerRect.left) / containerRect.width)), 
        y: Math.max(0, Math.min(1, (clientY - containerRect.top) / containerRect.height)) 
    };
  };

  // --- Handlers for Controller Side ---

  const sendMove = (clientX: number, clientY: number) => {
    if (!isControlling) return;
    onSendInput('mousemove', getNormalizedCoords(clientX, clientY));
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (!isControlling) return;
    onSendInput('mousedown', { ...getNormalizedCoords(e.clientX, e.clientY), button: e.button });
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
    if (!isControlling) return;
    onSendInput('mouseup', { ...getNormalizedCoords(e.clientX, e.clientY), button: e.button });
  };

  const handleClick = (e: ReactMouseEvent) => {
    if (!isControlling) return;
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    onSendInput('click', { ...coords, button: e.button });

    // Ripple animaion
    const clickId = Date.now();
    setClicks(prev => [...prev, { ...coords, id: clickId }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== clickId)), 600);

    e.preventDefault();
    e.stopPropagation();
  };

  const handleWheel = (e: ReactWheelEvent) => {
    if (!isControlling) return;
    onSendInput('wheel', { ...getNormalizedCoords(e.clientX, e.clientY), deltaY: e.deltaY });
    if (Math.abs(e.deltaY) > 0) e.preventDefault();
  };

  // Capture global keyboard events
  useEffect(() => {
    if (!isControlling) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      onSendInput('keydown', { key: e.key });
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      onSendInput('keyup', { key: e.key });
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
    };
  }, [isControlling, onSendInput]);

  // --- Visuals for Sharer Side ---
  
  useEffect(() => {
    if (!isSharing || !controllerId) return;

    const onRemoteCursorUpdate = (e: Event) => {
      const { detail } = e as CustomEvent<{x: number, y: number, type?: string}>;
      if (detail && cursorRef.current) {
        // Move the fake pointer
        cursorRef.current.style.left = `${detail.x * 100}%`;
        cursorRef.current.style.top = `${detail.y * 100}%`;
        cursorRef.current.style.display = 'flex';
        
        // Visual compression effect on click
        if (detail.type === 'click' || detail.type === 'mousedown') {
            cursorRef.current.style.transform = 'scale(0.8)';
            setTimeout(() => { if (cursorRef.current) cursorRef.current.style.transform = 'scale(1)'; }, 100);
        }
      }
    };

    window.addEventListener('remote-cursor-move', onRemoteCursorUpdate);
    return () => window.removeEventListener('remote-cursor-move', onRemoteCursorUpdate);
  }, [isSharing, controllerId]);

  if (!isControlling && (!isSharing || !controllerId)) return null;

  return (
    <>
      {/* (CONTROLLER) Interaction Layer */}
      {isControlling && (
        <div
          ref={overlayRef}
          data-remote-ignore="true"
          className={cn(
            "absolute inset-0 z-[200] cursor-crosshair overflow-hidden touch-none",
            className
          )}
          onMouseMove={(e) => sendMove(e.clientX, e.clientY)}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onContextMenu={(e) => { e.preventDefault(); if (isControlling) onSendInput('click', { ...getNormalizedCoords(e.clientX, e.clientY), button: 2 }); }}
          onWheel={handleWheel}
        >
          {/* Status Bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-sky-600/95 text-white px-5 py-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-3 backdrop-blur-md border border-sky-300/30 animate-in slide-in-from-top-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest">Active Controlling</span>
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-7 px-4 ml-2 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 hover:bg-rose-600 border-none shadow-lg"
              onClick={(e) => { e.stopPropagation(); onStopControl(); }}
            >
              Stop
            </Button>
          </div>

          {/* Click Ripples */}
          {clicks.map(click => (
            <div 
              key={click.id}
              className="absolute w-14 h-14 -ml-7 -mt-7 border-2 border-sky-400 rounded-full animate-ping pointer-events-none z-[101] shadow-[0_0_20px_rgba(56,189,248,0.6)]"
              style={{ left: `${click.x * 100}%`, top: `${click.y * 100}%` }}
            />
          ))}
        </div>
      )}

      {/* (SHARER) Control Status Banner */}
      {isSharing && controllerId && (
        <div 
          data-remote-ignore="true"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[2147483647] bg-amber-500/95 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md border border-amber-300/30 animate-in slide-in-from-top-4 pointer-events-auto">
          <MousePointer2 className="h-4 w-4 animate-bounce" />
          <span className="text-xs font-black uppercase tracking-tight">Access Granted: Remote control active</span>
          <Button 
            size="sm" 
            variant="destructive" 
            className="h-8 px-4 ml-4 rounded-full text-[11px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 shadow-xl"
            onClick={onRevokeControl}
          >
            Revoke
          </Button>
        </div>
      )}

      {/* (SHARER) Neon Fake Pointer */}
      {isSharing && controllerId && (
        <div
          ref={cursorRef}
          className="fixed z-[2147483646] pointer-events-none hidden flex-col items-center transition-transform duration-75"
          style={{ left: '50%', top: '50%', willChange: 'left, top' }}
        >
          <div className="relative">
              {/* Ultra-visible Neon Pointer SVG */}
              <svg width="48" height="48" viewBox="0 0 24 24" className="drop-shadow-[0_0_10px_rgba(0,255,255,1)]">
                <path 
                  d="M5 3L19 12L12 13L9 20L5 3Z" 
                  fill="#00ffff" 
                  stroke="#000" 
                  strokeWidth="1.2" 
                  strokeLinejoin="round"
                />
              </svg>
              {/* Center point */}
              <div className="absolute top-[3px] left-[5px] w-2 h-2 bg-white rounded-full blur-[0.5px]"></div>
          </div>
          
          <div className="mt-1 bg-[#00ffff] text-black text-[10px] font-black px-2 py-0.5 rounded shadow-xl tracking-tighter uppercase border border-black/20">
            Remote Controller
          </div>
        </div>
      )}
    </>
  );
}
