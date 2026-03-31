"use client";

import { useParams, useRouter } from "next/navigation";
import { ScratchPad } from "@/components/scratch-pad/ScratchPad";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Share2, Download, Save } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function StandaloneScratchPadPage() {
  const params = useParams<{ room: string }>();
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoaded) return null;

  if (!isSignedIn) {
    router.push("/auth/sign-in");
    return null;
  }

  const roomId = params?.room;

  if (!roomId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-white">
        Invalid Room ID
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/scratch-pads">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div className="h-6 w-[1px] bg-white/10 mx-2" />
          <h1 className="font-semibold text-lg">Scratch Pad Editor</h1>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase tracking-wider">
            Solo Mode
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-zinc-800 border-white/10 hover:bg-zinc-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            Saved
          </Button>
          <Button variant="outline" size="sm" className="bg-zinc-800 border-white/10 hover:bg-zinc-700 text-white">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      {/* Editor Container */}
      <main className="flex-1 relative">
        <ScratchPad 
          roomId={roomId as string} 
          isHost={true} // In solo mode, treated as "host" for auto-save
          canEdit={true}
        />
      </main>
    </div>
  );
}
