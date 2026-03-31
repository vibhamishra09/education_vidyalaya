'use client'
import { useEffect, useState } from 'react'
import { FlashMessage } from '@/hooks/use-session-moderation'
import { cn } from '@/lib/utils'
import { Zap, MessageSquare, Image as ImageIcon } from 'lucide-react'

interface FlashMessageOverlayProps {
  message: FlashMessage | null
  onDismiss?: () => void
}

export function FlashMessageOverlay({ message, onDismiss }: FlashMessageOverlayProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [message])

  if (!message || !visible) return null

  const positionClasses = {
    top: 'top-8',
    center: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-24',
  }

  const fontSizeClasses = {
    sm: 'text-sm md:text-base',
    md: 'text-base md:text-xl',
    lg: 'text-lg md:text-3xl',
    xl: 'text-xl md:text-5xl',
  }

  const typeIcons = {
    QUESTION: <MessageSquare className="w-5 h-5 text-sky-400" />,
    AD_HOC: <Zap className="w-5 h-5 text-yellow-400" />,
    MEDIA: <ImageIcon className="w-5 h-5 text-purple-400" />,
  }

  return (
    <div 
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-[100] w-full max-w-[90%] md:max-w-2xl px-6 pointer-events-none transition-all duration-500 transform",
        positionClasses[message.position || 'center'],
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
      )}
    >
      <div className="relative group pointer-events-auto">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/20 via-primary/20 to-purple-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        
        {/* Main Card */}
        <div className="relative flex items-center gap-4 bg-[#141414]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10">
            {typeIcons[message.type] || <Zap className="w-6 h-6 text-primary" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-bold text-white tracking-tight leading-tight",
              fontSizeClasses[message.fontSize || 'lg']
            )}>
              {message.content}
            </h4>
            
            {message.type === 'QUESTION' && message.options && message.options.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {message.options.map((option, i) => (
                  <div key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium">
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress bar if duration exists */}
          {message.duration && message.duration > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden rounded-b-2xl">
              <div 
                className="h-full bg-primary/60 animate-[progress_linear_forwards]"
                style={{ animationDuration: `${message.duration}s` }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}
