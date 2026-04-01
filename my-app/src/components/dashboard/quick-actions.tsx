"use client";

import { Plus, Calendar, PencilLine } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/create-study-room" className="w-full">
            <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 shadow-sm border-border/60 hover:bg-sky-50 hover:text-sky-600 transition-all">
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Create Room</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            className="w-full h-auto flex-col gap-2 py-4 shadow-sm border-border/60 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
            onClick={() => {
              document.getElementById('calendar-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">Calendar</span>
          </Button>

          <Link href="/dashboard/scratch-pads" className="w-full">
            <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 shadow-sm border-border/60 hover:bg-purple-50 hover:text-purple-600 transition-all">
              <PencilLine className="h-5 w-5" />
              <span className="text-sm font-medium">Scratch Pads</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
