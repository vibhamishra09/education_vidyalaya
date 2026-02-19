'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

export type MessageAudienceType = 'EVERYONE' | 'HOST' | 'USER'

export interface ChatRecipient {
	id: string
	name: string
	avatar?: string | null
}

export function MessageInput({
	onSend,
	disabled = false,
	recipients = [],
	hostUserId,
}: {
	onSend: (text: string, audienceType: MessageAudienceType, targetUserId?: string) => void
	disabled?: boolean
	recipients?: ChatRecipient[]
	hostUserId?: string | null
}) {
	const [text, setText] = useState('')
	const [audienceType, setAudienceType] = useState<MessageAudienceType>('EVERYONE')
	const [targetUserId, setTargetUserId] = useState('')
	const availableRecipients = recipients.filter((recipient) => recipient.id !== hostUserId)
	const canUseSpecificUser = availableRecipients.length > 0

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				if (disabled) return
				const t = text.trim()
				if (t) {
					const normalizedAudience =
						audienceType === 'USER' && !canUseSpecificUser ? 'EVERYONE' : audienceType
					const normalizedTargetUserId =
						normalizedAudience === 'HOST'
							? hostUserId || undefined
							: normalizedAudience === 'USER'
								? targetUserId || undefined
								: undefined
					onSend(t, normalizedAudience, normalizedTargetUserId)
					setText('')
				}
			}}
			className="flex flex-col gap-2 p-3 md:p-4 bg-gradient-to-t from-[#1a1a1a] to-[#1f1f1f] backdrop-blur-sm"
		>
			<div className="flex gap-2">
				<select
					value={audienceType}
					onChange={(e) => {
						const nextAudience = e.target.value as MessageAudienceType
						setAudienceType(nextAudience)
						if (nextAudience !== 'USER') {
							setTargetUserId('')
						}
					}}
					disabled={disabled}
					className="w-32 md:w-36 bg-[#1f1f1f] border border-white/10 rounded-lg px-2.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
				>
					<option value="EVERYONE">Everyone</option>
					<option value="HOST">Host</option>
					<option value="USER" disabled={!canUseSpecificUser}>
						Specific user
					</option>
				</select>
				{audienceType === 'USER' && (
					<select
						value={targetUserId}
						onChange={(e) => setTargetUserId(e.target.value)}
						disabled={disabled || !canUseSpecificUser}
						className="flex-1 bg-[#1f1f1f] border border-white/10 rounded-lg px-2.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
					>
						<option value="">Select user</option>
						{availableRecipients.map((recipient) => (
							<option key={recipient.id} value={recipient.id}>
								{recipient.name}
							</option>
						))}
					</select>
				)}
			</div>

			<div className="flex gap-2">
				<input
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder={disabled ? 'Chat is disabled...' : 'Type a message...'}
					disabled={disabled}
					className="flex-1 bg-[#1f1f1f] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					autoComplete="off"
				/>
				<Button
					type="submit"
					disabled={!text.trim() || disabled || (audienceType === 'USER' && !targetUserId)}
					className="h-10 w-10 md:h-auto md:w-auto md:px-4 md:py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground rounded-full md:rounded-lg transition-all p-0 flex-shrink-0"
				>
					<Send className="h-4 w-4" />
				</Button>
			</div>
		</form>
	)
}


