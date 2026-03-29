'use client'
import { Tldraw, Editor, TldrawProps } from 'tldraw'
import 'tldraw/tldraw.css'
import { Room } from 'livekit-client'
import { useScratchPad } from '@/hooks/use-scratch-pad'
import { memo } from 'react'

interface ScratchPadProps {
	roomId: string
	room?: Room
	isHost?: boolean
    canEdit?: boolean
    roomTitle?: string
    enabled?: boolean
}

export const ScratchPad = memo(function ScratchPad({ roomId, room, isHost, canEdit = true, roomTitle, enabled = true }: ScratchPadProps) {
	const { loading, error, onEditorMount } = useScratchPad({
		roomId,
		room,
		isHost,
		canEdit,
        roomTitle,
		enabled
	})

	if (loading) {
		return (
			<div className="flex h-full w-full items-center justify-center bg-zinc-900">
				<div className="text-zinc-400">Loading Scratch Pad...</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full items-center justify-center bg-zinc-900">
				<div className="text-destructive">{error}</div>
			</div>
		)
	}

	return (
		<div className="h-full w-full bg-zinc-950/50 backdrop-blur-md rounded-xl overflow-hidden border border-zinc-800 shadow-2xl relative">
            <div className="absolute top-4 left-4 z-[9999] pointer-events-none">
                <h3 className="text-white/60 text-xs font-semibold tracking-widest uppercase">
                    {isHost ? 'Collaborative Scratchpad (Host)' : 'Collaborative Scratchpad'}
                </h3>
            </div>
            
			<Tldraw 
                autoFocus 
                onMount={onEditorMount}
                inferDarkMode
            />
            
            <style jsx global>{`
                .tl-container {
                    background-color: transparent !important;
                }
                .tl-ui {
                    background-color: rgba(24, 24, 27, 0.4) !important;
                    backdrop-filter: blur(12px);
                }
                .tl-toolbar {
                    background: rgba(39, 39, 42, 0.8) !important;
                    border: 1px solid rgba(63, 63, 70, 0.5) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
                }
            `}</style>
		</div>
	)
})
