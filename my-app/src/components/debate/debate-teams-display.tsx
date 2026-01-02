'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  DebateTeam,
  DebateSide,
  ParticipantStatus,
} from '@/types/debate.types';
import { Users, Mic, MicOff, Crown, Shield } from 'lucide-react';

interface DebateTeamsDisplayProps {
  teams: DebateTeam[];
  currentSpeakerId?: string | null;
  maxParticipants: number;
  currentUserId?: string;
  className?: string;
}

export function DebateTeamsDisplay({
  teams,
  currentSpeakerId,
  maxParticipants,
  currentUserId,
  className,
}: DebateTeamsDisplayProps) {
  const forTeam = teams.find((t) => t.side === DebateSide.FOR);
  const againstTeam = teams.find((t) => t.side === DebateSide.AGAINST);

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {/* FOR Team */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-green-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>FOR</span>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Users className="w-3 h-3 mr-1" />
              {forTeam?.participants.length || 0}/{maxParticipants}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {forTeam?.participants.length ? (
            forTeam.participants.map((participant) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                isSpeaking={participant.id === currentSpeakerId}
                isCurrentUser={participant.user.id === currentUserId}
                teamColor="green"
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No participants yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* AGAINST Team */}
      <Card className="border-red-500/30 bg-red-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-red-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>AGAINST</span>
            </div>
            <Badge variant="outline" className="text-red-600 border-red-600">
              <Users className="w-3 h-3 mr-1" />
              {againstTeam?.participants.length || 0}/{maxParticipants}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {againstTeam?.participants.length ? (
            againstTeam.participants.map((participant) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                isSpeaking={participant.id === currentSpeakerId}
                isCurrentUser={participant.user.id === currentUserId}
                teamColor="red"
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No participants yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ParticipantCardProps {
  participant: DebateTeam['participants'][0];
  isSpeaking: boolean;
  isCurrentUser: boolean;
  teamColor: 'green' | 'red';
}

function ParticipantCard({
  participant,
  isSpeaking,
  isCurrentUser,
  teamColor,
}: ParticipantCardProps) {
  const statusColors: Record<ParticipantStatus, string> = {
    [ParticipantStatus.ACTIVE]: 'bg-gray-400',
    [ParticipantStatus.SPEAKING]: 'bg-yellow-500 animate-pulse',
    [ParticipantStatus.COMPLETED]: 'bg-green-500',
    [ParticipantStatus.DISCONNECTED]: 'bg-gray-300',
    [ParticipantStatus.BANNED]: 'bg-red-500',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-all',
        isSpeaking && 'ring-2 ring-yellow-500 bg-yellow-500/10',
        isCurrentUser && 'bg-primary/5 border border-primary/20'
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={participant.user.avatar || undefined} />
          <AvatarFallback>
            {participant.user.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background',
            statusColors[participant.status as ParticipantStatus]
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {participant.user.name}
            {isCurrentUser && (
              <span className="text-xs text-muted-foreground ml-1">(You)</span>
            )}
          </p>
          {isSpeaking && (
            <Mic
              className={cn(
                'w-4 h-4 animate-pulse',
                teamColor === 'green' ? 'text-green-500' : 'text-red-500'
              )}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground capitalize">
          {participant.status.toLowerCase()}
          {participant.turnCompleted && ' • Turn completed'}
        </p>
      </div>

      {participant.turnCompleted && (
        <Badge variant="secondary" className="text-xs">
          Done
        </Badge>
      )}
    </div>
  );
}

// Compact version for sidebar
interface CompactTeamsDisplayProps {
  teams: DebateTeam[];
  currentSpeakerId?: string | null;
}

export function CompactTeamsDisplay({
  teams,
  currentSpeakerId,
}: CompactTeamsDisplayProps) {
  const forTeam = teams.find((t) => t.side === DebateSide.FOR);
  const againstTeam = teams.find((t) => t.side === DebateSide.AGAINST);

  return (
    <div className="space-y-4">
      {/* FOR Team */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-600">FOR</span>
          <span className="text-xs text-muted-foreground">
            ({forTeam?.participants.length || 0})
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {forTeam?.participants.map((p) => (
            <Avatar
              key={p.id}
              className={cn(
                'h-8 w-8 border-2',
                p.id === currentSpeakerId
                  ? 'border-yellow-500 ring-2 ring-yellow-500/50'
                  : 'border-green-500/30'
              )}
            >
              <AvatarImage src={p.user.avatar || undefined} />
              <AvatarFallback className="text-xs">
                {p.user.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      {/* AGAINST Team */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-600">AGAINST</span>
          <span className="text-xs text-muted-foreground">
            ({againstTeam?.participants.length || 0})
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {againstTeam?.participants.map((p) => (
            <Avatar
              key={p.id}
              className={cn(
                'h-8 w-8 border-2',
                p.id === currentSpeakerId
                  ? 'border-yellow-500 ring-2 ring-yellow-500/50'
                  : 'border-red-500/30'
              )}
            >
              <AvatarImage src={p.user.avatar || undefined} />
              <AvatarFallback className="text-xs">
                {p.user.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
    </div>
  );
}
