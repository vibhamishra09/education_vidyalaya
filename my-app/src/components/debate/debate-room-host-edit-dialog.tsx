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
import { Loader2 } from "lucide-react";
import { useUpdateDebateRoom, debateRoomKeys } from "@/hooks/use-debate-rooms";
import { useToast } from "@/contexts/toast-context";
import { extractHttpErrorMessage } from "@/lib/utils/error-handling";
import { DebateRoom, TurnOrderType } from "@/types/debate.types";

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

  useEffect(() => {
    if (!open || !room) return;
    setTopic(room.topic);
    setDescription(room.description ?? "");
    setMaxPerTeam(room.maxParticipants);
    setTurnDuration(room.turnDurationSeconds);
    setPrepTime(room.prepTimeSeconds);
    setTurnOrder(room.turnOrder);
  }, [open, room]);

  const handleSave = async () => {
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
      await updateDebateRoom.mutateAsync({
        topic: topic.trim(),
        description: description.trim() || undefined,
        maxParticipants: max,
        turnDurationSeconds: turnSec,
        prepTimeSeconds: prepSec,
        turnOrder,
      });
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
                max={10}
                value={maxPerTeam}
                onChange={(e) => setMaxPerTeam(Number(e.target.value))}
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
