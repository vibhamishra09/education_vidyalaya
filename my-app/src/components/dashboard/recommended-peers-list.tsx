'use client';

import React from 'react';
import { useRecommendedPeers, useFollowUser, useCurrentUser } from '@/hooks/use-users';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Star, MapPin, GraduationCap, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface RecommendedPeersListProps {
  limit?: number;
  enabled?: boolean;
}

export function RecommendedPeersList({ limit = 6, enabled = true }: RecommendedPeersListProps) {
  const { data: recommendations, isLoading, error } = useRecommendedPeers(limit, enabled);
  const { data: currentUser } = useCurrentUser();
  const followMutation = useFollowUser();

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !recommendations || recommendations.length === 0) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-center">
        <p className="text-slate-400 text-sm">
          No specific recommendations yet. Try adding more "Want to Learn" skills in your profile!
        </p>
      </div>
    );
  }

  const handleFollow = async (userId: string, name: string) => {
    try {
      await followMutation.mutateAsync(userId);
      toast.success(`You are now following ${name}`);
    } catch (err) {
      toast.error('Failed to follow user');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recommendations.map((user) => (
        <div 
          key={user.id} 
          className="group relative p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300 hover:border-emerald-500/30"
        >
          <div className="flex items-start justify-between mb-3">
            <Link href={`/profile/${user.username || user.id}`} className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-slate-800 group-hover:border-emerald-500/50 transition-colors">
                <AvatarImage src={user.avatar || ''} />
                <AvatarFallback className="bg-slate-800 text-slate-300 font-bold uppercase text-lg">
                  {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {user.name}
                </span>
                <span className="text-xs text-emerald-500/80 font-medium tracking-tight">
                  @{user.username || 'user'}
                </span>
              </div>
            </Link>
            
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 rounded-lg border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-300"
              onClick={() => handleFollow(user.id, user.name)}
              disabled={followMutation.isPending}
            >
              {followMutation.isPending ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <div className="flex items-center gap-1.5 font-bold">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+Follow</span>
                </div>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {user.bio && (
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {user.bio}
              </p>
            )}

            {/* User Details */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {user.location && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  <MapPin className="h-3 w-3 text-slate-600" />
                  {user.location}
                </div>
              )}
              {user.school && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  <GraduationCap className="h-3 w-3 text-slate-600" />
                  {user.school}
                </div>
              )}
            </div>

            {/* Skills Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {user.userSkills?.filter((s: any) => s.type === 'HAS').slice(0, 3).map((s: any) => (
                <span 
                  key={s.id} 
                  className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400/90 tracking-tight"
                >
                  {s.skill.name}
                </span>
              ))}
              {(user.userSkills?.filter((s: any) => s.type === 'HAS').length || 0) > 3 && (
                <span className="text-[10px] text-slate-600 font-bold items-center flex pl-1">
                  +{(user.userSkills?.filter((s: any) => s.type === 'HAS').length || 0) - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
