import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

export function Footer() {
  // Landing site URL for Terms and Privacy Policy
  const _landingSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://webyalaya.com";
  
  const socialLinks = [
    { icon: Linkedin, label: "LinkedIn", url: "https://www.linkedin.com/company/webyalaya/?viewAsMember=true" },
    { icon: Facebook, label: "Facebook", url: "https://facebook.com/webyalaya" },
    { icon: Instagram, label: "Instagram", url: "https://www.instagram.com/webyalaya" },
    { icon: Youtube, label: "YouTube", url: "http://www.youtube.com/@webyalaya" },
  ];

  return (
    <footer className="mt-6 border-t border-black/5 bg-background/60">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/webyalaya-main-logo.svg"
                alt="Webyalaya logo"
                width={96}
                height={96}
                className="object-contain"
                priority={false}
              />
            </Link>
            <p className="max-w-xs text-xs leading-snug text-muted-foreground">
              Made by Indians. Loved by Learners
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
          >
            <Link
              className="hover:text-foreground transition-colors"
              href="/about"
            >
              About
            </Link>
            <Link
              className="hover:text-foreground transition-colors"
              href="/careers"
            >
              Careers
            </Link>
            <Link
              className="hover:text-foreground transition-colors"
              href="/terms-of-use"
            >
              Terms of Use
            </Link>
            <Link
              className="hover:text-foreground transition-colors"
              href="/privacy-policy"
            >
              Privacy Policy
            </Link>
            <span className="hidden sm:inline text-muted-foreground/60">•</span>
            <span className="whitespace-nowrap">© {new Date().getFullYear()} Humitra Pvt Ltd. All rights reserved.</span>
          </nav>

          <div className="flex items-center gap-1">
            {socialLinks.map(({ icon: Icon, label, url }) => (
              <Link
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-black/5 pt-3">
          <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80 sm:text-left">
            Incubated At & Recognized By
          </p>
          <div className="mx-auto w-full max-w-4xl sm:mx-0">
            <Image
              src="/incubated-recognized-strip.png"
              alt="Incubated at and recognized by JIIT, UIML EIC, STPI, Shiv Nadar Atal Incubation Centre, DPIIT Startup India, and MeitY Startup Hub"
              width={1360}
              height={114}
              className="h-auto w-full object-contain"
              sizes="(max-width: 768px) 100vw, 900px"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
