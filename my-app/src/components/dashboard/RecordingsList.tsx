'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  Video, Play, Download, Trash2, Clock, Calendar, 
  DollarSign, AlertCircle, Loader2, ExternalLink,
  ChevronRight, Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import { Recording } from '@/hooks/use-recording';
import { format } from 'date-fns';

export function RecordingsList() {
  const { getToken } = useAuth();
  const { showSuccess, showError } = useToast();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recording`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecordings(data);
      } else {
        throw new Error('Failed to fetch recordings');
      }
    } catch (err) {
      showError('Error', 'Could not load recordings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const filteredRecordings = recordings.filter(rec => 
    rec.room?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
        <p className="text-white/50 text-sm animate-pulse">Loading your recordings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a]/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Video className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Session Recordings</h2>
            <p className="text-white/40 text-xs font-medium">Access and manage your saved lessons</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-sky-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by room title..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
          />
        </div>
      </div>

      {filteredRecordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[#1a1a1a]/20 rounded-[32px] border-2 border-dashed border-white/5">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-white/20" />
          </div>
          <h3 className="text-white font-semibold text-lg">No recordings found</h3>
          <p className="text-white/40 text-sm mt-1">
            {searchQuery ? "Try adjusting your search query" : "Your recorded sessions will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecordings.map((rec) => (
            <div 
              key={rec.id} 
              className="group relative bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:border-sky-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/5"
            >
              <div className="p-5 flex flex-col gap-4">
                {/* Status & Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${rec.status === 'COMPLETED' ? 'bg-[#00DC6E]' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                      {rec.status === 'COMPLETED' ? 'Ready' : 'Processing'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/40">
                    <Calendar className="h-3 w-3" />
                    <span className="text-[10px] font-medium">{format(new Date(rec.createdAt), 'MMM d, yyyy • HH:mm')}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-white font-bold text-base md:text-lg group-hover:text-sky-400 transition-colors line-clamp-1">
                  {rec.room?.title || 'Untitled Session'}
                </h3>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <div className="bg-white/5 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">Duration</p>
                      <p className="text-sm font-bold text-white">{rec.duration ? `${Math.floor(rec.duration / 60)}m ${rec.duration % 60}s` : '--'}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">Est. Cost</p>
                      <p className="text-sm font-bold text-white">${rec.estimatedCost || '0.00'}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {rec.status === 'COMPLETED' && rec.url ? (
                    <>
                      <Button 
                        onClick={() => window.open(rec.url!, '_blank')}
                        className="flex-1 bg-white hover:bg-sky-50 text-black font-bold text-xs rounded-xl h-10 shadow-lg active:scale-95 transition-all gap-2"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Watch Now
                      </Button>
                      <Button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = rec.url!;
                          link.download = `recording-${rec.id}.mp4`;
                          link.click();
                        }}
                        variant="secondary"
                        className="h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white rounded-xl active:scale-95 transition-all border border-white/5"
                        title="Download MP4"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      disabled
                      className="flex-1 bg-white/5 text-white/30 font-bold text-xs rounded-xl h-10 border border-white/5 gap-2"
                    >
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing Video
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar for non-completed */}
              {rec.status !== 'COMPLETED' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
                  <div className="h-full bg-sky-500 animate-progress origin-left" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
