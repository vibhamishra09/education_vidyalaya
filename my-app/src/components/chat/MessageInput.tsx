'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Search, ChevronDown } from 'lucide-react'

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
	currentUserDbId,
	allowedAudiences,
}: {
	onSend: (text: string, audienceType: MessageAudienceType, targetUserId?: string) => void
	disabled?: boolean
	recipients?: ChatRecipient[]
	hostUserId?: string | null
	currentUserDbId?: string | null
	allowedAudiences?: Partial<Record<MessageAudienceType, boolean>>
}) {
	const [text, setText] = useState('')
	const [audienceType, setAudienceType] = useState<MessageAudienceType>('EVERYONE')
	const [targetUserId, setTargetUserId] = useState('')
	const [userSearch, setUserSearch] = useState('')
	const [showUserDropdown, setShowUserDropdown] = useState(false)
	const userDropdownRef = useRef<HTMLDivElement>(null)
	const searchInputRef = useRef<HTMLInputElement>(null)

	// Filter out the current user (no self-messaging) and host (host has its own option)
	const availableRecipients = recipients.filter(
		(recipient) => recipient.id !== currentUserDbId && recipient.id !== hostUserId,
	)
	const canUseSpecificUser = availableRecipients.length > 0

	// Filtered recipients based on search query
	const filteredRecipients = userSearch.trim()
		? availableRecipients.filter((r) =>
				r.name.toLowerCase().includes(userSearch.toLowerCase()),
			)
		: availableRecipients

	const selectedRecipient = availableRecipients.find((r) => r.id === targetUserId)
	const canSendEveryone = allowedAudiences?.EVERYONE !== false
	const canSendHost = allowedAudiences?.HOST !== false
	const canSendUser = allowedAudiences?.USER !== false && canUseSpecificUser

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
				setShowUserDropdown(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	// Focus search input when dropdown opens
	useEffect(() => {
		if (showUserDropdown && searchInputRef.current) {
			searchInputRef.current.focus()
		}
	}, [showUserDropdown])

	const handleAudienceChange = (nextAudience: MessageAudienceType) => {
		setAudienceType(nextAudience)
		if (nextAudience !== 'USER') {
			setTargetUserId('')
			setUserSearch('')
			setShowUserDropdown(false)
		}
	}

	const handleSelectRecipient = (recipient: ChatRecipient) => {
		setTargetUserId(recipient.id)
		setUserSearch('')
		setShowUserDropdown(false)
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				if (disabled) return
				const t = text.trim()
				if (t) {
					const normalizedAudience =
						audienceType === 'USER' && !canUseSpecificUser
							? 'EVERYONE'
							: audienceType
					const fallbackAudience: MessageAudienceType = canSendEveryone
						? 'EVERYONE'
						: canSendHost
							? 'HOST'
							: 'USER'
					const finalAudience =
						normalizedAudience === 'EVERYONE' && !canSendEveryone
							? fallbackAudience
							: normalizedAudience === 'HOST' && !canSendHost
								? fallbackAudience
								: normalizedAudience === 'USER' && !canSendUser
									? fallbackAudience
									: normalizedAudience
					const normalizedTargetUserId =
						finalAudience === 'HOST'
							? hostUserId || undefined
							: finalAudience === 'USER'
								? targetUserId || undefined
								: undefined
					onSend(t, finalAudience, normalizedTargetUserId)
					setText('')
				}
			}}
			className="flex flex-col gap-2 p-3 md:p-4 bg-gradient-to-t from-[#1a1a1a] to-[#1f1f1f] backdrop-blur-sm"
		>
			<div className="flex gap-2">
				<select
					value={audienceType}
					onChange={(e) => handleAudienceChange(e.target.value as MessageAudienceType)}
					disabled={disabled}
					className="w-32 md:w-36 bg-[#1f1f1f] border border-white/10 rounded-lg px-2.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
				>
					<option value="EVERYONE" disabled={!canSendEveryone}>Everyone</option>
					<option value="HOST" disabled={!canSendHost}>Host</option>
					<option value="USER" disabled={!canSendUser}>
						Specific user
					</option>
				</select>

				{audienceType === 'USER' && (
					<div ref={userDropdownRef} className="relative flex-1">
						{/* Trigger button */}
						<button
							type="button"
							disabled={disabled || !canUseSpecificUser}
							onClick={() => setShowUserDropdown((prev) => !prev)}
							className="w-full flex items-center justify-between gap-1.5 bg-[#1f1f1f] border border-white/10 rounded-lg px-2.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 hover:border-white/20 transition-colors"
						>
							<span className={selectedRecipient ? 'text-white' : 'text-white/40'}>
								{selectedRecipient ? selectedRecipient.name : 'Select user'}
							</span>
							<ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-white/50" />
						</button>

						{/* Dropdown panel */}
						{showUserDropdown && (
							<div className="absolute bottom-full mb-1 left-0 right-0 bg-[#1f1f1f] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
								{/* Search input */}
								<div className="p-2 border-b border-white/10">
									<div className="flex items-center gap-1.5 bg-[#141414] rounded-md px-2.5 py-1.5">
										<Search className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
										<input
											ref={searchInputRef}
											type="text"
											value={userSearch}
											onChange={(e) => setUserSearch(e.target.value)}
											placeholder="Search users..."
											className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
										/>
									</div>
								</div>

								{/* Recipient list */}
								<div className="max-h-40 overflow-y-auto">
									{filteredRecipients.length === 0 ? (
										<div className="px-3 py-2 text-xs text-white/40 text-center">
											{userSearch ? 'No users found' : 'No users available'}
										</div>
									) : (
										filteredRecipients.map((recipient) => (
											<button
												key={recipient.id}
												type="button"
												onClick={() => handleSelectRecipient(recipient)}
												className={`w-full text-left px-3 py-2 text-xs md:text-sm hover:bg-white/5 transition-colors flex items-center gap-2 ${
													recipient.id === targetUserId
														? 'text-primary bg-primary/10'
														: 'text-white'
												}`}
											>
												{recipient.avatar ? (
													<img
														src={recipient.avatar}
														alt={recipient.name}
														className="h-5 w-5 rounded-full object-cover flex-shrink-0"
													/>
												) : (
													<span className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
														{recipient.name.charAt(0).toUpperCase()}
													</span>
												)}
												<span className="truncate">{recipient.name}</span>
											</button>
										))
									)}
								</div>
							</div>
						)}
					</div>
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
					disabled={
						!text.trim() ||
						disabled ||
						(audienceType === 'USER' && !targetUserId) ||
						(audienceType === 'EVERYONE' && !canSendEveryone) ||
						(audienceType === 'HOST' && !canSendHost) ||
						(audienceType === 'USER' && !canSendUser)
					}
					className="h-10 w-10 md:h-auto md:w-auto md:px-4 md:py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground rounded-full md:rounded-lg transition-all p-0 flex-shrink-0"
				>
					<Send className="h-4 w-4" />
				</Button>
			</div>
		</form>
	)
}
