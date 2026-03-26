"use client";

import { useState } from "react";
import { Share2, Twitter, Facebook, Linkedin, MessageCircle, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/contexts/toast-context";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ShareButton({
  url,
  title,
  description = "",
  image,
  variant = "outline",
  size = "default",
  className = "",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { showSuccess } = useToast();

  const shareText = description
    ? `${title} - ${description}`
    : title;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showSuccess("Link Copied!", "Study room link has been copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title,
          text: shareText,
          url,
        };

        // Add image if available and supported
        if (image) {
          try {
            const response = await fetch(image);
            const blob = await response.blob();
            const file = new File([blob], "study-room-image.jpg", { type: blob.type });
            shareData.files = [file];
          } catch (err) {
            // If image fetch fails, share without image
            console.warn("Failed to fetch image for sharing:", err);
          }
        }

        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    }
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, "_blank", "width=550,height=420");
  };

  const shareToLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedInUrl, "_blank", "width=550,height=420");
  };

  const shareToWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`;
    window.open(whatsappUrl, "_blank");
  };

  const isMobile = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          aria-label="Share study room"
        >
          <Share2 className="h-4 w-4" />
          {size !== "icon" && <span className="ml-2">Share</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-1">
          {isMobile && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleWebShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share via...
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={shareToTwitter}
          >
            <Twitter className="h-4 w-4 mr-2 text-blue-400" />
            Twitter
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={shareToFacebook}
          >
            <Facebook className="h-4 w-4 mr-2 text-blue-600" />
            Facebook
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={shareToLinkedIn}
          >
            <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
            LinkedIn
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={shareToWhatsApp}
          >
            <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
            WhatsApp
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

