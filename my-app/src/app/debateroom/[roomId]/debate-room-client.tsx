'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Users,
  Clock,
  Play,
  LogOut,
  Trash2,
  Loader2,
  Swords,
  Crown,
  Shield,
  Calendar,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/contexts/toast-context';
import { cn } from '@/lib/utils';
import {
  useDebateRoomDetails,
  useJoinDebateRoom,
  useLeaveDebateRoom,
  useCancelDebateRoom,
  useStartPrepPhase,
  useDebateLivekitToken,
  useDebateResults,
  useGenerateResults,
  useUpdateDebateRoom,
} from '@/hooks/use-debate-rooms';
import { useDebateSocket } from '@/hooks/use-debate-socket';
import {
  DebateStatus,
  DebateSide,
  TurnOrderType,
  getUserDebateRole,
  getUserTeamSide,
  estimateDebateSessionMinutes,
} from '@/types/debate.types';
import {
  DebateTeamsDisplay,
  DebateTurnTimer as _DebateTurnTimer,
  PrepCountdown as _PrepCountdown,
  DebateBuzzer as _DebateBuzzer,
  DebateTeamChat as _DebateTeamChat,
  DebateResultsDisplay,
} from '@/components/debate';
import { ShareButton } from '@/components/share/share-button';
import { extractHttpErrorMessage } from '@/lib/utils/error-handling';
import { BypassModal } from '@/components/spamguard/dialog';
import { SpamShield } from '@/components/spamguard/spamguard';
import { useCallback } from 'react';

interface DebateRoomClientProps {
  roomId: string;
}

/** Last instant users can join: lobby slot end (backend: scheduledAt + debateDurationMinutes). */
function getDebateJoinDeadline(room: {
  debateSlotEndsAt?: string | null;
  scheduledAt?: string | null;
  debateDurationMinutes?: number;
}): Date | null {
  if (room.debateSlotEndsAt) return new Date(room.debateSlotEndsAt);
  if (room.scheduledAt) {
    const start = new Date(room.scheduledAt);
    const mins = room.debateDurationMinutes ?? 60;
    return new Date(start.getTime() + mins * 60_000);
  }
  return null;
}

// Simple inline timer component for status display
function TurnTimerDisplay({
  turnDurationSeconds,
  turnStartedAt,
}: {
  turnDurationSeconds: number;
  turnStartedAt: string;
}) {
  const [timeRemaining, setTimeRemaining] = useState(turnDurationSeconds);

  useEffect(() => {
    if (!turnStartedAt) {
      setTimeRemaining(turnDurationSeconds);
      return;
    }

    const updateTimer = () => {
      const startTime = new Date(turnStartedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, turnDurationSeconds - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [turnStartedAt, turnDurationSeconds]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isCritical = timeRemaining <= 10;

  return (
    <div className="text-right">
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <Clock className={cn('h-3.5 w-3.5', isCritical && 'text-red-500 animate-pulse')} />
          <span
            className={cn(
              'text-lg font-mono font-bold tabular-nums',
              isCritical && 'text-red-500'
            )}
          >
            {formattedTime}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Time Remaining</span>
      </div>
    </div>
  );
}

// Prep phase timer component
function PrepTimerDisplay({ secondsRemaining: initialSeconds }: { secondsRemaining: number }) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    // Reset when prop changes
    setSecondsRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isCritical = secondsRemaining <= 30; // Show warning when less than 30 seconds

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <Clock className={cn('h-5 w-5 text-blue-600', isCritical && 'text-orange-500 animate-pulse')} />
        <span
          className={cn(
            'text-3xl font-mono font-bold tabular-nums',
            isCritical ? 'text-orange-500' : 'text-blue-600'
          )}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
}

export default function DebateRoomClient({ roomId }: DebateRoomClientProps) {
  const router = useRouter();
  const { user } = useUser();
  const { getToken: _getToken } = useAuth();
  const { showSuccess, showError } = useToast();

  // State
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTopic, setEditTopic] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxPerTeam, setEditMaxPerTeam] = useState(3);
  const [editTurnDuration, setEditTurnDuration] = useState(120);
  const [editPrepTime, setEditPrepTime] = useState(30);
  const [editTurnOrder, setEditTurnOrder] = useState<TurnOrderType>(TurnOrderType.FIFO);
  const [selectedSide, setSelectedSide] = useState<DebateSide | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calculatedPrepCountdown, setCalculatedPrepCountdown] = useState<number | null>(null);
  const [spamRegistry, setSpamRegistry] = useState<Record<string, { isSafe: boolean, isVerifying: boolean }>>({});
  const isAnythingSpam = Object.values(spamRegistry).some(s => !s.isSafe);
  const isAnythingVerifying = Object.values(spamRegistry).some(s => s.isVerifying);
  const [showBypassDialog, setShowBypassDialog] = useState(false);

  // Queries
  const { data: room, isLoading, error, refetch } = useDebateRoomDetails(roomId);
  const { data: livekitData } = useDebateLivekitToken(
    roomId,
    room?.status === DebateStatus.LIVE || room?.status === DebateStatus.PREP
  );
  const { data: results } = useDebateResults(
    roomId,
    room?.status === DebateStatus.ENDED || room?.status === DebateStatus.PROCESSED
  );

  // Debug logging for LiveKit data
  useEffect(() => {
    if (livekitData) {
      console.log('[DebateRoomClient] LiveKit data received:', {
        hasToken: !!livekitData.token,
        tokenLength: livekitData.token?.length || 0,
        tokenPreview: livekitData.token ? `${livekitData.token.substring(0, 50)}...` : 'MISSING',
        serverUrl: livekitData.serverUrl || 'MISSING',
        serverUrlType: typeof livekitData.serverUrl,
      });
    } else {
      console.log('[DebateRoomClient] LiveKit data is null or undefined');
    }
  }, [livekitData]);

  // Mutations
  const joinDebateRoom = useJoinDebateRoom();
  const leaveDebateRoom = useLeaveDebateRoom();
  const cancelDebateRoom = useCancelDebateRoom();
  const startPrepPhase = useStartPrepPhase();
  const generateResults = useGenerateResults();
  const updateDebateRoom = useUpdateDebateRoom(roomId);

  // Get user's role and team
  const userRole = room && user ? getUserDebateRole(room, user.id) : null;
  const userSide = room && user ? getUserTeamSide(room, user.id) : null;
  const isHost = userRole === 'host';
  const isModerator = userRole === 'host' || userRole === 'moderator';
  const isParticipant = userRole === 'participant';

  // Socket connection for real-time updates
  const {
    isConnected,
    debateState,
    teamChatMessages: _teamChatMessages,
    buzzerQueue: _buzzerQueue,
    prepCountdown,
    joinRoom: socketJoinRoom,
    pressBuzzer: _pressBuzzer,
    sendTeamChat: _sendTeamChat,
    advanceTurn: _advanceTurn,
    endDebate: _endDebate,
  } = useDebateSocket({
    roomId,
    enabled: !!room && room.status !== DebateStatus.CANCELLED,
    onDebateEnded: () => {
      refetch();
      showSuccess('Debate Ended', 'The debate has ended!');
    },
    onParticipantJoined: (event) => {
      showSuccess('Participant Joined', `${event.name} joined the debate`);
    },
    onParticipantLeft: (_event) => {
      showSuccess('Participant Left', `A participant left the debate`);
    },
    onMicEnabled: (event) => {
      // Mic control hook will handle this
      console.log('[DebateRoomClient] Mic enabled:', event);
    },
    onMicDisabled: (event) => {
      // Mic control hook will handle this
      console.log('[DebateRoomClient] Mic disabled:', event);
    },
  });

  // Join socket room when connected
  useEffect(() => {
    if (isConnected && room) {
      socketJoinRoom();
    }
  }, [isConnected, room, socketJoinRoom]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate prep countdown from prepEndTime if socket countdown is not available
  useEffect(() => {
    if (room?.status === DebateStatus.PREP && debateState?.prepEndTime) {
      const updateCountdown = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((debateState.prepEndTime! - now) / 1000));
        setCalculatedPrepCountdown(remaining);
        
        // If countdown reaches 0, refetch room to get updated status
        if (remaining <= 0) {
          setTimeout(() => refetch(), 500); // Small delay to ensure backend has updated
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else if (room?.status !== DebateStatus.PREP) {
      setCalculatedPrepCountdown(null);
    }
  }, [room?.status, debateState?.prepEndTime, refetch]);

  // Find current speaker
  const currentSpeakerId = debateState?.currentSpeakerId || room?.currentSpeakerId;
  const currentSpeaker = currentSpeakerId && room
    ? room.teams
        .flatMap((t) => t.participants)
        .find((p) => p.user.clerkId === currentSpeakerId)
    : null;
  const currentSpeakerTeam = currentSpeaker && room
    ? room.teams.find((t) => t.participants.some((p) => p.id === currentSpeaker.id))
    : null;

  // Handlers
  const handleJoin = async (side?: DebateSide) => {
    try {
      await joinDebateRoom.mutateAsync({
        roomId,
        preferredSide: side || selectedSide || undefined,
      });
      showSuccess('Joined!', `You joined the debate`);
      setSelectedSide(null);
    } catch (err: unknown) {
      showError('Failed to Join', err instanceof Error ? err.message : 'Could not join the debate');
    }
  };

  const handleLeave = async () => {
    try {
      await leaveDebateRoom.mutateAsync(roomId);
      showSuccess('Left Debate', 'You have left the debate');
      setShowLeaveDialog(false);
    } catch (err: unknown) {
      showError('Error', err instanceof Error ? err.message : 'Failed to leave debate');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelDebateRoom.mutateAsync(roomId);
      showSuccess('Debate Cancelled', 'The debate has been cancelled');
      setShowCancelDialog(false);
      router.push('/debateroom');
    } catch (err: unknown) {
      showError('Error', err instanceof Error ? err.message : 'Failed to cancel debate');
    }
  };

  const handleStartPrep = async () => {
    try {
      await startPrepPhase.mutateAsync(roomId);
      showSuccess('Prep Phase Started', 'Preparation time has begun!');
    } catch (err: unknown) {
      showError('Error', err instanceof Error ? err.message : 'Failed to start prep phase');
    }
  };

  const handleGenerateResults = async () => {
    try {
      await generateResults.mutateAsync(roomId);
      showSuccess('Results Generated', 'Judge reviews have been aggregated successfully.');
    } catch (err: unknown) {
      showError('Error', err instanceof Error ? err.message : 'Failed to generate results');
    }
  };

  useEffect(() => {
    if (!editOpen || !room) return;
    setEditTopic(room.topic);
    setEditDescription(room.description ?? '');
    setEditMaxPerTeam(room.maxParticipants);
    setEditTurnDuration(room.turnDurationSeconds);
    setEditPrepTime(room.prepTimeSeconds);
    setEditTurnOrder(room.turnOrder);
  }, [editOpen, room]);

    const preSubmit = () => {
      if(isAnythingSpam){
      setShowBypassDialog(true)
      return
      }
      

		handleSaveEdits()
    }
  
  const handleSpamChange = useCallback((field: string, status: { isSafe: boolean; isVerifying: boolean }) => {
    setSpamRegistry((prev) => {
      const current = prev[field];
      if (current && current.isSafe === status.isSafe && current.isVerifying === status.isVerifying) {
      return prev; 
      }
      
      return { ...prev, [field]: status };
    });
    }, []);
  const handleSaveEdits = async () => {
    setShowBypassDialog(false)
    if (!editTopic.trim()) {
      showError('Validation', 'Topic is required');
      return;
    }
    const max = Math.round(Math.min(10, Math.max(1, Number(editMaxPerTeam))));
    const turnSec = Math.round(Math.min(600, Math.max(30, Number(editTurnDuration))));
    const prepSec = Math.round(Math.min(120, Math.max(10, Number(editPrepTime))));
    if (!Number.isFinite(max) || !Number.isFinite(turnSec) || !Number.isFinite(prepSec)) {
      showError('Validation', 'Please enter valid numbers');
      return;
    }
    try {
      await updateDebateRoom.mutateAsync({
        topic: editTopic.trim(),
        description: editDescription.trim() || undefined,
        maxParticipants: max,
        turnDurationSeconds: turnSec,
        prepTimeSeconds: prepSec,
        turnOrder: editTurnOrder,
      });
      showSuccess('Updated', 'Changes saved.');
      setEditOpen(false);
      void refetch();
    } catch (err: unknown) {
      showError(
        'Update failed',
        extractHttpErrorMessage(err, 'Could not update debate room'),
      );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Swords className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Debate Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This debate room doesn&apos;t exist or has been cancelled.
            </p>
            <Link href="/debateroom">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Debates
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Status display
  const statusConfig: Record<DebateStatus, { color: string; label: string }> = {
    [DebateStatus.WAITING]: { color: 'bg-yellow-500', label: 'Waiting for Participants' },
    [DebateStatus.PREP]: { color: 'bg-blue-500', label: 'Preparation Phase' },
    [DebateStatus.LIVE]: { color: 'bg-green-500 animate-pulse', label: 'Live' },
    [DebateStatus.ENDED]: { color: 'bg-gray-500', label: 'Ended' },
    [DebateStatus.PROCESSED]: { color: 'bg-purple-500', label: 'Results Ready' },
    [DebateStatus.CANCELLED]: { color: 'bg-red-500', label: 'Cancelled' },
  };

  const totalParticipants = room.teams.reduce(
    (sum, team) => sum + team.participants.length,
    0
  );
  
  // Check if both teams have at least 1 participant
  const forTeam = room.teams.find(t => t.side === DebateSide.FOR);
  const againstTeam = room.teams.find(t => t.side === DebateSide.AGAINST);
  const forCount = forTeam?.participants.length || 0;
  const againstCount = againstTeam?.participants.length || 0;
  const bothTeamsHaveParticipants = forCount >= 1 && againstCount >= 1;
  
  const scheduledTime = room.scheduledAt ? new Date(room.scheduledAt) : null;
  const now = new Date();
  const joinDeadline = getDebateJoinDeadline(room);
  const isJoinWindowClosed = joinDeadline ? now > joinDeadline : false;
  const canJoin = !isJoinWindowClosed && room.status === DebateStatus.WAITING;
  
  // Can start only if both teams have participants
  const canStart = bothTeamsHaveParticipants;
  
  // Check if user is the only moderator
  const isOnlyModerator = isModerator && room.moderators.length === 1;

  const hostCanEditRoomSettings =
    isHost &&
    room.status !== DebateStatus.ENDED &&
    room.status !== DebateStatus.PROCESSED &&
    room.status !== DebateStatus.CANCELLED;

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10 selection:text-primary">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl relative z-10">
        {/* Back Button */}
        <Link href="/debateroom" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Debates
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={room.status === DebateStatus.LIVE || room.status === DebateStatus.PREP ? "destructive" : "secondary"}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium shadow-none border-transparent bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {room.status === DebateStatus.LIVE || room.status === DebateStatus.PREP ? (
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                      </span>
                      {room.status === DebateStatus.PREP ? 'Preparation Phase' : 'Live Now'}
                    </span>
                  ) : (
                    statusConfig[room.status].label
                  )}
                </Badge>
                
                {isHost && (
                  <Badge className="rounded-full px-2.5 py-0.5 text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 shadow-none border-transparent">
                    <Crown className="h-3 w-3 mr-1" />
                    Host
                  </Badge>
                )}
                {isModerator && !isHost && (
                  <Badge className="rounded-full px-2.5 py-0.5 text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 shadow-none border-transparent">
                    <Shield className="h-3 w-3 mr-1" />
                    Moderator
                  </Badge>
                )}
                {isParticipant && (
                  <Badge className="rounded-full px-2.5 py-0.5 text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none border-transparent">
                    Enrolled
                  </Badge>
                )}
                {!isHost && room.hostDetailsUpdatedAt && (
                  <Badge
                    variant="outline"
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold border-amber-500/40 text-amber-800 dark:text-amber-200 bg-amber-500/10"
                  >
                    Edited
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight flex-1 min-w-0">
                  {room.topic}
                </h1>
                {hostCanEditRoomSettings && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-full border-dashed"
                    aria-label="Edit debate (host)"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                    Edit
                  </Button>
                )}
              </div>
          
              {room.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {room.description}
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {room.scheduledAt && (
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3 transition-colors hover:bg-blue-500/10">
                    <div className="p-2 rounded-lg bg-background shadow-sm border border-border/50">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Scheduled</p>
                      <p className="text-sm font-semibold">{new Date(room.scheduledAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3 transition-colors hover:bg-blue-500/10">
                  <div className="p-2 rounded-lg bg-background shadow-sm border border-border/50">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Turn Duration</p>
                    <p className="text-sm font-semibold">{room.turnDurationSeconds}s per turn</p>
                  </div>
                </div>
              </div>

              {/* Host Info */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage src={room.host.avatar || undefined} />
                  <AvatarFallback>{room.host.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Hosted by</p>
                  <span className="text-sm font-semibold">{room.host.name}</span>
                </div>
              </div>

              {/* Connection status */}
              {isConnected !== undefined && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  <span className="text-muted-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              )}
            </div>

            {/* Live Status Card - Time, Status, Current Speaker */}
            {(room.status === DebateStatus.LIVE || 
              room.status === DebateStatus.PREP || 
              (room.status === DebateStatus.WAITING && currentSpeaker)) && (
              <Card className="border-primary/20 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Live Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Time */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Current Time</span>
                    </div>
                    <span className="text-lg font-mono font-semibold">
                      {currentTime.toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Debate Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          room.status === DebateStatus.LIVE && 'bg-green-500 animate-pulse',
                          room.status === DebateStatus.PREP && 'bg-blue-500',
                          room.status === DebateStatus.WAITING && 'bg-yellow-500'
                        )}
                      />
                      <span className="text-sm font-medium text-muted-foreground">Status</span>
                    </div>
                    <Badge
                      variant={
                        room.status === DebateStatus.LIVE
                          ? 'default'
                          : room.status === DebateStatus.PREP
                          ? 'secondary'
                          : 'outline'
                      }
                      className={cn(
                        room.status === DebateStatus.LIVE && 'bg-green-600 hover:bg-green-700',
                        room.status === DebateStatus.PREP && 'bg-blue-600 hover:bg-blue-700'
                      )}
                    >
                      {statusConfig[room.status].label}
                    </Badge>
                  </div>

                  {/* Current Speaker */}
                  {currentSpeaker && currentSpeakerTeam && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Current Speaker</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            currentSpeakerTeam.side === DebateSide.FOR
                              ? 'border-green-500/30 text-green-600 bg-green-500/10'
                              : 'border-red-500/30 text-red-600 bg-red-500/10'
                          )}
                        >
                          {currentSpeakerTeam.side}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                          <AvatarImage src={currentSpeaker.user.avatar || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            {currentSpeaker.user.name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-base">{currentSpeaker.user.name}</p>
                          <p className="text-xs text-muted-foreground">Team {currentSpeakerTeam.side}</p>
                        </div>
                        {debateState?.turnStartedAt && room.status === DebateStatus.LIVE && (
                          <TurnTimerDisplay
                            turnDurationSeconds={room.turnDurationSeconds}
                            turnStartedAt={debateState.turnStartedAt}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prep Phase Timer */}
                  {room.status === DebateStatus.PREP && (prepCountdown !== null || calculatedPrepCountdown !== null) && (
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">Preparation Time</span>
                        </div>
                        <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/10">
                          PREP PHASE
                        </Badge>
                      </div>
                      <PrepTimerDisplay secondsRemaining={prepCountdown ?? calculatedPrepCountdown ?? 0} />
                      <p className="text-xs text-blue-600/80 mt-2 text-center">
                        Discuss strategy with your team
                      </p>
                    </div>
                  )}

                  {/* Turn Timer (when no speaker but debate is live) */}
                  {!currentSpeaker && room.status === DebateStatus.LIVE && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground text-center">
                        Waiting for next speaker
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Main Content */}
            {/* Results View */}
            {(room.status === DebateStatus.ENDED ||
              room.status === DebateStatus.PROCESSED) &&
              results && (
                <DebateResultsDisplay
                  results={results}
                  currentUserId={user?.id}
                />
              )}

            {/* Generate Results Button (for moderators) */}
            {room.status === DebateStatus.ENDED && isModerator && !results && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="mb-4">
                    The debate has ended. Generate results from judges&apos; reviews?
                  </p>
                  <Button
                    onClick={handleGenerateResults}
                    disabled={generateResults.isPending}
                  >
                    {generateResults.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Results'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Teams Display */}
            {room.status === DebateStatus.WAITING && (
              <DebateTeamsDisplay
                teams={room.teams}
                currentSpeakerId={room.currentSpeakerId}
                maxParticipants={room.maxParticipants}
                currentUserId={user?.id}
              />
            )}

            {/* Join Options (for non-participants in WAITING status) */}
            {room.status === DebateStatus.WAITING && !isParticipant && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {isModerator ? 'Join as Participant' : 'Join this Debate'}
                  </CardTitle>
                  <CardDescription>
                    {isJoinWindowClosed ? (
                      <span className="text-red-500">
                        The lobby join period has ended (scheduled window + debate duration). Joining is no longer available.
                      </span>
                    ) : isOnlyModerator ? (
                      <span className="text-amber-500">
                        You are the only moderator. At least one moderator must remain.
                      </span>
                    ) : isModerator ? (
                      'As a moderator, you can join a team to participate'
                    ) : (
                      'Choose a team to join or let us assign you automatically'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Show join buttons only if joining is allowed */}
                  {canJoin && !isOnlyModerator && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          className="h-20 border-green-500/30 hover:bg-green-500/10"
                          onClick={() => handleJoin(DebateSide.FOR)}
                          disabled={joinDebateRoom.isPending}
                        >
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              <span className="font-bold text-green-600">FOR</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Support the topic
                            </span>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-20 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => handleJoin(DebateSide.AGAINST)}
                          disabled={joinDebateRoom.isPending}
                        >
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <span className="font-bold text-red-600">AGAINST</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Oppose the topic
                            </span>
                          </div>
                        </Button>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            or
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleJoin()}
                        disabled={joinDebateRoom.isPending}
                        className="w-full"
                      >
                        {joinDebateRoom.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          <>
                            {isModerator && <Shield className="h-4 w-4 mr-2" />}
                            {isModerator ? 'Join as Participant' : 'Auto-assign me to a team'}
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {/* Show warning when joining is not allowed */}
                  {(isJoinWindowClosed || isOnlyModerator) && (
                    <div className="text-center py-4">
                      <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {isJoinWindowClosed
                          ? 'Joining is closed after the lobby window (start + debate duration)'
                          : 'You cannot join as participant while being the only moderator'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Enter Debate Room Button (for WAITING/LIVE/PREP) - Below team selection */}
            {(room.status === DebateStatus.WAITING || 
              room.status === DebateStatus.LIVE || 
              room.status === DebateStatus.PREP) && (
              <Card>
                <CardHeader>
                  <CardTitle>Enter Debate Room</CardTitle>
                  <CardDescription>
                    {room.status === DebateStatus.WAITING
                      ? 'Enter the debate room to join the video call and wait for the debate to start.'
                      : room.status === DebateStatus.PREP 
                      ? 'Preparation phase is active. Join to prepare with your team.'
                      : 'The debate is live. Join to participate or watch.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Calculate time until scheduled time
                    const scheduledTime = room.scheduledAt ? new Date(room.scheduledAt) : null;
                    const now = new Date();
                    const minutesUntilScheduled = scheduledTime 
                      ? Math.max(0, Math.floor((scheduledTime.getTime() - now.getTime()) / (1000 * 60)))
                      : null;
                    
                    // Check if host has joined (host should be in moderators list with isHost flag)
                    const hostHasJoined = room.moderators.some(mod => mod.isHost);
                    
                    // For participants: must have chosen a team AND host must have joined
                    const canEnterAsParticipant = isParticipant && userSide !== null && hostHasJoined;
                    
                    // For host: can enter only if 5 minutes or less remain until scheduled time
                    const canEnterAsHost = isHost && (
                      scheduledTime === null || // No scheduled time means can enter anytime
                      minutesUntilScheduled !== null && minutesUntilScheduled <= 5
                    );
                    
                    // For moderators (non-host): can enter if host has joined
                    const canEnterAsModerator = isModerator && !isHost && hostHasJoined;
                    
                    // For non-participants: can enter if host has joined
                    const canEnterAsViewer = !isParticipant && !isModerator && hostHasJoined;
                    
                    const canEnter = canEnterAsParticipant || canEnterAsHost || canEnterAsModerator || canEnterAsViewer;
                    
                    // Determine disabled reason
                    let disabledReason = '';
                    if (!canEnter) {
                      if (isParticipant && userSide === null) {
                        disabledReason = 'Please choose a team (FOR or AGAINST) first';
                      } else if (isParticipant && !hostHasJoined) {
                        disabledReason = 'Waiting for host to join the debate room';
                      } else if (isHost && scheduledTime && minutesUntilScheduled !== null && minutesUntilScheduled > 5) {
                        disabledReason = `Host can enter only when 5 minutes or less remain (${minutesUntilScheduled} minutes remaining)`;
                      } else if (!hostHasJoined) {
                        disabledReason = 'Waiting for host to join the debate room';
                      }
                    }
                    
                    return (
                      <>
                        <Button
                          className="w-full font-semibold text-sm h-10 shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => {
                            router.push(`/rooms/debateroom/${roomId}`);
                          }}
                          disabled={!canEnter}
                        >
                          <Play className="h-3.5 w-3.5 mr-2" />
                          Enter Debate Room
                        </Button>
                        {!canEnter && disabledReason && (
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            {disabledReason}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          </div>

          {/* Right Column: Action Card & Status */}
          <div className="lg:col-span-1 space-y-4">
            <div className="sticky top-20 space-y-4">
              <Card className="border-border/50 shadow-lg shadow-primary/5 overflow-hidden backdrop-blur-sm bg-background/80 relative">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-blue-500" />
                <CardHeader className="space-y-1 pb-3 pt-5 px-5">
                  <CardTitle className="flex justify-between items-center text-base">
                    <span>Debate Details</span>
                    <Badge variant={totalParticipants >= room.maxParticipants * 2 ? "destructive" : "secondary"} className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5">
                      {totalParticipants >= room.maxParticipants * 2 ? 'Full' : 'Open'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                      <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                        <Users className="h-3.5 w-3.5 mr-2" />
                        <span>Participants</span>
                      </div>
                      <span className="font-medium font-mono">{totalParticipants} / {room.maxParticipants * 2}</span>
                    </div>
                    
                    {forTeam && againstTeam && (
                      <>
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                          <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                            <span>Team FOR</span>
                          </div>
                          <span className="font-medium font-mono">{forTeam.participants.length} / {room.maxParticipants}</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                          <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                            <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                            <span>Team AGAINST</span>
                          </div>
                          <span className="font-medium font-mono">{againstTeam.participants.length} / {room.maxParticipants}</span>
                        </div>
                      </>
                    )}

                    {userSide && (
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                        <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                          {isHost && <Crown className="h-3.5 w-3.5 mr-2 text-yellow-500" />}
                          {isModerator && !isHost && <Shield className="h-3.5 w-3.5 mr-2 text-blue-500" />}
                          <span>Your Role</span>
                        </div>
                        <span className="font-medium capitalize">{userRole}</span>
                      </div>
                    )}

                    {userSide && (
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                        <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full mr-2',
                              userSide === DebateSide.FOR
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            )}
                          />
                          <span>Your Team</span>
                        </div>
                        <span className="font-medium">{userSide}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 space-y-2.5">
                {/* Scheduled start + join-until (lobby = start + debate duration) */}
                {joinDeadline && room.status === DebateStatus.WAITING && (
                  <div
                    className={cn(
                      'p-2 rounded-md text-xs mb-2',
                      isJoinWindowClosed
                        ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                        : scheduledTime && now > scheduledTime
                          ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
                    )}
                  >
                    {scheduledTime && (
                      <p className="mb-1 opacity-90">
                        <span className="font-medium">Scheduled start: </span>
                        {scheduledTime.toLocaleString()}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mb-0.5">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="font-medium">
                        {isJoinWindowClosed
                          ? 'Join period ended'
                          : 'Join open until:'}
                      </span>
                    </div>
                    <span>{joinDeadline.toLocaleString()}</span>
                    {isJoinWindowClosed && (
                      <p className="mt-1 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        Joining is no longer available
                      </p>
                    )}
                  </div>
                )}

                    {/* Host/Moderator actions */}
                    {isModerator && room.status === DebateStatus.WAITING && (
                      <>
                        <Button
                          size="default"
                          className="w-full font-semibold text-sm h-10 shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-lg bg-green-600 hover:bg-green-700 text-white"
                          onClick={handleStartPrep}
                          disabled={!canStart || startPrepPhase.isPending}
                        >
                          {startPrepPhase.isPending ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 mr-2" />
                              Start Debate
                            </>
                          )}
                        </Button>
                        {!canStart && (
                          <p className="text-xs text-muted-foreground text-center">
                            Need at least 1 participant per team
                            {forCount === 0 && ' (FOR team empty)'}
                            {againstCount === 0 && ' (AGAINST team empty)'}
                          </p>
                        )}
                      </>
                    )}

                    {/* Cancel/Delete button for host */}
                    {isHost && room.status === DebateStatus.WAITING && (
                      <Button
                        variant="destructive"
                        size="default"
                        className="w-full h-10 rounded-lg"
                        onClick={() => setShowCancelDialog(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Cancel Debate
                      </Button>
                    )}

                    {/* Participant actions */}
                    {isParticipant && room.status === DebateStatus.WAITING && (
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full h-10 rounded-lg"
                        onClick={() => setShowLeaveDialog(true)}
                      >
                        <LogOut className="h-3.5 w-3.5 mr-2" />
                        Leave Debate
                      </Button>
                    )}

                    {/* No actions message */}
                    {!isModerator && !isParticipant && room.status === DebateStatus.WAITING && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Join the debate to see actions
                      </p>
                    )}

                    {/* Back to results */}
                    {(room.status === DebateStatus.ENDED ||
                      room.status === DebateStatus.PROCESSED) && (
                      <Link href="/debateroom" className="block">
                        <Button variant="outline" size="default" className="w-full h-10 rounded-lg">
                          <ArrowLeft className="h-3.5 w-3.5 mr-2" />
                          Back to Debates
                        </Button>
                      </Link>
                    )}

                    {/* Share Button */}
                    <ShareButton
                      url={`${typeof window !== "undefined" ? window.location.origin : ""}/debateroom/${roomId}`}
                      title={room.topic}
                      description={room.description || ""}
                      variant="outline"
                      className="w-full rounded-lg h-9 hover:bg-primary/5 text-xs text-green-600 border-green-200/50 hover:text-green-700"
                    />
                  </div>
                </CardContent>
              </Card>

            {/* Moderators */}
            {room.moderators.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Moderators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {room.moderators.map((mod) => (
                    <div key={mod.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={mod.user.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {mod.user.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{mod.user.name}</span>
                      {mod.isHost && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Room Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Room Settings</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <span>Start time</span>
                  <span className="shrink-0 text-right font-medium text-foreground max-w-[min(100%,14rem)]">
                    {room.scheduledAt
                      ? new Date(room.scheduledAt).toLocaleString()
                      : room.startTime
                        ? new Date(room.startTime).toLocaleString()
                        : room.status === DebateStatus.WAITING
                          ? 'Flexible'
                          : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Debate duration</span>
                  <span className="shrink-0 text-right font-medium text-foreground">
                    {room.debateDurationMinutes != null ? (
                      `${room.debateDurationMinutes} min`
                    ) : (
                      <span>
                        ~
                        {estimateDebateSessionMinutes(
                          room.turnDurationSeconds,
                          room.maxParticipants,
                        )}{' '}
                        min
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {' '}
                          (est.)
                        </span>
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Turn Duration</span>
                  <span>{room.turnDurationSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Prep Time</span>
                  <span>{room.prepTimeSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Turn Order</span>
                  <span>{room.turnOrder}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max per Team</span>
                  <span>{room.maxParticipants}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Debate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel the debate and remove all participants.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Debate</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground"
            >
              {cancelDebateRoom.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cancel Debate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Debate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this debate? You can rejoin later
              if there&apos;s still room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>
              {leaveDebateRoom.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Leave'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit debate</DialogTitle>
            <DialogDescription>
              Only you (the host) see this. You can change topic, timing, and team size whenever
              you want until the debate is closed — that means ended, completed (results), or
              cancelled. Then editing stays locked.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2 mb-3">
              <Label htmlFor="debate-edit-topic">Topic</Label>
              <SpamShield context="debate topic" onStatusChange={s => handleSpamChange("debate", s)} >
                <Input
                  id="debate-edit-topic"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  placeholder="Debate topic / motion"
                />
              </SpamShield>
            </div>
            <div className="space-y-2 mb-3">
              <Label htmlFor="debate-edit-desc">Description</Label>
              <SpamShield context="debate description" onStatusChange={s => handleSpamChange("description", s)} >
                <Textarea
                  id="debate-edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional context or rules"
                />
              </SpamShield>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="debate-edit-max">Max per team</Label>
                <Input
                  id="debate-edit-max"
                  type="number"
                  min={1}
                  max={6}
                  value={editMaxPerTeam || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setEditMaxPerTeam(0 as unknown as number);
                      return;
                    }
                    const num = parseInt(val, 10);
                    if (num >= 1 && num <= 6) {
                      setEditMaxPerTeam(num);
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debate-edit-turn">Turn (seconds)</Label>
                <Input
                  id="debate-edit-turn"
                  type="number"
                  min={30}
                  max={600}
                  step={10}
                  value={editTurnDuration}
                  onChange={(e) => setEditTurnDuration(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="debate-edit-prep">Prep (seconds)</Label>
                <Input
                  id="debate-edit-prep"
                  type="number"
                  min={10}
                  max={120}
                  value={editPrepTime}
                  onChange={(e) => setEditPrepTime(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Turn order</Label>
                <Select
                  value={editTurnOrder}
                  onValueChange={(v) => setEditTurnOrder(v as TurnOrderType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TurnOrderType.FIFO}>FIFO (join order)</SelectItem>
                    <SelectItem value={TurnOrderType.RANDOM}>Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void preSubmit()}
              disabled={updateDebateRoom.isPending || isAnythingVerifying}
            >
              {updateDebateRoom.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>

        <BypassModal isOpen={showBypassDialog} onClose={() => setShowBypassDialog(false)} onConfirm={() => handleSaveEdits()}/>
        
      </Dialog>
    </div>
  );
}
