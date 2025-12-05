"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkillInput } from "@/components/ui/skill-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Plus, X, Linkedin, Github, Globe, Youtube, Instagram } from "lucide-react";
import { usersApi } from "@/lib/api";
import { User, UpdateUserDto, SocialLink, SOCIAL_PLATFORMS } from "@/types/api.types";
import { setAuthToken } from "@/lib/api-client";
import { uploadFile, validateImageFile } from "@/lib/upload";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

// Platform configuration with icons and colors
const PLATFORM_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  color: string; 
  placeholder: string;
  label: string;
}> = {
  linkedin: {
    icon: <Linkedin className="h-4 w-4" />,
    color: "text-[#0A66C2]",
    placeholder: "https://linkedin.com/in/username",
    label: "LinkedIn",
  },
  twitter: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: "text-foreground",
    placeholder: "https://x.com/username",
    label: "X (Twitter)",
  },
  github: {
    icon: <Github className="h-4 w-4" />,
    color: "text-foreground",
    placeholder: "https://github.com/username",
    label: "GitHub",
  },
  youtube: {
    icon: <Youtube className="h-4 w-4" />,
    color: "text-[#FF0000]",
    placeholder: "https://youtube.com/@username",
    label: "YouTube",
  },
  instagram: {
    icon: <Instagram className="h-4 w-4" />,
    color: "text-[#E4405F]",
    placeholder: "https://instagram.com/username",
    label: "Instagram",
  },
  facebook: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: "text-[#1877F2]",
    placeholder: "https://facebook.com/username",
    label: "Facebook",
  },
  tiktok: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    color: "text-foreground",
    placeholder: "https://tiktok.com/@username",
    label: "TikTok",
  },
  discord: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
    color: "text-[#5865F2]",
    placeholder: "https://discord.gg/invite or username#0000",
    label: "Discord",
  },
  twitch: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
    color: "text-[#9146FF]",
    placeholder: "https://twitch.tv/username",
    label: "Twitch",
  },
  reddit: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
    color: "text-[#FF4500]",
    placeholder: "https://reddit.com/user/username",
    label: "Reddit",
  },
  medium: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
      </svg>
    ),
    color: "text-foreground",
    placeholder: "https://medium.com/@username",
    label: "Medium",
  },
  devto: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6v4.36h.58c.37 0 .66-.08.84-.23.21-.17.31-.48.31-.93v-2c0-.46-.1-.78-.31-.97zm9.66-6.05H6.92L1.5 7.4v9.2l5.42 3.4h10.16l5.42-3.4V7.4l-5.42-3.4zM9.39 14.59c-.39.47-.93.7-1.67.7H5.33V8.71h2.39c.74 0 1.28.23 1.67.7.38.46.57 1.14.57 2.02v1.14c0 .88-.19 1.55-.57 2.02zm5.61.7h-3.21V8.71h3.21v1.33h-1.79v1.44h1.66v1.33h-1.66v1.15h1.79v1.33zm5.61-3.73c0 .47-.12.84-.36 1.11-.24.26-.57.39-.99.39h-.58v2.23h-1.45V8.71h2.03c.43 0 .76.13.99.39.24.27.36.64.36 1.11v1.35z"/>
      </svg>
    ),
    color: "text-foreground",
    placeholder: "https://dev.to/username",
    label: "DEV.to",
  },
  stackoverflow: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15 21h-10v-2h10v2zm6-11.665l-1.621-9.335-1.993.346 1.62 9.335 1.994-.346zm-5.964 6.937l-9.746-.975-.186 2.016 9.755.879.177-1.92zm.538-2.587l-9.276-2.608-.526 1.954 9.306 2.5.496-1.846zm1.204-2.413l-8.297-4.864-1.029 1.743 8.298 4.865 1.028-1.744zm1.866-1.467l-5.339-7.829-1.672 1.14 5.339 7.829 1.672-1.14zm-2.644 4.195v8h-12v-8h-2v10h16v-10h-2z"/>
      </svg>
    ),
    color: "text-[#F48024]",
    placeholder: "https://stackoverflow.com/users/id/username",
    label: "Stack Overflow",
  },
  dribbble: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.81zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/>
      </svg>
    ),
    color: "text-[#EA4C89]",
    placeholder: "https://dribbble.com/username",
    label: "Dribbble",
  },
  behance: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.348-1.05.6-1.67.767-.61.165-1.252.254-1.91.254H0V4.51h6.938v-.007zM6.545 9.63c.55 0 .993-.14 1.33-.43.336-.286.503-.7.503-1.23 0-.303-.06-.55-.165-.756-.108-.203-.26-.37-.442-.495-.183-.125-.392-.216-.628-.27-.24-.054-.5-.08-.77-.08H3.24v3.27h3.31l-.005-.01zm.37 5.29c.303 0 .59-.04.867-.105.28-.068.52-.176.72-.328.2-.153.364-.358.49-.618.123-.263.186-.596.186-1.006 0-.79-.214-1.353-.64-1.69-.425-.336-.99-.502-1.69-.502H3.24v4.25h3.67l.005-.002zM21.79 8.12h-5.563v-1.55h5.563v1.55zm-1.59 8.532c.534.54 1.3.81 2.29.81.714 0 1.33-.18 1.85-.54.52-.36.85-.738.99-1.135H24c-.255 1.083-.77 1.89-1.54 2.42-.77.53-1.71.8-2.81.8-0.77 0-1.468-.13-2.1-.386-.634-.26-1.176-.627-1.63-1.1-.45-.475-.8-1.046-1.05-1.716-.25-.67-.376-1.41-.376-2.22 0-.78.13-1.5.38-2.17.26-.67.61-1.24 1.07-1.72.46-.48 1-0.86 1.63-1.13.63-.27 1.32-.41 2.07-.41.85 0 1.6.17 2.25.5.65.34 1.18.79 1.6 1.37.42.58.73 1.24.93 1.99.2.75.27 1.54.22 2.37h-6.8c.03.996.345 1.78.88 2.32v.003zm4.03-5.32c-.4-.46-1.03-.69-1.9-.69-.57 0-1.05.1-1.44.29-.38.19-.69.44-.94.73-.24.29-.41.62-.51.98-.1.35-.16.68-.19 1h5.46c-.12-.89-.46-1.55-.86-2.01l.38.01z"/>
      </svg>
    ),
    color: "text-[#1769FF]",
    placeholder: "https://behance.net/username",
    label: "Behance",
  },
  figma: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V8.981H8.148zM8.172 24c-2.489 0-4.515-2.014-4.515-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.563 4.539zm-.024-7.51a3.023 3.023 0 0 0-3.019 3.019c0 1.665 1.365 3.019 3.044 3.019 1.705 0 3.093-1.376 3.093-3.068v-2.97H8.148zm7.704 0h-.098c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h.098c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm-.097-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h.098c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-.098z"/>
      </svg>
    ),
    color: "text-[#F24E1E]",
    placeholder: "https://figma.com/@username",
    label: "Figma",
  },
  website: {
    icon: <Globe className="h-4 w-4" />,
    color: "text-primary",
    placeholder: "https://yourwebsite.com",
    label: "Website",
  },
  custom: {
    icon: <Globe className="h-4 w-4" />,
    color: "text-muted-foreground",
    placeholder: "https://example.com",
    label: "Custom Link",
  },
};

// Get icon for a platform
function getPlatformIcon(platform: string): React.ReactNode {
  return PLATFORM_CONFIG[platform]?.icon || <Globe className="h-4 w-4" />;
}

// Get color class for a platform
function getPlatformColor(platform: string): string {
  return PLATFORM_CONFIG[platform]?.color || "text-muted-foreground";
}

// Get placeholder for a platform
function getPlatformPlaceholder(platform: string): string {
  return PLATFORM_CONFIG[platform]?.placeholder || "https://example.com";
}

// Get display label for a platform
function getPlatformLabel(platform: string): string {
  return PLATFORM_CONFIG[platform]?.label || platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function EditProfileModal({
  isOpen,
  onClose,
  user,
  onUserUpdate,
}: EditProfileModalProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Form state
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [location, setLocation] = useState(user.location || "");
  const [school, setSchool] = useState(user.school || "");
  const [hourlyRate, setHourlyRate] = useState<number | string>(
    user.hourlyRate ? (typeof user.hourlyRate === 'number' ? user.hourlyRate * 100 : parseFloat(user.hourlyRate) * 100) : ""
  ); // Convert AYA to mAYA for display
  const [hasSkills, setHasSkills] = useState<string[]>(user.hasSkills || []);
  const [wantSkills, setWantSkills] = useState<string[]>(user.wantSkills || []);
  
  // Social media links state (dynamic array)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(user.socialLinks || []);
  
  // Username validation state
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Reset form when user changes
  useEffect(() => {
    setAvatar(user.avatar || "");
    setUsername(user.username || "");
    setBio(user.bio || "");
    setLocation(user.location || "");
    setSchool(user.school || "");
    setHourlyRate(
      user.hourlyRate ? (typeof user.hourlyRate === 'number' ? user.hourlyRate * 100 : parseFloat(user.hourlyRate) * 100) : ""
    ); // Convert AYA to mAYA for display
    setHasSkills(user.hasSkills || []);
    setWantSkills(user.wantSkills || []);
    setSocialLinks(user.socialLinks || []);
    setError(null);
    setUsernameError(null);
    setUsernameAvailable(null);
  }, [user, isOpen]);

  // Debounced username availability check
  useEffect(() => {
    const checkUsername = async () => {
      const trimmedUsername = username.trim();
      
      // Reset state
      setUsernameError(null);
      setUsernameAvailable(null);
      
      // Skip if empty or unchanged
      if (!trimmedUsername) {
        return;
      }
      
      // Validate format
      if (trimmedUsername.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        setUsernameAvailable(false);
        return;
      }
      
      if (trimmedUsername.length > 30) {
        setUsernameError('Username must be at most 30 characters');
        setUsernameAvailable(false);
        return;
      }
      
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
        setUsernameAvailable(false);
        return;
      }
      
      // If username hasn't changed, mark as available
      if (trimmedUsername === user.username) {
        setUsernameAvailable(true);
        return;
      }
      
      // Check availability
      setCheckingUsername(true);
      try {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
        const result = await usersApi.checkUsernameAvailability(trimmedUsername);
        setUsernameAvailable(result.available);
        if (!result.available) {
          setUsernameError('Username is already taken');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameError('Failed to check username availability');
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    };
    
    const timeoutId = setTimeout(checkUsername, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [username, user.username, getToken]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    try {
      // Get auth token
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      // Upload file
      const fileUrl = await uploadFile(file, 'avatar');
      setAvatar(fileUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingAvatar(false);
      // Reset input
      event.target.value = '';
    }
  };

  // Social links handlers
  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: 'website', url: '', label: '' }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Get token and set it for API calls
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }
      
      // Convert hourlyRate to number, handling empty strings
      // If empty string, don't include it (preserves original value on backend)
      // If valid number (including 0), include it
      let hourlyRateValue: number | undefined = undefined;
      if (hourlyRate !== "" && hourlyRate !== null && hourlyRate !== undefined) {
        const numValue = typeof hourlyRate === 'number' ? hourlyRate : parseFloat(String(hourlyRate));
        if (!isNaN(numValue)) {
          hourlyRateValue = numValue / 100; // Convert mAYA input to AYA for storage
        }
      }
      
      // Validate username before submitting
      const trimmedUsername = username.trim();
      if (trimmedUsername && usernameError) {
        setError('Please fix the username errors before saving');
        return;
      }
      
      if (trimmedUsername && usernameAvailable === false) {
        setError('Username is not available. Please choose a different one.');
        return;
      }

      // Filter out empty social links and clean up data
      const validSocialLinks = socialLinks
        .filter(link => link.url.trim() !== '')
        .map(link => ({
          platform: link.platform,
          url: link.url.trim(),
          ...(link.label?.trim() ? { label: link.label.trim() } : {}),
        }));
      
      const updateData: UpdateUserDto = {
        avatar: avatar || undefined,
        username: trimmedUsername || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        school: school.trim() || undefined,
        ...(hourlyRateValue !== undefined ? { hourlyRate: hourlyRateValue } : {}),
        hasSkills,
        wantSkills,
        socialLinks: validSocialLinks,
      };
      
      const response = await usersApi.updateUserProfile(updateData);
      onUserUpdate(response.user);
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and skills.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24 border-2 border-primary-200">
              <AvatarImage src={avatar} alt="Profile" />
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingAvatar || loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar || loading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                  </span>
                </Button>
              </label>
            </div>
            {uploadingAvatar && (
              <p className="text-xs text-muted-foreground">Uploading image...</p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="e.g., johndoe123"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                  setUsername(value);
                }}
                maxLength={30}
                className={usernameError ? "border-destructive" : usernameAvailable === true ? "border-green-500" : ""}
              />
              {checkingUsername && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!checkingUsername && usernameAvailable === true && username.trim() && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
              )}
            </div>
            {usernameError ? (
              <p className="text-xs text-destructive">{usernameError}</p>
            ) : username.trim() && usernameAvailable === true ? (
              <p className="text-xs text-green-600">Username is available</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                3-30 characters, letters, numbers, underscores, and hyphens only
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., New York, USA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your city or general location
            </p>
          </div>

          {/* School/Institution */}
          <div className="space-y-2">
            <Label htmlFor="school">School/Institution</Label>
            <Input
              id="school"
              placeholder="e.g., MIT, Harvard University"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your school, university, or institution name
            </p>
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate (<span className="text-xs">m</span>AYA)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">🪙</span>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={hourlyRate === "" ? "" : hourlyRate}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setHourlyRate("");
                  } else {
                    const numValue = parseInt(value);
                    setHourlyRate(isNaN(numValue) ? "" : numValue);
                  }
                }}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Set your hourly rate in mAYA tokens for teaching sessions. Leave empty or 0 to not display a rate.
            </p>
          </div>

          {/* Social Media Links - Dynamic */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Social Media Links</Label>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSocialLink}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Link
              </Button>
            </div>
            
            {socialLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                No social links added yet. Click &quot;Add Link&quot; to add your profiles.
              </p>
            ) : (
              <div className="space-y-3">
                {socialLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    {/* Platform Selector */}
                    <Select
                      value={link.platform}
                      onValueChange={(value) => updateSocialLink(index, 'platform', value)}
                    >
                      <SelectTrigger className="w-[140px] shrink-0">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <span className={getPlatformColor(link.platform)}>
                              {getPlatformIcon(link.platform)}
                            </span>
                            <span className="truncate">{getPlatformLabel(link.platform)}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            <div className="flex items-center gap-2">
                              <span className={getPlatformColor(platform)}>
                                {getPlatformIcon(platform)}
                              </span>
                              <span>{getPlatformLabel(platform)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* URL Input */}
                    <div className="flex-1 space-y-1">
                      <Input
                        type="url"
                        placeholder={getPlatformPlaceholder(link.platform)}
                        value={link.url}
                        onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                      />
                      {/* Custom label input for custom platform */}
                      {link.platform === 'custom' && (
                        <Input
                          type="text"
                          placeholder="Custom label (e.g., My Blog)"
                          value={link.label || ''}
                          onChange={(e) => updateSocialLink(index, 'label', e.target.value)}
                          className="mt-1"
                        />
                      )}
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSocialLink(index)}
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills I Can Teach */}
          <SkillInput
            label="Skills I Can Teach"
            placeholder="Type skills separated by commas (e.g., JavaScript, React, Node.js)..."
            selectedSkills={hasSkills}
            onSkillsChange={setHasSkills}
            maxSkills={20}
          />

          {/* Skills I Want to Learn */}
          <SkillInput
            label="Skills I Want to Learn"
            placeholder="Type skills separated by commas (e.g., Python, Machine Learning, AWS)..."
            selectedSkills={wantSkills}
            onSkillsChange={setWantSkills}
            maxSkills={20}
          />

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
