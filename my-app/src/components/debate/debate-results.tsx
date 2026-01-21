'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Trophy,
  Target,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Star,
  Award,
} from 'lucide-react';
import { DebateResults, DebateSide, DebateReport } from '@/types/debate.types';

interface DebateResultsDisplayProps {
  results: DebateResults;
  currentUserId?: string;
  className?: string;
}

export function DebateResultsDisplay({
  results,
  currentUserId,
  className,
}: DebateResultsDisplayProps) {
  const forTeam = results.teams.find((t) => t.side === DebateSide.FOR);
  const againstTeam = results.teams.find((t) => t.side === DebateSide.AGAINST);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Winner Announcement */}
      <Card
        className={cn(
          'text-center py-6',
          results.winningTeam === DebateSide.FOR && 'border-green-500 bg-green-500/5',
          results.winningTeam === DebateSide.AGAINST && 'border-red-500 bg-red-500/5',
          !results.winningTeam && 'border-yellow-500 bg-yellow-500/5'
        )}
      >
        <CardContent>
          <Trophy
            className={cn(
              'h-16 w-16 mx-auto mb-4',
              results.winningTeam === DebateSide.FOR && 'text-green-500',
              results.winningTeam === DebateSide.AGAINST && 'text-red-500',
              !results.winningTeam && 'text-yellow-500'
            )}
          />
          <h2 className="text-2xl font-bold mb-2">
            {results.winningTeam
              ? `Team ${results.winningTeam} Wins!`
              : "It's a Tie!"}
          </h2>
          <p className="text-muted-foreground">{results.topic}</p>
        </CardContent>
      </Card>

      {/* Team Scores Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeamScoreCard
          side={DebateSide.FOR}
          score={forTeam?.totalScore || 0}
          participantCount={forTeam?.participantCount || 0}
          isWinner={forTeam?.isWinner || false}
        />
        <TeamScoreCard
          side={DebateSide.AGAINST}
          score={againstTeam?.totalScore || 0}
          participantCount={againstTeam?.participantCount || 0}
          isWinner={againstTeam?.isWinner || false}
        />
      </div>

      {/* Individual Reports */}
      {results.reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Performance Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.reports.map((report) => (
              <ParticipantReportCard
                key={report.participantId}
                report={report}
                isCurrentUser={
                  report.participant?.user.id === currentUserId
                }
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TeamScoreCardProps {
  side: DebateSide;
  score: number;
  participantCount: number;
  isWinner: boolean;
}

function TeamScoreCard({
  side,
  score,
  participantCount,
  isWinner,
}: TeamScoreCardProps) {
  const isFor = side === DebateSide.FOR;

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        isWinner && (isFor ? 'border-green-500' : 'border-red-500')
      )}
    >
      {isWinner && (
        <div
          className={cn(
            'absolute top-2 right-2',
            isFor ? 'text-green-500' : 'text-red-500'
          )}
        >
          <Trophy className="h-6 w-6" />
        </div>
      )}
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <div
            className={cn(
              'w-4 h-4 rounded-full',
              isFor ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          <h3 className="text-lg font-bold">Team {side}</h3>
        </div>

        <div className="text-center py-4">
          <div
            className={cn(
              'text-5xl font-bold',
              isFor ? 'text-green-600' : 'text-red-600'
            )}
          >
            {score.toFixed(1)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Total Score</p>
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{participantCount} participants</span>
          <span>
            Avg: {participantCount > 0 ? (score / participantCount).toFixed(1) : 0}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ParticipantReportCardProps {
  report: DebateReport;
  isCurrentUser: boolean;
}

function ParticipantReportCard({
  report,
  isCurrentUser,
}: ParticipantReportCardProps) {
  const isFor = report.participant?.team.side === DebateSide.FOR;

  const scores = [
    { label: 'Ideas', score: report.ideaScore, icon: Lightbulb },
    { label: 'Clarity', score: report.clarityScore, icon: MessageSquare },
    { label: 'Rebuttal', score: report.rebuttalScore, icon: Target },
  ];

  return (
    <div
      className={cn(
        'border rounded-lg p-4',
        isCurrentUser && 'bg-primary/5 border-primary'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={report.participant?.user.avatar || undefined} />
            <AvatarFallback>
              {report.participant?.user.name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {report.participant?.user.name}
              </span>
              {isCurrentUser && (
                <Badge variant="secondary" className="text-xs">
                  You
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isFor ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <span className="text-muted-foreground">
                {report.participant?.team.side}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <span className="text-2xl font-bold">{report.overallScore.toFixed(1)}</span>
          </div>
          <span className="text-xs text-muted-foreground">Overall Score</span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {scores.map(({ label, score, icon: Icon }) => (
          <div key={label} className="text-center">
            <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-semibold">{score.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <Progress value={score * 10} className="h-1 mt-1" />
          </div>
        ))}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {report.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600 mb-2">
              <TrendingUp className="h-4 w-4" />
              Strengths
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {report.strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-green-500">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.weaknesses.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-sm font-medium text-red-600 mb-2">
              <TrendingDown className="h-4 w-4" />
              Areas to Improve
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {report.weaknesses.slice(0, 3).map((w, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-red-500">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Summary */}
      {report.summary && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="text-muted-foreground">{report.summary}</p>
        </div>
      )}

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">💡 Suggestions</div>
          <ul className="text-sm text-muted-foreground space-y-1">
            {report.suggestions.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Compact results summary
interface CompactResultsProps {
  results: DebateResults;
}

export function CompactResults({ results }: CompactResultsProps) {
  const forTeam = results.teams.find((t) => t.side === DebateSide.FOR);
  const againstTeam = results.teams.find((t) => t.side === DebateSide.AGAINST);

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">
          {forTeam?.totalScore.toFixed(1) || 0}
        </div>
        <div className="text-xs text-muted-foreground">FOR</div>
      </div>

      <div className="text-center">
        {results.winningTeam ? (
          <Trophy
            className={cn(
              'h-8 w-8 mx-auto',
              results.winningTeam === DebateSide.FOR
                ? 'text-green-500'
                : 'text-red-500'
            )}
          />
        ) : (
          <span className="text-lg">🤝</span>
        )}
        <div className="text-xs font-medium mt-1">
          {results.winningTeam ? `${results.winningTeam} Wins` : 'Tie'}
        </div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-red-600">
          {againstTeam?.totalScore.toFixed(1) || 0}
        </div>
        <div className="text-xs text-muted-foreground">AGAINST</div>
      </div>
    </div>
  );
}
