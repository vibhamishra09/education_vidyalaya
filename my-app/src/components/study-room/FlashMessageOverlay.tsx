'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { ActiveFlashMessage } from '@/hooks/use-session-moderation'

interface FlashMessageOverlayProps {
	message: ActiveFlashMessage
	/** Called when the participant closes the overlay locally (participant-only dismiss) */
	onDismiss: () => void
	/** Whether the current user is a host (hosts get a "Dismiss for all" button) */
	isHost?: boolean
	/** Called by host to dismiss for everyone */
	onDismissForAll?: () => void
}

const POSITION_CLASSES: Record<string, string> = {
	top: 'items-start pt-16',
	center: 'items-center',
	bottom: 'items-end pb-16',
}

const FONT_SIZE_CLASSES: Record<string, string> = {
	sm: 'text-base md:text-lg',
	md: 'text-xl md:text-2xl',
	lg: 'text-2xl md:text-3xl',
	xl: 'text-3xl md:text-4xl',
}

export function FlashMessageOverlay({
	message,
	onDismiss,
	isHost = false,
	onDismissForAll,
}: FlashMessageOverlayProps) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// If duration is set, auto-dismiss locally after duration
	useEffect(() => {
		if (message.duration && message.duration > 0) {
			timerRef.current = setTimeout(onDismiss, message.duration * 1000)
		}
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		}
	}, [message.id, message.duration, onDismiss])

	const positionClass = POSITION_CLASSES[message.position ?? 'center'] ?? POSITION_CLASSES.center
	const fontSizeClass = FONT_SIZE_CLASSES[message.fontSize ?? 'lg'] ?? FONT_SIZE_CLASSES.lg

	return (
		<div
			className={`fixed inset-0 z-[200] flex flex-col justify-center ${positionClass} pointer-events-none`}
			style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
		>
			{/* Card */}
			<div
				className="pointer-events-auto relative mx-auto w-full max-w-2xl rounded-2xl px-8 py-8 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-300"
				style={{
					backgroundColor: message.bgColor || 'rgba(15, 15, 20, 0.97)',
				}}
			>
				{/* Close button (local dismiss) */}
				<button
					onClick={onDismiss}
					className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
					title="Close"
				>
					<X className="h-4 w-4" />
				</button>

				{/* Message text */}
				<p
					className={`text-white font-semibold leading-snug text-center ${fontSizeClass}`}
					style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
				>
					{message.text}
				</p>

				{/* Duration progress bar */}
				{message.duration && message.duration > 0 && (
					<div className="mt-5 h-1 w-full rounded-full bg-white/10 overflow-hidden">
						<div
							className="h-full bg-primary rounded-full"
							style={{
								width: '100%',
								animation: `shrink-x ${message.duration}s linear forwards`,
							}}
						/>
					</div>
				)}

				{/* Host controls */}
				{isHost && onDismissForAll && (
					<div className="mt-4 flex justify-center">
						<button
							onClick={onDismissForAll}
							className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs transition-colors border border-white/10"
						>
							Dismiss for everyone
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
