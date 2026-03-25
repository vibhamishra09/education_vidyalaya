"use client";

import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useUpdatePeerSession } from "@/hooks/use-peer-sessions";
import { useToast } from "@/contexts/toast-context";
import { extractHttpErrorMessage } from "@/lib/utils/error-handling";
import type { PeerSession } from "@/types/api.types";

const PLACEHOLDER_GMEET = "https://meet.google.com/your-meeting-code";

function sessionDateToDatetimeLocal(value: Date | string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type PeerSessionEditDialogProps = {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: PeerSession | null;
};

export function PeerSessionEditDialog({
  sessionId,
  open,
  onOpenChange,
  session,
}: PeerSessionEditDialogProps) {
  const { showSuccess, showError } = useToast();
  const updatePeerSession = useUpdatePeerSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [duration, setDuration] = useState("60");
  const [gmeetLink, setGmeetLink] = useState("");
  const [skillsText, setSkillsText] = useState("");

  useEffect(() => {
    if (!open || !session) return;
    setTitle(session.title);
    setDescription(session.description ?? "");
    setScheduledLocal(sessionDateToDatetimeLocal(session.date));
    setDuration(String(session.duration));
    const link = session.gmeetLink ?? "";
    setGmeetLink(
      !link || link === PLACEHOLDER_GMEET ? "" : link,
    );
    setSkillsText(session.skills.map((s) => s.name).join(", "));
  }, [open, session]);

  const fieldId = (name: string) => `peer-session-edit-${sessionId}-${name}`;

  const handleSave = async () => {
    if (!title.trim()) {
      showError("Validation", "Title is required");
      return;
    }
    const dur = Math.round(Number(duration));
    if (!Number.isFinite(dur) || dur < 1 || dur > 240) {
      showError("Validation", "Duration must be between 1 and 240 minutes");
      return;
    }
    if (!scheduledLocal) {
      showError("Validation", "Please choose a date and time");
      return;
    }
    const start = new Date(scheduledLocal);
    if (Number.isNaN(start.getTime())) {
      showError("Validation", "Invalid date or time");
      return;
    }

    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await updatePeerSession.mutateAsync({
        sessionId,
        dto: {
          title: title.trim(),
          description: description.trim() || undefined,
          duration: dur,
          scheduledAt: start.toISOString(),
          skills: skills.length > 0 ? skills : ["Communication"],
          gmeetLink: gmeetLink.trim(),
        },
      });
      showSuccess("Updated", "Session details saved.");
      onOpenChange(false);
    } catch (err: unknown) {
      showError(
        "Update failed",
        extractHttpErrorMessage(err, "Could not update session"),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            As the session provider, you can update the title, schedule, meet link, and topics until
            the session is completed, cancelled, or marked not completed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={fieldId("title")}>Title</Label>
            <Input
              id={fieldId("title")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Session title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("desc")}>Description</Label>
            <Textarea
              id={fieldId("desc")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("when")}>Date &amp; time</Label>
            <Input
              id={fieldId("when")}
              type="datetime-local"
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("dur")}>Duration (minutes)</Label>
            <Input
              id={fieldId("dur")}
              type="number"
              min={1}
              max={240}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("meet")}>Google Meet link</Label>
            <Input
              id={fieldId("meet")}
              value={gmeetLink}
              onChange={(e) => setGmeetLink(e.target.value)}
              placeholder="https://meet.google.com/… or leave empty to clear"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("skills")}>Topics / skills</Label>
            <Input
              id={fieldId("skills")}
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Comma-separated, e.g. Communication, Python"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={updatePeerSession.isPending}>
            {updatePeerSession.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
