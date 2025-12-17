"use client";

import { Linkedin, Github, Globe, Youtube, Instagram } from "lucide-react";
import { SocialLink } from "@/types/api.types";

// Platform icon configuration for rendering
const PLATFORM_ICONS: Record<string, { 
  icon: React.ReactNode; 
  hoverColor: string;
  label: string;
}> = {
  linkedin: {
    icon: <Linkedin className="h-4 w-4" />,
    hoverColor: "hover:text-[#0A66C2]",
    label: "LinkedIn",
  },
  twitter: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    hoverColor: "hover:text-foreground",
    label: "X (Twitter)",
  },
  github: {
    icon: <Github className="h-4 w-4" />,
    hoverColor: "hover:text-foreground",
    label: "GitHub",
  },
  youtube: {
    icon: <Youtube className="h-4 w-4" />,
    hoverColor: "hover:text-[#FF0000]",
    label: "YouTube",
  },
  instagram: {
    icon: <Instagram className="h-4 w-4" />,
    hoverColor: "hover:text-[#E4405F]",
    label: "Instagram",
  },
  website: {
    icon: <Globe className="h-4 w-4" />,
    hoverColor: "hover:text-primary",
    label: "Website",
  },
  custom: {
    icon: <Globe className="h-4 w-4" />,
    hoverColor: "hover:text-primary",
    label: "Link",
  },
};

// Get the icon configuration for a platform
function getPlatformConfig(platform: string) {
  return PLATFORM_ICONS[platform] || PLATFORM_ICONS.custom;
}

interface SocialLinksDisplayProps {
  socialLinks?: SocialLink[];
  size?: "sm" | "md" | "lg";
  maxDisplay?: number;
  className?: string;
}

export function SocialLinksDisplay({ 
  socialLinks, 
  size = "md",
  maxDisplay,
  className = ""
}: SocialLinksDisplayProps) {
  if (!socialLinks || socialLinks.length === 0) return null;

  const displayLinks = maxDisplay ? socialLinks.slice(0, maxDisplay) : socialLinks;
  const remainingCount = maxDisplay && socialLinks.length > maxDisplay 
    ? socialLinks.length - maxDisplay 
    : 0;

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const gapClasses = {
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-2.5",
  };

  return (
    <div className={`flex items-center ${gapClasses[size]} ${className}`}>
      {displayLinks.map((link, index) => {
        const config = getPlatformConfig(link.platform);
        const label = link.label || config.label;
        
        return (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-muted-foreground ${config.hoverColor} transition-colors`}
            title={label}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={sizeClasses[size]}>
              {config.icon}
            </span>
          </a>
        );
      })}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground">+{remainingCount}</span>
      )}
    </div>
  );
}
