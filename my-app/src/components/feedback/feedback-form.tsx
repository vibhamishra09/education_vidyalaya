"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, X, Upload, Loader2 } from "lucide-react";
import { feedbackApi, fileToBase64 } from "@/lib/api";
import {
  FeedbackSubmission,
  FeatureArea,
  FeedbackCategory,
  FeedbackPriority,
} from "@/types/api.types";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

interface FeedbackFormProps {
  initialFeatureArea?: FeatureArea;
  initialMetadata?: Record<string, any>;
  onSuccess?: (feedbackId: string) => void;
  onCancel?: () => void;
}

const FEATURE_AREAS: { value: FeatureArea; label: string }[] = [
  { value: "studyRooms", label: "Study Rooms" },
  { value: "peerSessions", label: "Peer Sessions" },
  { value: "dashboard", label: "Dashboard" },
  { value: "payments", label: "Payments" },
  { value: "reviews", label: "Reviews" },
  { value: "notifications", label: "Notifications" },
  { value: "browse", label: "Browse & Search" },
  { value: "chat", label: "Chat" },
  { value: "profile", label: "Profile" },
  { value: "skills", label: "Skills" },
  { value: "achievements", label: "Achievements" },
  { value: "streaks", label: "Streaks" },
  { value: "availability", label: "Availability" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

const CATEGORIES: FeedbackCategory[] = [
  "bug",
  "feature-request",
  "ui-issue",
  "performance",
  "accessibility",
  "documentation",
  "other",
];

const PRIORITIES: FeedbackPriority[] = ["low", "medium", "high", "critical"];

export function FeedbackForm({
  initialFeatureArea,
  initialMetadata,
  onSuccess,
  onCancel,
}: FeedbackFormProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [featureArea, setFeatureArea] = useState<FeatureArea>(
    initialFeatureArea || "general"
  );
  const [title, setTitle] = useState("");
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [freeformText, setFreeformText] = useState("");
  const [structuredData, setStructuredData] = useState<Record<string, any>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [priority, setPriority] = useState<FeedbackPriority>("medium");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (category: FeedbackCategory) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((file) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error(`File ${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });
    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const determineFeedbackType = (): "structured" | "freeform" | "mixed" => {
    const hasStructured = Object.keys(structuredData).length > 0 || rating !== undefined;
    const hasFreeform = freeformText.trim().length > 0;
    
    if (hasStructured && hasFreeform) return "mixed";
    if (hasStructured) return "structured";
    return "freeform";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!freeformText.trim() && !rating && Object.keys(structuredData).length === 0) {
      toast.error("Please provide feedback text, rating, or structured data");
      return;
    }

    setLoading(true);

    try {
      const submission: FeedbackSubmission = {
        userId: user?.id,
        userEmail: user?.emailAddresses[0]?.emailAddress,
        featureArea,
        feedbackType: determineFeedbackType(),
        title: title.trim() || undefined,
        rating,
        categories: categories.length > 0 ? categories : undefined,
        structuredData: Object.keys(structuredData).length > 0 ? structuredData : undefined,
        freeformText: freeformText.trim() || undefined,
        metadata: initialMetadata,
        tags: tags.length > 0 ? tags : undefined,
        priority,
      };

      const response = await feedbackApi.submitFeedback(submission);
      const feedbackId = response.feedbackId;

      // Upload attachments if any
      if (files.length > 0) {
        try {
          for (const file of files) {
            const base64Data = await fileToBase64(file);
            await feedbackApi.uploadAttachment(feedbackId, {
              fileName: file.name,
              fileType: file.type,
              fileData: base64Data,
            });
          }
        } catch (error) {
          console.error("Error uploading attachments:", error);
          toast.warning("Feedback submitted but some attachments failed to upload");
        }
      }

      toast.success("Feedback submitted successfully! Thank you for your input.");
      
      if (onSuccess) {
        onSuccess(feedbackId);
      } else {
        // Reset form
        setTitle("");
        setRating(undefined);
        setCategories([]);
        setFreeformText("");
        setStructuredData({});
        setTags([]);
        setFiles([]);
        setPriority("medium");
      }
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error(
        error?.message || "Failed to submit feedback. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Feature Area */}
      <div className="space-y-2">
        <Label htmlFor="featureArea">Feature Area *</Label>
        <Select value={featureArea} onValueChange={(value) => setFeatureArea(value as FeatureArea)}>
          <SelectTrigger id="featureArea">
            <SelectValue placeholder="Select feature area" />
          </SelectTrigger>
          <SelectContent>
            {FEATURE_AREAS.map((area) => (
              <SelectItem key={area.value} value={area.value}>
                {area.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title (Optional)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief summary of your feedback"
        />
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <Label>Rating (Optional)</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredRating || rating || 0)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <Label>Categories (Optional)</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={categories.includes(category) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Free-form Text */}
      <div className="space-y-2">
        <Label htmlFor="feedback">Feedback *</Label>
        <Textarea
          id="feedback"
          value={freeformText}
          onChange={(e) => setFreeformText(e.target.value)}
          placeholder="Describe your feedback, suggestions, or issues..."
          rows={6}
          required
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (Optional)</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add tags (press Enter)"
          />
          <Button type="button" onClick={addTag} variant="outline">
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select value={priority} onValueChange={(value) => setPriority(value as FeedbackPriority)}>
          <SelectTrigger id="priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="files">Attachments (Optional)</Label>
        <input
          ref={fileInputRef}
          type="file"
          id="files"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.txt"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
        {files.length > 0 && (
          <div className="mt-2 space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded"
              >
                <span className="text-sm truncate flex-1">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Feedback"
          )}
        </Button>
      </div>
    </form>
  );
}

