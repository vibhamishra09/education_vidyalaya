'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Loader2,
  Swords,
  ArrowLeft,
  X,
} from 'lucide-react';
import { DebateRoomCard } from '@/components/cards/debate-room-card';
import { useDebateRooms, useCreateDebateRoom } from '@/hooks/use-debate-rooms';
import { useCurrentUser } from '@/hooks/use-users';
import { useToast } from '@/contexts/toast-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DebateStatus,
  TurnOrderType,
  DebateRoomFilters,
} from '@/types/debate.types';

export default function DebateRoomsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'LIVE'>('ALL');
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [page, setPage] = useState(1);

  const filters: DebateRoomFilters = {
    search: search || undefined,
    // Backend accepts one status; keep LIVE server-side and apply SCHEDULED client-side.
    status: statusFilter === 'LIVE' ? DebateStatus.LIVE : undefined,
    page,
    limit: 12,
    trending: trendingOnly || undefined,
    sort: trendingOnly ? 'hybrid' : 'newest',
  };

  const { data, isLoading, error } = useDebateRooms(filters);
  const { data: currentUserData } = useCurrentUser();
  const filteredDebateRooms = useMemo(() => {
    const rooms = data?.debateRooms ?? [];
    // Hide ended/cancelled rooms from listing; users inside a room can still
    // see outcomes in-room without surfacing stale cards here.
    const visibleRooms = rooms.filter(
      (room) =>
        room.status === DebateStatus.WAITING ||
        room.status === DebateStatus.PREP ||
        room.status === DebateStatus.LIVE,
    );

    if (statusFilter === 'SCHEDULED') {
      return visibleRooms.filter(
        (room) =>
          room.status === DebateStatus.WAITING || room.status === DebateStatus.PREP,
      );
    }

    if (statusFilter === 'LIVE') {
      return visibleRooms.filter((room) => room.status === DebateStatus.LIVE);
    }

    return visibleRooms;
  }, [data?.debateRooms, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, trendingOnly]);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMaxParticipants, setNewMaxParticipants] = useState(3);
  const [newTurnDuration, setNewTurnDuration] = useState(120);
  const [newPrepTime, setNewPrepTime] = useState(30);
  const [newTurnOrder, setNewTurnOrder] = useState<TurnOrderType>(TurnOrderType.FIFO);
  const [newDebateDurationMinutes, setNewDebateDurationMinutes] = useState(60);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  /** "now" = open lobby with no fixed start; "scheduled" = require date + time */
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');

  // Keep date/time inputs in sync when switching modes
  useEffect(() => {
    if (scheduleMode === 'now') {
      setNewDate('');
      setNewTime('');
    }
  }, [scheduleMode]);

  const createDebateRoom = useCreateDebateRoom();

  const handleCreate = async () => {
    if (!newTopic.trim()) {
      showError('Validation Error', 'Topic is required');
      return;
    }

    if (scheduleMode === 'scheduled' && (!newDate || !newTime)) {
      showError('Validation Error', 'Choose both date and time when scheduling a start, or switch to “Start when ready”.');
      return;
    }

    const sessionMins = Math.round(Number(newDebateDurationMinutes));
    if (!Number.isFinite(sessionMins) || sessionMins < 5 || sessionMins > 24 * 60) {
      showError('Validation Error', 'Debate duration must be between 5 and 1440 minutes.');
      return;
    }

    const scheduledAt =
      scheduleMode === 'scheduled' && newDate && newTime
        ? `${newDate}T${newTime}:00`
        : undefined;

    try {
      const room = await createDebateRoom.mutateAsync({
        topic: newTopic.trim(),
        description: newDescription.trim() || undefined,
        maxParticipants: newMaxParticipants,
        turnDurationSeconds: newTurnDuration,
        prepTimeSeconds: newPrepTime,
        turnOrder: newTurnOrder,
        scheduledAt,
        debateDurationMinutes: sessionMins,
      });

      showSuccess('Debate Room Created', 'Your debate room has been created!');
      setIsCreateOpen(false);
      router.push(`/debateroom/${room.id}`);
    } catch (err) {
      console.error('Failed to create debate room:', err);
      showError('Error', 'Failed to create debate room. Please try again.');
    }
  };

  const resetForm = () => {
    setNewTopic('');
    setNewDescription('');
    setNewMaxParticipants(3);
    setNewTurnDuration(120);
    setNewPrepTime(30);
    setNewTurnOrder(TurnOrderType.FIFO);
    setNewDebateDurationMinutes(60);
    setNewDate('');
    setNewTime('');
    setScheduleMode('now');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-3 w-full">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted/40 hover:bg-green-500/10 hover:text-green-700 transition-all group w-fit border border-transparent hover:border-green-500/20"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-foreground flex items-center gap-2">
              <Swords className="h-7 w-7 text-green-500" />
              Debate Rooms
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
              Discover peers, study rooms, and debate rooms to learn and grow together
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border border-green-500/20 dark:text-green-400 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Debate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Debate Room</DialogTitle>
                <DialogDescription>
                  Set up a new debate topic and invite others to join.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Input
                    id="topic"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g., AI will replace most jobs in 10 years"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Optional context or rules for this debate..."
                    rows={3}
                  />
                </div>

                {/* When the debate should start (listing expiry uses scheduled time for WAITING rooms) */}
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div>
                    <Label htmlFor="debate-start-mode" className="text-base">
                      When should the debate start?
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose a fixed date and time so participants know when to show up, or open the room with no fixed start.
                    </p>
                  </div>
                  <select
                    id="debate-start-mode"
                    value={scheduleMode}
                    onChange={(e) =>
                      setScheduleMode(e.target.value === 'scheduled' ? 'scheduled' : 'now')
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="now">Start when ready — no fixed date/time</option>
                    <option value="scheduled">Schedule a specific date &amp; time</option>
                  </select>
                  {scheduleMode === 'scheduled' && (
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time">Time *</Label>
                        <Input
                          id="time"
                          type="time"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 pt-1 border-t border-border/60">
                    <Label htmlFor="debate-session-mins">Debate duration (minutes) *</Label>
                    <p className="text-xs text-muted-foreground">
                      Total planned session. With a scheduled start, the lobby expires from listings after start + this duration.
                    </p>
                    <Input
                      id="debate-session-mins"
                      type="number"
                      min={5}
                      max={1440}
                      step={1}
                      value={newDebateDurationMinutes}
                      onChange={(e) => setNewDebateDurationMinutes(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Per-turn speaking time (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="240"
                      step="1"
                      value={String(newTurnDuration / 60)}
                      onChange={(e) => setNewTurnDuration(Number(e.target.value) * 60)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants">Max per Team *</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      min="1"
                      max="6"
                      value={newMaxParticipants || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setNewMaxParticipants(0 as unknown as number);
                          return;
                        }
                        const num = parseInt(val, 10);
                        if (num >= 1 && num <= 6) {
                          setNewMaxParticipants(num);
                        }
                      }}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Only 1 to 6 participants per team allowed
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prepTime">Prep Time *</Label>
                    <Select
                      value={String(newPrepTime)}
                      onValueChange={(v) => setNewPrepTime(Number(v))}
                    >
                      <SelectTrigger id="prepTime">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="turnOrder">Turn Order *</Label>
                    <Select
                      value={newTurnOrder}
                      onValueChange={(v) => setNewTurnOrder(v as TurnOrderType)}
                    >
                      <SelectTrigger id="turnOrder">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TurnOrderType.FIFO}>
                          First In First Out
                        </SelectItem>
                        <SelectItem value={TurnOrderType.RANDOM}>
                          Random
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={
                    createDebateRoom.isPending ||
                    !newTopic.trim() ||
                    (scheduleMode === 'scheduled' && (!newDate || !newTime)) ||
                    !Number.isFinite(Number(newDebateDurationMinutes)) ||
                    Number(newDebateDurationMinutes) < 5 ||
                    Number(newDebateDurationMinutes) > 24 * 60
                  }
                >
                  {createDebateRoom.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    scheduleMode === 'scheduled' ? 'Schedule debate' : 'Create now'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters & Search Container */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between sticky top-0 z-30 bg-background/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-border/40">
          {/* Search Bar */}
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-4 w-4 group-focus-within:text-green-600 transition-colors" />
            <Input
              type="text"
              placeholder="Search debates by topic..."
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                const sanitized = val.replace(/[^a-zA-Z0-9 \-.,/']/g, "");
                setSearch(sanitized);
              }}
              onKeyDown={(e) => {
                const allowedSpecialKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape', 'Home', 'End'];
                if (allowedSpecialKeys.includes(e.key)) return;
                if (e.key.length === 1 && !/^[a-zA-Z0-9 \-.,/']$/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              className="pl-10 h-11 w-full rounded-2xl border-muted bg-muted/20 focus-visible:ring-green-500/20 focus-visible:border-green-500/30 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'ALL' | 'SCHEDULED' | 'LIVE')}
          >
            <SelectTrigger className="w-[180px] h-11 rounded-2xl border-muted bg-muted/20">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All debates</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value={DebateStatus.LIVE}>Live</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={trendingOnly ? 'default' : 'outline'}
            className={cn(
              "h-11 rounded-2xl",
              trendingOnly
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "border-muted bg-muted/20"
            )}
            onClick={() => setTrendingOnly((prev) => !prev)}
          >
            {trendingOnly ? 'Trending: On' : 'Trending: Off'}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-full">
                <div className="border rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-10">
            <div className="max-w-md mx-auto border rounded-xl bg-card p-6 shadow-sm text-center">
              <p className="text-muted-foreground mb-4">
                Failed to load debate rooms. Please try again later.
              </p>
              <Button 
                variant="default"
                onClick={() => window.location.reload()}
                className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 shadow-none"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Debate Rooms Grid */}
        {data && !isLoading && (
          <>
            {filteredDebateRooms.length === 0 ? (
              <div className="py-10">
                <div className="max-w-md mx-auto border rounded-xl bg-card p-6 shadow-sm text-center">
                  <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No debates found</h3>
                  <p className="text-muted-foreground mb-4">
                    {search || statusFilter !== 'ALL'
                      ? 'Try adjusting your filters'
                      : 'Be the first to create a debate!'}
                  </p>
                  <Button 
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 shadow-none"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Debate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDebateRooms.map((room) => (
                  <DebateRoomCard
                    key={room.id}
                    room={room}
                    currentUserId={currentUserData?.user?.id ?? null}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
