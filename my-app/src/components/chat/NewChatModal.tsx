'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, X, Loader2, MessageCircle, UserPlus } from 'lucide-react'
import apiClient from '@/lib/api-client'

interface SearchUser {
  id: string
  name: string
  avatar: string | null
  bio: string | null
}

interface NewChatModalProps {
  open: boolean
  onClose: () => void
  onSelectUser: (userId: string) => void
  isCreating: boolean
}

export function NewChatModal({ open, onClose, onSelectUser, isCreating }: NewChatModalProps) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Initial load + debounced search
  useEffect(() => {
    if (!open) {
      setSearch('')
      setUsers([])
      setSelectedUserId(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      let cancelled = false
      async function fetchUsers() {
        setLoading(true)
        try {
          const res = await apiClient.get('/api/users-search', {
            params: { q: search.trim(), limit: 25 },
          })
          if (cancelled) return
          setUsers(Array.isArray(res.data) ? res.data : [])
        } catch {
          if (!cancelled) setUsers([])
        } finally {
          if (!cancelled) setLoading(false)
        }
      }
      fetchUsers()
      return () => { cancelled = true }
    }, search ? 300 : 0)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [open, search])

  // Focus input when modal opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const handleSelect = (userId: string) => {
    setSelectedUserId(userId)
    onSelectUser(userId)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative top gradient */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/5 via-secondary/3 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md shadow-primary/20">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">New Conversation</h3>
                <p className="text-[11px] text-gray-500">Find someone to message</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative px-6 pb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/80 py-2.5 pl-10 pr-4 text-[13px] text-gray-900 placeholder:text-gray-400 transition-all focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

          {/* User list */}
          <div className="max-h-[50vh] overflow-y-auto px-3 py-2 scroll-smooth">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-8 w-8 border-[2.5px] border-gray-200 border-t-primary rounded-full animate-spin" />
                <p className="mt-3 text-[12px] text-gray-400">Searching users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <Search className="h-6 w-6 text-gray-300" />
                </div>
                <p className="mt-3 text-[13px] font-medium text-gray-500">
                  {search ? 'No users found' : 'Start typing to search'}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  {search ? 'Try a different name' : 'Find people on Webyalaya'}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {users.map((user) => {
                  const isSelected = selectedUserId === user.id
                  const isProcessing = isSelected && isCreating
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelect(user.id)}
                      disabled={isCreating}
                      className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 disabled:opacity-50 ${
                        isProcessing
                          ? 'bg-primary/5'
                          : 'hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-white shadow-sm">
                        <AvatarImage src={user.avatar || undefined} alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/70 to-secondary/70 text-[13px] font-bold text-white">
                          {(user.name?.charAt(0) || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{user.name}</p>
                        {user.bio && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5 leading-snug">{user.bio}</p>
                        )}
                      </div>
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                      ) : (
                        <div className="flex h-7 items-center rounded-full bg-primary/8 px-3 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          <MessageCircle className="mr-1 h-3 w-3" />
                          Chat
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
