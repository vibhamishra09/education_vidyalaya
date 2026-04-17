import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

const socialLinks = [
  {
    icon: Linkedin,
    label: "LinkedIn",
    url: "https://www.linkedin.com/company/webyalaya/?viewAsMember=true",
  },
  { icon: Facebook, label: "Facebook", url: "https://facebook.com/webyalaya" },
  {
    icon: Instagram,
    label: "Instagram",
    url: "https://www.instagram.com/webyalaya",
  },
  { icon: Youtube, label: "YouTube", url: "http://www.youtube.com/@webyalaya" },
] as const;

export function Footer() {
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
              className="transition-colors hover:text-foreground"
              href="/about"
            >
              About
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="/careers"
            >
              Careers
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="/terms-of-use"
            >
              Terms of Use
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="/privacy-policy"
            >
              Privacy Policy
            </Link>
            <span className="hidden text-muted-foreground/60 sm:inline">
              &middot;
            </span>
            <span className="whitespace-nowrap">
              &copy; {new Date().getFullYear()} Humitra Pvt Ltd. All rights
              reserved.
            </span>
          </nav>

          <div className="flex items-center gap-1">
            {socialLinks.map(({ icon: Icon, label, url }) => (
              <Link
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-black/5 pt-4">
          <div className="relative overflow-hidden rounded-[28px] border border-primary/10 bg-[linear-gradient(135deg,rgba(0,220,110,0.10),rgba(0,140,210,0.05),rgba(255,255,255,0.98))] px-4 py-5 shadow-[0_20px_60px_-45px_rgba(0,78,50,0.45)] sm:px-6 sm:py-6">
            <div className="pointer-events-none absolute -left-10 top-0 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-8 bottom-0 h-32 w-32 rounded-full bg-secondary/10 blur-3xl" />

            <div className="relative">
              <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 sm:text-left">
                Incubated At & Recognized By
              </p>

              <div className="mx-auto max-w-5xl rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-[0_24px_55px_-36px_rgba(15,23,42,0.55)] backdrop-blur-sm sm:p-5">
                <div className="rounded-[20px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,244,246,0.86))] p-3 sm:p-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="w-[700px] sm:w-full">
                    <Image
                      src="/incubated-recognized-strip.png"
                      alt="Incubated at and recognized by JIIT, UIML EIC, STPI, Shiv Nadar Atal Incubation Centre, DPIIT Startup India, and MeitY Startup Hub"
                      width={1360}
                      height={114}
                      className="h-auto w-full object-contain pointer-events-none"
                      sizes="(max-width: 768px) 700px, 900px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
