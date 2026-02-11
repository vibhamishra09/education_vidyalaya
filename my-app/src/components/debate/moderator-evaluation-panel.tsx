'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Save, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DebateEvaluationScores,
  DebateGradingFactor,
  DEFAULT_DEBATE_GRADING_FACTORS,
} from '@/types/debate.types';

interface ModeratorEvaluationPanelProps {
  debateRoomId: string;
  participantId: string;
  participantName: string;
  turnNumber: number;
  gradingFactors?: DebateGradingFactor[];
  initialNotes?: string | null;
  initialScores?: DebateEvaluationScores;
  isSaving?: boolean;
  onSave: (payload: { notes?: string; scores?: DebateEvaluationScores }) => Promise<void>;
}

function buildDefaultScores(factors: DebateGradingFactor[], initialScores?: DebateEvaluationScores) {
  const next: DebateEvaluationScores = {};
  factors.forEach((factor) => {
    next[factor.key] = initialScores?.[factor.key] ?? 0;
  });
  return next;
}

export function ModeratorEvaluationPanel({
  debateRoomId: _debateRoomId,
  participantId,
  participantName,
  turnNumber,
  gradingFactors = DEFAULT_DEBATE_GRADING_FACTORS,
  initialNotes,
  initialScores,
  isSaving = false,
  onSave,
}: ModeratorEvaluationPanelProps) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [scores, setScores] = useState<DebateEvaluationScores>(() =>
    buildDefaultScores(gradingFactors, initialScores),
  );
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedRef = useRef<string>('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveKey = useMemo(
    () => `${participantId}:${turnNumber}`,
    [participantId, turnNumber],
  );

  useEffect(() => {
    const merged = buildDefaultScores(gradingFactors, initialScores);
    setScores(merged);
    setNotes(initialNotes ?? '');
    lastSavedRef.current = JSON.stringify({
      notes: initialNotes ?? '',
      scores: merged,
      saveKey,
    });
    setAutoSaveState('idle');
  }, [initialNotes, initialScores, gradingFactors, saveKey]);

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      const payload = {
        notes: notes.trim(),
        scores,
        saveKey,
      };
      const serialized = JSON.stringify(payload);
      if (serialized === lastSavedRef.current) {
        return;
      }

      try {
        setAutoSaveState('saving');
        await onSave({
          notes: payload.notes,
          scores: payload.scores,
        });
        lastSavedRef.current = serialized;
        setAutoSaveState('saved');
      } catch {
        setAutoSaveState('error');
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [notes, scores, onSave, saveKey]);

  const handleScoreChange = (factorKey: string, value: number) => {
    const clamped = Number.isNaN(value) ? 0 : Math.max(0, Math.min(10, value));
    setScores((prev) => ({
      ...prev,
      [factorKey]: clamped,
    }));
  };

  const handleManualSave = async () => {
    setAutoSaveState('saving');
    try {
      await onSave({
        notes: notes.trim(),
        scores,
      });
      lastSavedRef.current = JSON.stringify({
        notes: notes.trim(),
        scores,
        saveKey,
      });
      setAutoSaveState('saved');
    } catch {
      setAutoSaveState('error');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 sm:p-4 border-b border-white/10 bg-[#1a1a1a]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white text-sm sm:text-base font-semibold truncate">
              Moderator Evaluation
            </p>
            <p className="text-white/60 text-xs sm:text-sm truncate">
              <User className="inline-block h-3 w-3 mr-1" />
              {participantName}
            </p>
          </div>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 bg-yellow-500/10">
            Turn {turnNumber + 1}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-5">
        {gradingFactors.map((factor) => {
          const score = scores[factor.key] ?? 0;
          return (
            <div key={factor.key} className="rounded-lg border border-white/10 p-3 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white/90 text-sm">{factor.label}</Label>
                <span className="text-yellow-300 text-sm font-semibold">{score.toFixed(1)}/10</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={score}
                  onChange={(e) => handleScoreChange(factor.key, Number(e.target.value))}
                  className="h-10 sm:flex-1 p-0 border-none bg-transparent"
                />
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={score}
                  onChange={(e) => handleScoreChange(factor.key, Number(e.target.value))}
                  className="w-full sm:w-24 bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>
          );
        })}

        <div className="space-y-2">
          <Label htmlFor="moderator-notes" className="text-white/90 text-sm">
            Notes
          </Label>
          <Textarea
            id="moderator-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your observations while the participant is speaking..."
            className="min-h-[120px] sm:min-h-[160px] bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-y"
          />
        </div>
      </div>

      <div className="p-3 sm:p-4 border-t border-white/10 bg-[#1a1a1a] flex items-center justify-between gap-2">
        <span className="text-xs text-white/60">
          {autoSaveState === 'saving' && 'Auto-saving...'}
          {autoSaveState === 'saved' && 'All changes saved'}
          {autoSaveState === 'error' && 'Auto-save failed, try Save'}
          {autoSaveState === 'idle' && 'Changes auto-save after 2s'}
        </span>
        <Button
          onClick={handleManualSave}
          disabled={isSaving}
          className="bg-yellow-600 hover:bg-yellow-700 text-white min-w-24"
          size="sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
