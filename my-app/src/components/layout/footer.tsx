import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

const socialLinks = [
  {
    icon: Linkedin,
    label: "LinkedIn",
    url: "https://www.linkedin.com/company/we/?viewAsMember=true",
  },
  { icon: Facebook, label: "Facebook", url: "https://facebook.com/we" },
  {
    icon: Instagram,
    label: "Instagram",
    url: "https://www.instagram.com/we",
  },
  { icon: Youtube, label: "YouTube", url: "http://www.youtube.com/@we" },
] as const;

export function Footer() {
  return null;
}

