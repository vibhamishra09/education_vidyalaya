import { Tldraw, Editor, TldrawProps } from 'tldraw'
import 'tldraw/tldraw.css'
import { Room } from 'livekit-client'
import { useScratchPad, ScratchPadMode } from '@/hooks/use-scratch-pad'
import { memo } from 'react'
import { LayoutGrid, User, Share2 } from 'lucide-react'

interface ScratchPadProps {
	roomId: string
	room?: Room
	isHost?: boolean
    canEdit?: boolean
    roomTitle?: string
    enabled?: boolean
}

export const ScratchPad = memo(function ScratchPad({ roomId, room, isHost, canEdit = true, roomTitle, enabled = true }: ScratchPadProps) {
	const { store, mode, setMode, loading, error, onEditorMount } = useScratchPad({
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
		<div className="h-full w-full bg-zinc-950/50 backdrop-blur-md rounded-xl overflow-hidden border border-zinc-800 shadow-2xl relative flex flex-col">
            {/* Mode Toggle Header */}
            <div className="h-12 bg-white/5 border-b border-white/5 flex items-center justify-center gap-1 z-[9999]">
                <button
                    onClick={() => setMode('personal')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        mode === 'personal' 
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                            : 'text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <User className="h-3.5 w-3.5" />
                    Personal Page
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                    onClick={() => setMode('shared')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        mode === 'shared' 
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' 
                            : 'text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <Share2 className="h-3.5 w-3.5" />
                    {isHost ? 'Shared Page (Host)' : 'Shared Page'}
                </button>
            </div>
            
            <div className="flex-1 relative">
                <Tldraw 
                    key={mode} // Forced re-mount when switching modes to update UI/store cleanly
                    store={store}
                    autoFocus 
                    onMount={onEditorMount}
                    inferDarkMode
                />
            </div>
            
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

