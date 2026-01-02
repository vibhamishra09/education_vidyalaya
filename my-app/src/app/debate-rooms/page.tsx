'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Users,
  Clock,
  MessageSquare,
  Loader2,
  Swords,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useDebateRooms, useCreateDebateRoom } from '@/hooks/use-debate-rooms';
import { useToast } from '@/contexts/toast-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DebateRoom,
  DebateStatus,
  TurnOrderType,
  DebateRoomFilters,
} from '@/types/debate.types';

export default function DebateRoomsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DebateStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const filters: DebateRoomFilters = {
    search: search || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    page,
    limit: 12,
  };

  const { data, isLoading, error } = useDebateRooms(filters);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMaxParticipants, setNewMaxParticipants] = useState(3);
  const [newTurnDuration, setNewTurnDuration] = useState(120);
  const [newPrepTime, setNewPrepTime] = useState(30);
  const [newTurnOrder, setNewTurnOrder] = useState<TurnOrderType>(TurnOrderType.FIFO);

  const createDebateRoom = useCreateDebateRoom();

  const handleCreate = async () => {
    if (!newTopic.trim()) {
      showError('Validation Error', 'Topic is required');
      return;
    }

    try {
      const room = await createDebateRoom.mutateAsync({
        topic: newTopic.trim(),
        description: newDescription.trim() || undefined,
        maxParticipants: newMaxParticipants,
        turnDurationSeconds: newTurnDuration,
        prepTimeSeconds: newPrepTime,
        turnOrder: newTurnOrder,
      });

      showSuccess('Debate Room Created', 'Your debate room has been created!');
      setIsCreateOpen(false);
      router.push(`/debate-rooms/${room.id}`);
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
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Swords className="h-8 w-8 text-primary" />
              Debate Rooms
            </h1>
            <p className="text-muted-foreground mt-1">
              Join structured debates and improve your argumentation skills
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Debate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max per Team</Label>
                    <Select
                      value={String(newMaxParticipants)}
                      onValueChange={(v) => setNewMaxParticipants(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? 'person' : 'people'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Turn Duration</Label>
                    <Select
                      value={String(newTurnDuration)}
                      onValueChange={(v) => setNewTurnDuration(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="90">1.5 minutes</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                        <SelectItem value="180">3 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prep Time</Label>
                    <Select
                      value={String(newPrepTime)}
                      onValueChange={(v) => setNewPrepTime(Number(v))}
                    >
                      <SelectTrigger>
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
                    <Label>Turn Order</Label>
                    <Select
                      value={newTurnOrder}
                      onValueChange={(v) => setNewTurnOrder(v as TurnOrderType)}
                    >
                      <SelectTrigger>
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
                  disabled={createDebateRoom.isPending || !newTopic.trim()}
                >
                  {createDebateRoom.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Debate'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search debates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as DebateStatus | 'ALL')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Debates</SelectItem>
              <SelectItem value={DebateStatus.WAITING}>Waiting</SelectItem>
              <SelectItem value={DebateStatus.PREP}>In Prep</SelectItem>
              <SelectItem value={DebateStatus.LIVE}>Live</SelectItem>
              <SelectItem value={DebateStatus.ENDED}>Ended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500">Failed to load debate rooms</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Debate Rooms Grid */}
        {data && (
          <>
            {!data.debateRooms || data.debateRooms.length === 0 ? (
              <div className="text-center py-12">
                <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No debates found</h3>
                <p className="text-muted-foreground mb-4">
                  {search || statusFilter !== 'ALL'
                    ? 'Try adjusting your filters'
                    : 'Be the first to create a debate!'}
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Debate
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.debateRooms.map((room) => (
                  <DebateRoomCard key={room.id} room={room} />
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

// Debate Room Card Component
function DebateRoomCard({ room }: { room: DebateRoom }) {
  const statusColors: Record<DebateStatus, string> = {
    [DebateStatus.WAITING]: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    [DebateStatus.PREP]: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    [DebateStatus.LIVE]: 'bg-green-500/10 text-green-600 border-green-500/30',
    [DebateStatus.ENDED]: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
    [DebateStatus.PROCESSED]: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    [DebateStatus.CANCELLED]: 'bg-red-500/10 text-red-600 border-red-500/30',
  };

  const statusLabels: Record<DebateStatus, string> = {
    [DebateStatus.WAITING]: 'Waiting',
    [DebateStatus.PREP]: 'Preparing',
    [DebateStatus.LIVE]: '🔴 Live',
    [DebateStatus.ENDED]: 'Ended',
    [DebateStatus.PROCESSED]: 'Processed',
    [DebateStatus.CANCELLED]: 'Cancelled',
  };

  const totalParticipants = room.teams.reduce(
    (sum, team) => sum + team.participants.length,
    0
  );

  const forTeam = room.teams.find((t) => t.side === 'FOR');
  const againstTeam = room.teams.find((t) => t.side === 'AGAINST');

  return (
    <Link href={`/debate-rooms/${room.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">{room.topic}</CardTitle>
            <Badge
              variant="outline"
              className={cn('shrink-0', statusColors[room.status])}
            >
              {statusLabels[room.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {room.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {room.description}
            </p>
          )}

          {/* Host */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={room.host.avatar || undefined} />
              <AvatarFallback className="text-xs">
                {room.host.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              Hosted by {room.host.name}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {totalParticipants}/{room.maxParticipants * 2}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{room.turnDurationSeconds}s turns</span>
            </div>
          </div>

          {/* Team sizes */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-600">
                FOR ({forTeam?.participants.length || 0})
              </span>
            </div>
            <span className="text-muted-foreground">vs</span>
            <div className="flex items-center gap-1 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-600">
                AGAINST ({againstTeam?.participants.length || 0})
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {new Date(room.createdAt).toLocaleDateString()}
            </span>
            <span className="text-sm text-primary flex items-center gap-1">
              View <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
