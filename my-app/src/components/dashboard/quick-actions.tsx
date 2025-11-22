"use client";

import { Plus, Calendar } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
          <Link href="/create-study-room" className="w-full">
            <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4">
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Create Room</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            className="w-full h-auto flex-col gap-2 py-4"
            onClick={() => {
              document.getElementById('calendar-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">Calendar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
