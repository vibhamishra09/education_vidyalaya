"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
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
import { SkillInput } from "@/components/ui/skill-input";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { useUpdateStudyRoom } from "@/hooks/use-study-rooms";
import { useToast } from "@/contexts/toast-context";
import {
  StudyRoomEditScope,
  UpdateStudyRoomDto,
} from "@/types/api.types";
import { formatDateTimeInTimezone } from "@/lib/utils/study-room-edit";
import { uploadFile, validateImageFile } from "@/lib/upload";
import { setAuthToken } from "@/lib/api-client";

/** Whole coins / fee amounts only — rejects decimals so we never truncate silently. */
function parseNonNegativeIntegerOrZero(raw: string): number | "invalid" {
  const s = raw.trim();
  if (s === "") return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return "invalid";
  }
  return n;
}

export type StudyRoomHostEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  initialTitle: string;
  initialDescription?: string;
  initialDate: Date | string;
  initialDuration: number;
  initialMaxParticipants: number;
  initialJoiningFee: number;
  initialSkillNames: string[];
  initialTimezone?: string | null;
  initialImageUrl?: string | null;
  seriesId?: string | null;
};

export function StudyRoomHostEditDialog({
  open,
  onOpenChange,
  roomId,
  initialTitle,
  initialDescription,
  initialDate,
  initialDuration,
  initialMaxParticipants,
  initialJoiningFee,
  initialSkillNames,
  initialTimezone,
  initialImageUrl,
  seriesId,
}: StudyRoomHostEditDialogProps) {
  const { getToken, isLoaded } = useAuth();
  const { showSuccess, showError } = useToast();
  const updateStudyRoom = useUpdateStudyRoom(roomId);

  const [editScope, setEditScope] = useState(StudyRoomEditScope.SINGLE);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [duration, setDuration] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [joiningFee, setJoiningFee] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removedImage, setRemovedImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [titleError, setTitleError] = useState("");
  const replaceInputRef = useRef<HTMLInputElement>(null);
  /** Cleared when dialog closes; while open, blocks full re-sync from props (refetch was resetting the textarea). */
  const formSyncedForRoomIdRef = useRef<string | null>(null);
  /** Last server `initialDescription` we applied to the textarea (for merge-only updates). */
  const prevInitialDescriptionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      formSyncedForRoomIdRef.current = null;
      prevInitialDescriptionRef.current = undefined;
      return;
    }
    if (formSyncedForRoomIdRef.current === roomId) {
      return;
    }
    formSyncedForRoomIdRef.current = roomId;

    const tz =
      initialTimezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC";
    const { date: d, time: t } = formatDateTimeInTimezone(
      initialDate,
      tz,
    );
    const desc = initialDescription ?? "";
    setEditScope(StudyRoomEditScope.SINGLE);
    setTitle(initialTitle);
    setDescription(desc);
    prevInitialDescriptionRef.current = desc;
    setDate(d);
    setTime(t);
    setTimezone(tz);
    setDuration(String(initialDuration));
    setMaxParticipants(String(initialMaxParticipants));
    setJoiningFee(String(initialJoiningFee ?? 0));
    setSkills([...initialSkillNames]);
    setImageUrl(initialImageUrl ?? undefined);
    setImagePreview(null);
    setPendingFile(null);
    setRemovedImage(false);
    setTitleError("");
  }, [
    open,
    roomId,
    initialTitle,
    initialDescription,
    initialDate,
    initialDuration,
    initialMaxParticipants,
    initialJoiningFee,
    initialSkillNames,
    initialTimezone,
    initialImageUrl,
  ]);

  useEffect(() => {
    if (!open) return;
    if (formSyncedForRoomIdRef.current !== roomId) return;
    const incoming = initialDescription ?? "";
    if (incoming === prevInitialDescriptionRef.current) return;
    setDescription((current) => {
      if (current !== prevInitialDescriptionRef.current) {
        return current;
      }
      prevInitialDescriptionRef.current = incoming;
      return incoming;
    });
  }, [open, roomId, initialDescription]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.valid) {
      showError("Invalid image", check.error ?? "Could not use this file.");
      return;
    }
    setPendingFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemovedImage(false);
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setPendingFile(null);
    setImagePreview(null);
    setImageUrl(undefined);
    setRemovedImage(true);
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Title is required.");
      showError("Title required", "Please enter a room title.");
      return;
    }
    setTitleError("");
    try {
      let uploadedUrl: string | undefined;
      if (pendingFile) {
        setUploadingImage(true);
        const token = isLoaded ? await getToken() : null;
        const authToken = token ?? undefined;
        if (authToken) setAuthToken(authToken);
        uploadedUrl = await uploadFile(pendingFile, "document", authToken);
      }

      const joiningFeeParsed = parseNonNegativeIntegerOrZero(joiningFee);
      if (joiningFeeParsed === "invalid") {
        showError(
          "Invalid entry fee",
          "Enter a whole number 0 or greater (no decimals).",
        );
        return;
      }

      const payload: UpdateStudyRoomDto = {
        title: trimmed,
        // Always send so PATCH clears DB when user empties optional description (omit was skipping update)
        description: description.trim(),
        date,
        time,
        timezone,
        duration: parseInt(duration, 10) || initialDuration,
        maxParticipants: parseInt(maxParticipants, 10) || initialMaxParticipants,
        joiningFee: joiningFeeParsed,
        skills,
      };
      if (pendingFile) {
        payload.imageUrl = uploadedUrl;
      } else if (removedImage) {
        payload.imageUrl = "";
      }
      if (seriesId) {
        payload.editScope = editScope;
      }

      await updateStudyRoom.mutateAsync(payload);
      showSuccess("Updated", "Study room details saved.");
      onOpenChange(false);
    } catch {
      showError("Update failed", "Could not save study room details.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit study room</DialogTitle>
          <DialogDescription>
            Change title, cover, skills, schedule, and fee while you are the host
            — including during a live session. After the meeting ends or is
            cancelled, details stay locked.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!!seriesId && (
            <div className="space-y-2">
              <Label htmlFor="host-edit-scope">Apply to</Label>
              <select
                id="host-edit-scope"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={editScope}
                onChange={(e) =>
                  setEditScope(e.target.value as StudyRoomEditScope)
                }
              >
                <option value={StudyRoomEditScope.SINGLE}>
                  This session only
                </option>
                <option value={StudyRoomEditScope.THIS_AND_FUTURE}>
                  This and future sessions
                </option>
                <option value={StudyRoomEditScope.ENTIRE_SERIES}>
                  Entire series
                </option>
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="host-edit-title">Title</Label>
            <Input
              id="host-edit-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError("");
              }}
              aria-invalid={!!titleError}
              aria-describedby={titleError ? "host-edit-title-error" : undefined}
            />
            {titleError ? (
              <p id="host-edit-title-error" className="text-sm text-destructive">
                {titleError}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="host-edit-desc">Description</Label>
            <Textarea
              id="host-edit-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Cover image</Label>
            {imagePreview || imageUrl ? (
              <div className="space-y-2">
                <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted/50">
                  <Image
                    src={imagePreview || imageUrl!}
                    alt="Cover preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {!imagePreview && (
                  <>
                    <input
                      ref={replaceInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => replaceInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      Replace image
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <label className="block">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50">
                  {uploadingImage ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload cover
                      </span>
                    </>
                  )}
                </div>
              </label>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="host-edit-date">Date</Label>
              <Input
                id="host-edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="host-edit-time">Time</Label>
              <Input
                id="host-edit-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="host-edit-tz">Timezone</Label>
            <Input
              id="host-edit-tz"
              placeholder="e.g. America/New_York"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="host-edit-dur">Duration (min)</Label>
              <Input
                id="host-edit-dur"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="host-edit-max">Max participants</Label>
              <Input
                id="host-edit-max"
                type="number"
                min={1}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="host-edit-fee">Entry fee</Label>
              <Input
                id="host-edit-fee"
                type="number"
                min={0}
                value={joiningFee}
                onChange={(e) => setJoiningFee(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Skills</Label>
            <SkillInput
              label=""
              placeholder="Add a skill and press Enter…"
              selectedSkills={skills}
              onSkillsChange={setSkills}
              maxSkills={10}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateStudyRoom.isPending || uploadingImage}
          >
            {updateStudyRoom.isPending || uploadingImage ? (
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
