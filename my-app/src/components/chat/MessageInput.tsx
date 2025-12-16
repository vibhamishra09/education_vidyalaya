'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

export function MessageInput({ onSend }: { onSend: (text: string) => void }) {
	const [text, setText] = useState('')
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				const t = text.trim()
				if (t) {
					onSend(t)
					setText('')
				}
			}}
			className="flex gap-2 p-2 md:p-3 bg-[#2a2a2a] md:bg-card/80 backdrop-blur-sm"
		>
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Type a message..."
				className="flex-1 bg-[#1f1f1f] md:bg-input/50 border border-white/10 md:border-input rounded-full px-4 py-2.5 text-sm text-white md:text-foreground placeholder:text-white/40 md:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
				autoComplete="off"
			/>
			<Button
				type="submit"
				disabled={!text.trim()}
				className="h-10 w-10 md:h-auto md:w-auto md:px-4 md:py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground rounded-full md:rounded-lg transition-all p-0 flex-shrink-0"
			>
				<Send className="h-4 w-4" />
			</Button>
		</form>
	)
}


