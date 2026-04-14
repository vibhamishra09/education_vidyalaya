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
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
          <section className="relative mb-8 overflow-hidden rounded-[36px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,249,255,0.98))] p-6 shadow-[0_34px_100px_-52px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_50%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_55%)]" />

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
                  <Badge className="rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    Feed replaces Browse
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <p className="font-tagline text-xs uppercase tracking-[0.24em] text-slate-500">
                      Premium dashboard stream
                    </p>
                  </div>
                  <h1 className="font-tagline text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                    Community Feed
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    A richer, post-style stream for study rooms and debates, with cover
                    visuals, live context, host credibility, and infinite scrolling built in.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white/90 px-3 py-1 shadow-sm">Cover-led cards</span>
                  <span className="rounded-full bg-white/90 px-3 py-1 shadow-sm">Live room discovery</span>
                  <span className="rounded-full bg-white/90 px-3 py-1 shadow-sm">Creator signals</span>
                  <span className="rounded-full bg-white/90 px-3 py-1 shadow-sm">Infinite feed</span>
                </div>
              </div>

              {!isSignedIn ? (
                <div className="flex flex-col gap-3 lg:items-end">
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Sign in to unlock your personalized stream.
                  </p>
                  <SignInButton mode="modal">
                    <Button className="h-11 rounded-full px-5">Open your feed</Button>
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
