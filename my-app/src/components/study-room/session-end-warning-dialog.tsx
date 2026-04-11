"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionEndWarningDialogProps {
  open: boolean;
  currentEndTime: number;
  onClose?: () => void;
}

export function SessionEndWarningDialog({
  open,
  currentEndTime,
  onClose,
}: SessionEndWarningDialogProps) {
  const [countdown, setCountdown] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !currentEndTime) return;

    const update = () => {
      const now = Date.now();
      const remaining = Math.max(
        0,
        Math.floor((currentEndTime - now) / 1000)
      );
      setCountdown(remaining);
    };

    update();

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [open, currentEndTime]);

  if (!open) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div 
      className={cn(
        "fixed top-4 right-4 z-[10001] transition-all duration-300 ease-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-900/20 p-4 min-w-[280px] max-w-[340px]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          {/* Warning Icon */}
          <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 ring-1 ring-amber-500/30">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-sm font-semibold text-white mb-1">
              Session Ending Soon
            </h3>

            {/* Timer */}
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-mono font-bold text-amber-500 tabular-nums">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-white/60 leading-relaxed">
              Please wrap up your session. The call will end automatically.
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <Button 
          onClick={onClose}
          size="sm"
          className="w-full mt-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-medium h-8 rounded-lg border border-amber-500/30 transition-all"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
