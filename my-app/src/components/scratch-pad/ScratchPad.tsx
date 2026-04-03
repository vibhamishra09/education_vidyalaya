import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { Room } from 'livekit-client'
import { useScratchPad } from '@/hooks/use-scratch-pad'
import { memo, useState } from 'react'
import { User, Users, Save, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts/toast-context'

interface ScratchPadProps {
	roomId: string
	room?: Room
	isHost?: boolean
    canEdit?: boolean
    roomTitle?: string
    enabled?: boolean
    isGuest?: boolean
}

export const ScratchPad = memo(function ScratchPad({ roomId, room, isHost, canEdit = true, roomTitle, enabled = true, isGuest = false }: ScratchPadProps) {
	const { store, mode, setMode, loading, syncStatus, error, saveError, onEditorMount, saveManual } = useScratchPad({
		roomId,
		room,
		isHost,
		canEdit,
        roomTitle,
		enabled,
        isGuest
	})
    const { showSuccess, showError } = useToast()
    const [justSaved, setJustSaved] = useState(false)
    const isSaving = syncStatus === 'saving'

	if (loading) {
		return (
			<div className="flex h-full w-full items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl">
				<div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                    <div className="text-zinc-400 text-sm font-medium">Loading Scratch Pad...</div>
                </div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl">
				<div className="text-destructive font-medium">{error}</div>
			</div>
		)
	}

    const handleSave = async () => {
        const success = await saveManual()
        if (success) {
            showSuccess("Stored safely", "Your personal scratchpad has been saved.")
            setJustSaved(true)
            setTimeout(() => setJustSaved(false), 2000)
        } else {
            showError("Save failed", saveError || "Could not persist your changes. Please try again.")
        }
    }

	return (
		<div className="h-full w-full bg-zinc-950/50 backdrop-blur-md rounded-xl overflow-hidden border border-zinc-800 shadow-2xl relative flex flex-col">
            {/* Header with Title and Save Action */}
            <div className="h-12 bg-white/5 border-b border-white/5 flex items-center justify-between px-4 z-[9999]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                            {mode === 'personal' ? (
                                <User className="h-4 w-4 text-purple-400" />
                            ) : (
                                <Users className="h-4 w-4 text-sky-400" />
                            )}
                        </div>
                        <span className="text-sm font-bold text-white/90 tracking-tight">
                            {mode === 'personal' ? 'Personal Workspace' : 'Meeting Whiteboard'}
                        </span>
                    </div>

                    {/* Sync Status Indicator */}
                    <div className="flex items-center gap-3 transition-all duration-500 ml-2">
                        {isSaving && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 tracking-widest uppercase">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                SAVING...
                            </div>
                        )}
                        {syncStatus === 'saved' && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#00DC6E] tracking-widest uppercase">
                                <Check className="h-3 w-3" />
                                CHANGES SAVED
                            </div>
                        )}
                        {syncStatus === 'error' && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 tracking-widest uppercase">
                                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                SYNC ERROR
                            </div>
                        )}
                    </div>
                </div>

                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`h-8 px-3 text-xs font-bold transition-all duration-300 rounded-lg ${
                        justSaved 
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                >
                    {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : justSaved ? (
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                    ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {isSaving ? 'SAVING...' : justSaved ? 'SAVED' : 'SAVE NOW'}
                </Button>
            </div>
            
            <div className="flex-1 relative">
                <Tldraw 
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

