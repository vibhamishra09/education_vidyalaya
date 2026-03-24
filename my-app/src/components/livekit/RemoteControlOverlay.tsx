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
  const [remoteCursor, setRemoteCursor] = useState<{ x: number; y: number } | null>(null);
  const [clicks, setClicks] = useState<{ x: number; y: number; id: number }[]>([]);

  // Normalize coordinates relative to the video container
  const getNormalizedCoords = (clientX: number, clientY: number) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const rect = overlayRef.current.getBoundingClientRect();
    
    // Calculate position relative to container
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    
    return { x, y };
  };

  // --- Event Handlers for the Controller ---

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isControlling) return;
    const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
    onSendInput('mousemove', { x, y });
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (!isControlling) return;
    const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
    onSendInput('mousedown', { x, y, button: e.button });
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
    if (!isControlling) return;
    const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
    onSendInput('mouseup', { x, y, button: e.button });
  };

  const handleClick = (e: ReactMouseEvent) => {
    if (!isControlling) return;
    const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
    onSendInput('click', { x, y, button: e.button });

    // Add click ripple
    const clickId = Date.now();
    setClicks(prev => [...prev, { x, y, id: clickId }]);
    setTimeout(() => {
      setClicks(prev => prev.filter(c => c.id !== clickId));
    }, 600);

    // Prevent default so we don't accidentally click things in the local UI
    e.preventDefault();
    e.stopPropagation();
  };

  const handleContext = (e: ReactMouseEvent) => {
    if (!isControlling) return;
    e.preventDefault(); // Prevent local context menu
  };

  const handleWheel = (e: ReactWheelEvent) => {
    if (!isControlling) return;
    const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
    onSendInput('wheel', { x, y, deltaY: e.deltaY });
    // Prevent scrolling the local page
    if (Math.abs(e.deltaY) > 0) {
      e.preventDefault();
    }
  };

  // Keyboard events need to be captured globally when controlling
  useEffect(() => {
    if (!isControlling) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't capture standard browser shortcuts (Ctrl+R, Ctrl+T, etc)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      onSendInput('keydown', { key: e.key });
      
      // Prevent scrolling from arrow keys/spacebar locally
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      onSendInput('keyup', { key: e.key });
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    window.addEventListener('keyup', handleGlobalKeyUp, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
      window.removeEventListener('keyup', handleGlobalKeyUp, { capture: true });
    };
  }, [isControlling, onSendInput]);

  // --- Visual Feedback for the Sharer ---
  
  useEffect(() => {
    if (!isSharing || !controllerId) return;

    const handleRemoteCursorMove = (e: Event) => {
      const customEvent = e as CustomEvent<{x: number, y: number}>;
      if (cursorRef.current && customEvent.detail) {
        // detail.x and detail.y are normalized 0.0 to 1.0!
        cursorRef.current.style.left = `${customEvent.detail.x * 100}%`;
        cursorRef.current.style.top = `${customEvent.detail.y * 100}%`;
      }
    };

    window.addEventListener('remote-cursor-move', handleRemoteCursorMove);
    return () => {
      window.removeEventListener('remote-cursor-move', handleRemoteCursorMove);
    };
  }, [isSharing, controllerId]);

  // If neither controlling nor sharing with active controller, don't render interaction layer
  if (!isControlling && (!isSharing || !controllerId)) {
    return null;
  }

  return (
    <>
      {/* Interaction Overlay (Controller side) */}
      {isControlling && (
        <div
          ref={overlayRef}
          data-remote-ignore="true"
          className={cn(
            "absolute inset-0 z-40 cursor-crosshair",
            className
          )}
          style={{ touchAction: 'none' }} // Prevent touch scrolling on mobile
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onContextMenu={handleContext}
          onWheel={handleWheel}
        >
          {/* Top warning bar for controller */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 backdrop-blur-sm animate-in slide-in-from-top-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-sm font-medium">You are controlling this screen</span>
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-7 px-3 ml-2 rounded-full text-xs font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                onStopControl();
              }}
            >
              Stop Control
            </Button>
          </div>
        </div>
      )}

      {/* Click Ripples */}
      {clicks.map(click => (
        <div 
          key={click.id}
          className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-sky-400 rounded-full animate-ping pointer-events-none z-[101]"
          style={{ left: `${click.x * 100}%`, top: `${click.y * 100}%` }}
        />
      ))}

      {/* Warning Overlay (Sharer side) */}
      {isSharing && controllerId && (
        <div 
          data-remote-ignore="true"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 backdrop-blur-sm animate-in slide-in-from-top-4 pointer-events-auto">
          <MousePointer2 className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium">Someone is controlling your screen</span>
          <Button 
            size="sm" 
            variant="destructive" 
            className="h-7 px-3 ml-2 rounded-full text-xs font-semibold"
            onClick={onRevokeControl}
          >
            Revoke
          </Button>
        </div>
      )}

      {/* Fake Cursor (Sharer side) */}
      {isSharing && controllerId && (
        <div
          ref={cursorRef}
          className="absolute z-[100] pointer-events-none transition-all duration-75"
          style={{ 
            left: '50%', top: '50%', 
          }}
        >
          <MousePointer2 className="h-8 w-8 text-rose-500 fill-rose-500 drop-shadow-lg" style={{ transform: 'rotate(-25deg)', marginLeft: '-0.5rem', marginTop: '-0.5rem' }} />
        </div>
      )}
    </>
  );
}
