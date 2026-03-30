"use client";

import { useScratchPadHistory } from "@/hooks/use-scratch-pad-history";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PencilLine, Clock, ChevronRight, User } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function ScratchPadHistory() {
  const { data: history, isLoading, error } = useScratchPadHistory();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !history || history.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <PencilLine className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl mb-2">No Scratch Pads Yet</CardTitle>
          <CardDescription className="max-w-xs mx-auto">
            Use the scratch pad during your study, peer, or debate sessions and they&apos;ll show up here for later review and edits.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {history.map((pad) => (
        <Card key={pad.roomId} className="group hover:shadow-lg transition-all duration-300 border-border/60 overflow-hidden bg-card hover:border-purple-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg line-clamp-1 group-hover:text-purple-500 transition-colors">
              {pad.roomTitle || "Untitled Session"}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" />
              Last edited {formatDistanceToNow(new Date(pad.lastUpdated), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={`p-1 rounded ${pad.isHost ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {pad.isHost ? "Creator" : "Participant"}
                </div>
              </div>
              <Link href={`/scratch-pad/${pad.roomId}`}>
                <Button size="sm" variant="ghost" className="group-hover:translate-x-1 transition-transform p-0 hover:bg-transparent text-purple-600 font-medium">
                  View & Edit
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
