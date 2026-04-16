import React from 'react';
import { useSpamLogic } from '@/hooks/use-spam-guard';
import { Loader2 } from 'lucide-react';

interface SpamShieldProps {
  children: React.ReactElement;
  context: string;
  onStatusChange?: (status: { isSafe: boolean; isVerifying: boolean, suggestion: string }) => void;
}

interface ChildProps {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export const SpamShield: React.FC<SpamShieldProps> = ({ children, context, onStatusChange }) => {
  const { suggestion, isSafe, isVerifying, checkSpam, score } = useSpamLogic(context);

  React.useEffect(() => {
    onStatusChange?.({ isSafe, isVerifying, suggestion });
  }, [isSafe, isVerifying, suggestion, onStatusChange]);

  const child = children as React.ReactElement<ChildProps>;
  const protectedInput = React.cloneElement(children, {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      
      checkSpam(e.target.value);
      const childProps = children.props as ChildProps;
      childProps.onChange?.(e);
    },
    className: `${child.props.className} transition-all duration-200 ${
      isVerifying ? 'ring-1 ring-muted-foreground/20' : ''
    }`
  } as ChildProps);

  return (
    <div className="relative w-full group">
      {protectedInput}

      {!isVerifying && score > 0 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div 
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              isSafe ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
            }`} 
          />
        </div>
      )}

      <div className="absolute left-0 top-full w-full pointer-events-none flex flex-col gap-1 pt-1.5">
        
        {isVerifying && (
          <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-top-1">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">Verifying...</span>
          </div>
        )}


        {!isSafe && suggestion && !isVerifying && (
          <div className="relative mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="absolute -top-1 left-4 w-2 h-2 rotate-45 border-t border-l border-amber-500/20 bg-amber-50" />
            
            <div className="px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-50 backdrop-blur-sm w-fit shadow-sm">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] md:text-[11px] font-medium text-amber-700 leading-tight">
                  {suggestion}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};