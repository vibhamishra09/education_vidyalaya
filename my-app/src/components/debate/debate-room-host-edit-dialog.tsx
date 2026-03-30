"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2 } from "lucide-react";
import { useUpdateDebateRoom, debateRoomKeys } from "@/hooks/use-debate-rooms";
import { useToast } from "@/contexts/toast-context";
import { extractHttpErrorMessage } from "@/lib/utils/error-handling";
import {
  DebateRoom,
  DebateStatus,
  TurnOrderType,
  type UpdateDebateRoomDto,
} from "@/types/debate.types";

export type DebateRoomHostEditDialogProps = {
  roomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: DebateRoom | null;
};

export function DebateRoomHostEditDialog({
  roomId,
  open,
  onOpenChange,
  room,
}: DebateRoomHostEditDialogProps) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const updateDebateRoom = useUpdateDebateRoom(roomId);

  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [maxPerTeam, setMaxPerTeam] = useState(3);
  const [turnDuration, setTurnDuration] = useState(120);
  const [prepTime, setPrepTime] = useState(30);
  const [turnOrder, setTurnOrder] = useState<TurnOrderType>(TurnOrderType.FIFO);
  /** "none" = no fixed start; "scheduled" = use schedDate/schedTime */
  const [scheduleMode, setScheduleMode] = useState<"none" | "scheduled">("none");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [debateSessionMinutes, setDebateSessionMinutes] = useState(60);

  useEffect(() => {
    if (!open || !room) return;
    setTopic(room.topic);
    setDescription(room.description ?? "");
    setMaxPerTeam(room.maxParticipants);
    setTurnDuration(room.turnDurationSeconds);
    setPrepTime(room.prepTimeSeconds);
    setTurnOrder(room.turnOrder);
    setDebateSessionMinutes(room.debateDurationMinutes ?? 60);
    if (room.scheduledAt) {
      setScheduleMode("scheduled");
      const d = new Date(room.scheduledAt);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        setSchedDate(`${y}-${m}-${day}`);
        const h = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        setSchedTime(`${h}:${min}`);
      }
    } else {
      setScheduleMode("none");
      setSchedDate("");
      setSchedTime("");
    }
  }, [open, room]);

  const handleSave = async () => {
    if (!room) return;
    if (!topic.trim()) {
      showError("Validation", "Topic is required");
      return;
    }
    const max = Math.round(Math.min(10, Math.max(1, Number(maxPerTeam))));
    const turnSec = Math.round(Math.min(600, Math.max(30, Number(turnDuration))));
    const prepSec = Math.round(Math.min(120, Math.max(10, Number(prepTime))));
    if (!Number.isFinite(max) || !Number.isFinite(turnSec) || !Number.isFinite(prepSec)) {
      showError("Validation", "Please enter valid numbers");
      return;
    }
    try {
      const payload: UpdateDebateRoomDto = {
        topic: topic.trim(),
        description: description.trim() || undefined,
        maxParticipants: max,
        turnDurationSeconds: turnSec,
        prepTimeSeconds: prepSec,
        turnOrder,
      };

      if (room.status === DebateStatus.WAITING) {
        const sessionM = Math.round(Number(debateSessionMinutes));
        if (!Number.isFinite(sessionM) || sessionM < 5 || sessionM > 24 * 60) {
          showError("Validation", "Debate duration must be between 5 and 1440 minutes.");
          return;
        }
        payload.debateDurationMinutes = sessionM;
        if (scheduleMode === "scheduled") {
          if (!schedDate || !schedTime) {
            showError("Validation", "Choose both date and time for a scheduled start, or switch to “No fixed time”.");
            return;
          }
          payload.scheduledAt = `${schedDate}T${schedTime}:00`;
        } else if (room.scheduledAt) {
          payload.clearScheduledAt = true;
        }
      }

      await updateDebateRoom.mutateAsync(payload);
      showSuccess("Updated", "Changes saved.");
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: debateRoomKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
    } catch (err: unknown) {
      showError(
        "Update failed",
        extractHttpErrorMessage(err, "Could not update debate room"),
      );
    }
  };

  const fieldId = (name: string) => `debate-card-edit-${roomId}-${name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit debate</DialogTitle>
          <DialogDescription>
            Only you (the host) see this. You can change topic, timing, and team size until the debate
            is ended, completed (results), or cancelled.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={fieldId("topic")}>Topic</Label>
            <Input
              id={fieldId("topic")}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Debate topic / motion"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("desc")}>Description</Label>
            <Textarea
              id={fieldId("desc")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional context or rules"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={fieldId("max")}>Max per team</Label>
              <Input
                id={fieldId("max")}
                type="number"
                min={1}
                max={6}
                value={maxPerTeam || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setMaxPerTeam('' as any);
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (num >= 1 && num <= 6) {
                    setMaxPerTeam(num);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId("turn")}>Turn (seconds)</Label>
              <Input
                id={fieldId("turn")}
                type="number"
                min={30}
                max={600}
                step={10}
                value={turnDuration}
                onChange={(e) => setTurnDuration(Number(e.target.value))}
              />
            </div>
          </div>
          {room?.status === DebateStatus.WAITING && (
            <div className="space-y-2">
              <Label htmlFor={fieldId("session-mins")}>Debate duration (minutes)</Label>
              <p className="text-xs text-muted-foreground">
                Total planned session length. Joining stays open until scheduled start + this duration (lobby window).
              </p>
              <Input
                id={fieldId("session-mins")}
                type="number"
                min={5}
                max={1440}
                step={1}
                value={debateSessionMinutes}
                onChange={(e) => setDebateSessionMinutes(Number(e.target.value))}
              />
            </div>
          )}
          {room?.status === DebateStatus.WAITING && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Scheduled start (optional)
              </div>
              <p className="text-xs text-muted-foreground">
                Set a fixed date and time for when the debate should begin, or leave “No fixed time” so people can join whenever.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`debate-sched-${roomId}`}
                    checked={scheduleMode === "none"}
                    onChange={() => setScheduleMode("none")}
                    className="h-4 w-4"
                  />
                  No fixed time
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`debate-sched-${roomId}`}
                    checked={scheduleMode === "scheduled"}
                    onChange={() => setScheduleMode("scheduled")}
                    className="h-4 w-4"
                  />
                  Schedule date &amp; time
                </label>
              </div>
              {scheduleMode === "scheduled" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={fieldId("sdate")}>Date</Label>
                    <Input
                      id={fieldId("sdate")}
                      type="date"
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={fieldId("stime")}>Time</Label>
                    <Input
                      id={fieldId("stime")}
                      type="time"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={fieldId("prep")}>Prep (seconds)</Label>
              <Input
                id={fieldId("prep")}
                type="number"
                min={10}
                max={120}
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Turn order</Label>
              <Select value={turnOrder} onValueChange={(v) => setTurnOrder(v as TurnOrderType)}>
                <SelectTrigger id={fieldId("order")}>
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
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={updateDebateRoom.isPending}>
            {updateDebateRoom.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
