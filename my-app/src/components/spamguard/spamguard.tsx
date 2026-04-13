import React from 'react';
import { useSpamLogic } from '@/hooks/use-spam-guard';
import { Loader2 } from 'lucide-react';

interface SpamShieldProps {
  children: React.ReactElement;
  context: string;
}

export const SpamShield: React.FC<SpamShieldProps> = ({ children, context }) => {
  const { suggestion, isSafe, isVerifying, checkSpam, score } = useSpamLogic(context);

  const protectedInput = React.cloneElement(children, {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      checkSpam(e.target.value);
      children.props.onChange?.(e);
    },
    className: `${children.props.className} transition-opacity duration-200 ${
      isVerifying ? 'opacity-70' : ''
    }`
  });

  return (
    <div className="relative w-full group">
      {protectedInput}

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
        {isVerifying ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
        ) : score! > 0 ? (
          <div 
            className={`h-2 w-2 rounded-full transition-all duration-300 shadow-sm ${
              isSafe ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 shadow-amber-500/50'
            }`} 
          />
        ) : null}
      </div>

      <div className="absolute left-0 top-full w-full pointer-events-none">
        {!isSafe && suggestion && (
          <div className="mt-1.5 px-2 py-1 rounded border border-amber-500/10 bg-background/95 backdrop-blur-sm w-fit animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-[10px] md:text-[11px] font-medium text-amber-600 leading-none">
              {suggestion}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};