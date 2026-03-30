'use client'
import { useState, useRef } from 'react'
import { Plus, Trash2, GripVertical, Upload, Send, ChevronDown, ChevronUp, Edit2, Check, X, Play, Zap } from 'lucide-react'
import { FlashQuestion } from '@/hooks/use-session-moderation'

interface QuestionManagerProps {
	questions: FlashQuestion[]
	onUploadList: (questions: FlashQuestion[]) => void
	onUpdateQuestion: (questionId: string, updates: Partial<Omit<FlashQuestion, 'id'>>) => void
	onReorder: (orderedIds: string[]) => void
	onDeleteQuestion: (questionId: string) => void
	onFlashQuestion: (questionId: string) => void
	onFlashAdHoc: (text: string, meta?: Omit<FlashQuestion, 'id' | 'text'>) => void
	onDismissForAll: () => void
	/** Whether a flash message is currently showing */
	isFlashActive?: boolean
}

// Generate a simple unique ID
function uid() {
	return `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const FONT_SIZE_OPTIONS: Array<{ value: FlashQuestion['fontSize']; label: string }> = [
	{ value: 'sm', label: 'Small' },
	{ value: 'md', label: 'Medium' },
	{ value: 'lg', label: 'Large' },
	{ value: 'xl', label: 'XL' },
]

const POSITION_OPTIONS: Array<{ value: FlashQuestion['position']; label: string }> = [
	{ value: 'top', label: 'Top' },
	{ value: 'center', label: 'Center' },
	{ value: 'bottom', label: 'Bottom' },
]

interface QuestionRowProps {
	question: FlashQuestion
	index: number
	onUpdate: (id: string, updates: Partial<Omit<FlashQuestion, 'id'>>) => void
	onDelete: (id: string) => void
	onFlash: (id: string) => void
	dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

function QuestionRow({ question, index, onUpdate, onDelete, onFlash, dragHandleProps }: QuestionRowProps) {
	const [editing, setEditing] = useState(false)
	const [localText, setLocalText] = useState(question.text)
	const [showMeta, setShowMeta] = useState(false)

	const handleSave = () => {
		if (localText.trim()) {
			onUpdate(question.id, { text: localText.trim() })
		}
		setEditing(false)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSave()
		} else if (e.key === 'Escape') {
			setLocalText(question.text)
			setEditing(false)
		}
	}

	return (
		<div className="group relative rounded-lg border border-white/10 bg-white/5 hover:border-white/20 transition-colors">
			<div className="flex items-start gap-2 p-3">
				{/* Drag handle */}
				<button
					className="mt-1 flex-shrink-0 text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing"
					{...dragHandleProps}
				>
					<GripVertical className="h-4 w-4" />
				</button>

				{/* Index badge */}
				<span className="mt-1 flex-shrink-0 w-5 text-center text-xs text-white/30 font-mono select-none">
					{index + 1}
				</span>

				{/* Question text */}
				<div className="flex-1 min-w-0">
					{editing ? (
						<div className="flex items-start gap-1">
							<textarea
								autoFocus
								value={localText}
								onChange={(e) => setLocalText(e.target.value)}
								onKeyDown={handleKeyDown}
								rows={2}
								className="flex-1 bg-[#111] border border-primary/50 rounded-md px-2 py-1 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
							/>
							<div className="flex flex-col gap-1">
								<button onClick={handleSave} className="p-1 rounded hover:bg-primary/20 text-primary"><Check className="h-3.5 w-3.5" /></button>
								<button onClick={() => { setLocalText(question.text); setEditing(false) }} className="p-1 rounded hover:bg-white/10 text-white/50"><X className="h-3.5 w-3.5" /></button>
							</div>
						</div>
					) : (
						<p className="text-sm text-white leading-snug break-words cursor-text" onDoubleClick={() => setEditing(true)}>
							{question.text}
						</p>
					)}

					{/* Meta row */}
					<div className="flex items-center gap-2 mt-1.5 flex-wrap">
						<span className="text-[10px] text-white/30 uppercase tracking-wide">
							{question.position ?? 'center'} · {question.fontSize ?? 'lg'} · {question.duration ? `${question.duration}s` : '∞'}
						</span>
						<button
							onClick={() => setShowMeta((v) => !v)}
							className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-0.5"
						>
							{showMeta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
							edit
						</button>
					</div>

					{/* Expanded metadata editor */}
					{showMeta && (
						<div className="mt-2 grid grid-cols-3 gap-2">
							<div>
								<label className="block text-[10px] text-white/40 mb-1">Duration (s)</label>
								<input
									type="number"
									min={0}
									max={300}
									value={question.duration ?? 0}
									onChange={(e) => onUpdate(question.id, { duration: Number(e.target.value) })}
									className="w-full bg-[#111] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
									placeholder="0=manual"
								/>
							</div>
							<div>
								<label className="block text-[10px] text-white/40 mb-1">Position</label>
								<select
									value={question.position ?? 'center'}
									onChange={(e) => onUpdate(question.id, { position: e.target.value as FlashQuestion['position'] })}
									className="w-full bg-[#111] border border-white/10 rounded px-1 py-1 text-xs text-white focus:outline-none"
								>
									{POSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
							<div>
								<label className="block text-[10px] text-white/40 mb-1">Font size</label>
								<select
									value={question.fontSize ?? 'lg'}
									onChange={(e) => onUpdate(question.id, { fontSize: e.target.value as FlashQuestion['fontSize'] })}
									className="w-full bg-[#111] border border-white/10 rounded px-1 py-1 text-xs text-white focus:outline-none"
								>
									{FONT_SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-1 flex-shrink-0">
					<button
						onClick={() => onFlash(question.id)}
						title="Flash this question"
						className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-colors"
					>
						<Play className="h-3.5 w-3.5" />
					</button>
					<button
						onClick={() => setEditing(true)}
						title="Edit question"
						className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
					>
						<Edit2 className="h-3.5 w-3.5" />
					</button>
					<button
						onClick={() => onDelete(question.id)}
						title="Delete question"
						className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</div>
	)
}

export function QuestionManager({
	questions,
	onUploadList,
	onUpdateQuestion,
	onReorder,
	onDeleteQuestion,
	onFlashQuestion,
	onFlashAdHoc,
	onDismissForAll,
	isFlashActive = false,
}: QuestionManagerProps) {
	const [adHocText, setAdHocText] = useState('')
	const [adHocMeta, setAdHocMeta] = useState<Omit<FlashQuestion, 'id' | 'text'>>({
		duration: 0,
		position: 'center',
		fontSize: 'lg',
	})
	const [showAdHocMeta, setShowAdHocMeta] = useState(false)
	const [addingNew, setAddingNew] = useState(false)
	const [newText, setNewText] = useState('')
	const fileInputRef = useRef<HTMLInputElement>(null)

	// Drag-and-drop state (simple index swap)
	const [dragIndex, setDragIndex] = useState<number | null>(null)
	const [dropIndex, setDropIndex] = useState<number | null>(null)

	const handleDragStart = (index: number) => setDragIndex(index)
	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault()
		setDropIndex(index)
	}
	const handleDrop = () => {
		if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
			setDragIndex(null)
			setDropIndex(null)
			return
		}
		const reordered = [...questions]
		const [moved] = reordered.splice(dragIndex, 1)
		reordered.splice(dropIndex, 0, moved)
		onReorder(reordered.map((q) => q.id))
		setDragIndex(null)
		setDropIndex(null)
	}

	// JSON file upload
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = (ev) => {
			try {
				const parsed = JSON.parse(ev.target?.result as string)
				const items: FlashQuestion[] = Array.isArray(parsed) ? parsed : parsed.questions
				if (!items || !Array.isArray(items)) throw new Error('Expected an array of questions')
				// Normalise: ensure each item has an id
				const normalised = items.map((q) => ({
					...q,
					id: q.id || uid(),
					text: String(q.text || '').trim(),
				})).filter((q) => q.text)
				onUploadList(normalised)
			} catch (err) {
				alert(`Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`)
			}
		}
		reader.readAsText(file)
		// Reset file input so the same file can be re-uploaded
		e.target.value = ''
	}

	const handleAddNew = () => {
		if (!newText.trim()) return
		const q: FlashQuestion = { id: uid(), text: newText.trim() }
		onUploadList([...questions, q])
		setNewText('')
		setAddingNew(false)
	}

	const handleFlashAdHoc = () => {
		if (!adHocText.trim()) return
		onFlashAdHoc(adHocText.trim(), adHocMeta)
		setAdHocText('')
	}

	return (
		<div className="flex flex-col gap-3 h-full">
			{/* ── Ad-hoc flash ─────────────────────────────────── */}
			<div className="rounded-xl border border-white/10 bg-white/5 p-3">
				<p className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide flex items-center gap-1.5">
					<Zap className="h-3.5 w-3.5 text-primary" />
					Flash message now
				</p>
				<div className="flex gap-2">
					<textarea
						rows={2}
						value={adHocText}
						onChange={(e) => setAdHocText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFlashAdHoc() }
						}}
						placeholder="Type a message to flash..."
						className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
					/>
					<button
						onClick={handleFlashAdHoc}
						disabled={!adHocText.trim()}
						className="self-end flex-shrink-0 h-9 px-3 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-black font-medium text-sm transition-colors flex items-center gap-1.5"
					>
						<Send className="h-3.5 w-3.5" />
					</button>
				</div>

				{/* Ad-hoc metadata */}
				<button
					onClick={() => setShowAdHocMeta((v) => !v)}
					className="mt-1.5 text-[11px] text-white/30 hover:text-white/60 flex items-center gap-1"
				>
					{showAdHocMeta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
					Options
				</button>
				{showAdHocMeta && (
					<div className="mt-2 grid grid-cols-3 gap-2">
						<div>
							<label className="block text-[10px] text-white/40 mb-1">Duration (s)</label>
							<input
								type="number" min={0} max={300}
								value={adHocMeta.duration ?? 0}
								onChange={(e) => setAdHocMeta((p) => ({ ...p, duration: Number(e.target.value) }))}
								className="w-full bg-[#111] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
								placeholder="0=∞"
							/>
						</div>
						<div>
							<label className="block text-[10px] text-white/40 mb-1">Position</label>
							<select
								value={adHocMeta.position ?? 'center'}
								onChange={(e) => setAdHocMeta((p) => ({ ...p, position: e.target.value as FlashQuestion['position'] }))}
								className="w-full bg-[#111] border border-white/10 rounded px-1 py-1 text-xs text-white focus:outline-none"
							>
								{POSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</div>
						<div>
							<label className="block text-[10px] text-white/40 mb-1">Font size</label>
							<select
								value={adHocMeta.fontSize ?? 'lg'}
								onChange={(e) => setAdHocMeta((p) => ({ ...p, fontSize: e.target.value as FlashQuestion['fontSize'] }))}
								className="w-full bg-[#111] border border-white/10 rounded px-1 py-1 text-xs text-white focus:outline-none"
							>
								{FONT_SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</div>
					</div>
				)}
			</div>

			{/* Dismiss for all (when flash is active) */}
			{isFlashActive && (
				<button
					onClick={onDismissForAll}
					className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-medium transition-colors"
				>
					✕ Dismiss flash for everyone
				</button>
			)}

			{/* ── Question list ─────────────────────────────────── */}
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
					Question List ({questions.length})
				</p>
				<div className="flex items-center gap-1.5">
					{/* Upload JSON */}
					<input
						ref={fileInputRef}
						type="file"
						accept=".json,application/json"
						className="hidden"
						onChange={handleFileUpload}
					/>
					<button
						onClick={() => fileInputRef.current?.click()}
						title="Upload JSON list"
						className="h-7 px-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors"
					>
						<Upload className="h-3 w-3" />
						JSON
					</button>
					{/* Add manually */}
					<button
						onClick={() => setAddingNew(true)}
						title="Add question"
						className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 hover:bg-primary/20 text-white/60 hover:text-primary flex items-center justify-center transition-colors"
					>
						<Plus className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			{/* Add new inline */}
			{addingNew && (
				<div className="flex gap-2">
					<input
						autoFocus
						type="text"
						value={newText}
						onChange={(e) => setNewText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleAddNew()
							if (e.key === 'Escape') { setNewText(''); setAddingNew(false) }
						}}
						placeholder="Question text..."
						className="flex-1 bg-[#111] border border-primary/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
					/>
					<button onClick={handleAddNew} className="px-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs"><Check className="h-4 w-4" /></button>
					<button onClick={() => { setNewText(''); setAddingNew(false) }} className="px-2 rounded-lg hover:bg-white/10 text-white/50 text-xs"><X className="h-4 w-4" /></button>
				</div>
			)}

			{/* List */}
			<div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
				{questions.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-24 text-white/30 text-sm text-center gap-1">
						<p>No questions yet.</p>
						<p className="text-xs">Upload a JSON file or add manually.</p>
					</div>
				) : (
					questions.map((q, i) => (
						<div
							key={q.id}
							draggable
							onDragStart={() => handleDragStart(i)}
							onDragOver={(e) => handleDragOver(e, i)}
							onDrop={handleDrop}
							onDragEnd={() => { setDragIndex(null); setDropIndex(null) }}
							className={`transition-opacity ${dragIndex === i ? 'opacity-40' : 'opacity-100'} ${dropIndex === i && dragIndex !== i ? 'ring-1 ring-primary/60 rounded-lg' : ''}`}
						>
							<QuestionRow
								question={q}
								index={i}
								onUpdate={onUpdateQuestion}
								onDelete={onDeleteQuestion}
								onFlash={onFlashQuestion}
							/>
						</div>
					))
				)}
			</div>

			{/* JSON format hint */}
			<details className="group">
				<summary className="text-[10px] text-white/20 cursor-pointer hover:text-white/40 select-none">JSON format</summary>
				<pre className="mt-1 p-2 bg-black/40 rounded text-[10px] text-white/40 overflow-x-auto">{`[
  {
    "text": "What is recursion?",
    "duration": 30,
    "position": "center",
    "fontSize": "lg"
  }
]`}</pre>
			</details>
		</div>
	)
}
