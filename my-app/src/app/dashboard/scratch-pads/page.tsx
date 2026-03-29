"use client";

import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { ScratchPadHistory } from "@/components/scratch-pad/ScratchPadHistory";
import { Button } from "@/components/ui/button";
import { ChevronLeft, PencilLine } from "lucide-react";
import Link from "next/link";

export default function ScratchPadsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/5">
      <Navigation />

      <main className="flex-1 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2 transition-colors">
                <ChevronLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <PencilLine className="h-8 w-8 text-purple-600" />
                Your Scratch Pads
              </h1>
              <p className="text-muted-foreground">
                View, edit, and export all your collaborative drawings from past sessions.
              </p>
            </div>
          </div>

          {/* History List */}
          <section>
            <ScratchPadHistory />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
