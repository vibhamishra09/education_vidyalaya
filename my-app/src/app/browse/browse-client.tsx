"use client";

import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import { ArrowLeft, Flame, Sparkles } from "lucide-react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function BrowseClient() {
  const { isSignedIn } = useUser();

  return (
    <div className="flex min-h-screen flex-col bg-muted/5 selection:bg-primary/10">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-16 lg:px-8">
          <section className="relative mb-12 overflow-hidden rounded-[48px] border border-white/40 bg-white/30 p-8 shadow-[0_40px_100px_-40px_rgba(15,23,42,0.25)] backdrop-blur-2xl sm:p-10 lg:p-14 glass-premium transition-all duration-700">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(14,165,233,0.12),transparent_45%)]" />
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-[80px]" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sky-400/10 blur-[80px]" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  {isSignedIn ? (
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Dashboard
                    </Link>
                  ) : null}

                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-900">
                    <div className="flex h-10 w-10 animate-float items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 shadow-inner">
                      <Flame className="h-6 w-6" />
                    </div>
                    <p className="font-tagline text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
                      Premium dashboard stream
                    </p>
                  </div>
                  <h1 className="font-tagline text-5xl font-extrabold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                    Community <span className="text-gradient">Feed</span>
                  </h1>
                  <p className="max-w-xl text-base leading-relaxed text-slate-600/90 sm:text-lg">
                    A richer, post-style stream for study rooms and debates, with cover
                    visuals, live context, host credibility, and infinite scrolling built in.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="rounded-full bg-white/60 px-4 py-1.5 shadow-sm ring-1 ring-slate-200/50 backdrop-blur transition hover:bg-white hover:ring-emerald-200">Cover-led cards</span>
                  <span className="rounded-full bg-white/60 px-4 py-1.5 shadow-sm ring-1 ring-slate-200/50 backdrop-blur transition hover:bg-white hover:ring-emerald-200">Live room discovery</span>
                  <span className="rounded-full bg-white/60 px-4 py-1.5 shadow-sm ring-1 ring-slate-200/50 backdrop-blur transition hover:bg-white hover:ring-emerald-200">Creator signals</span>
                </div>
              </div>

              {!isSignedIn ? (
                <div className="flex flex-col gap-4 lg:items-end">
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50/50 px-4 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Sign in to unlock your personalized stream.
                  </div>
                  <SignInButton mode="modal">
                    <Button className="group h-14 rounded-full bg-slate-950 px-8 text-base shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] transition-all hover:bg-slate-800 hover:shadow-[0_25px_50px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 active:translate-y-0">
                      Open your feed
                      <ArrowLeft className="ml-2 h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </SignInButton>
                </div>
              ) : null}
            </div>
          </section>

          <ActivityFeed variant="page" limit={6} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
