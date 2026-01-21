'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

export function MessageInput({ onSend, disabled = false }: { onSend: (text: string) => void; disabled?: boolean }) {
	const [text, setText] = useState('')
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				if (disabled) return
				const t = text.trim()
				if (t) {
					onSend(t)
					setText('')
				}
			}}
			className="flex gap-2 p-3 md:p-4 bg-gradient-to-t from-[#1a1a1a] to-[#1f1f1f] backdrop-blur-sm"
		>
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder={disabled ? "Chat is disabled..." : "Type a message..."}
				disabled={disabled}
				className="flex-1 bg-[#1f1f1f] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				autoComplete="off"
			/>
			<Button
				type="submit"
				disabled={!text.trim() || disabled}
				className="h-10 w-10 md:h-auto md:w-auto md:px-4 md:py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground rounded-full md:rounded-lg transition-all p-0 flex-shrink-0"
			>
				<Send className="h-4 w-4" />
			</Button>
		</form>
	)
}


