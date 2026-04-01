import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Star, BrainCircuit, ExternalLink, Sparkles } from 'lucide-react';
import type { BrowsePeer } from '@/types/api.types';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PeerCardProps {
  peer: BrowsePeer;
}

export function PeerCardComponent({ peer }: PeerCardProps) {
  const { name, avatar, bio, skills, rating, reviewCount, totalSessions } = peer;
  const initial = name.charAt(0).toUpperCase();

  // Glassy Emerald Theme consistent with StudyRoomCard
  const theme = {
    border: "border-emerald-100 dark:border-emerald-900",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-800",
    gradient: "from-card to-emerald-50/30 dark:to-emerald-950/10",
    badge: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    button: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border border-emerald-500/20 dark:text-emerald-400 shadow-sm",
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="h-full group"
    >
      <Link href={`/profile/${peer.id}`} className="block h-full">
        <Card className={cn(
          "h-full flex flex-col p-3 bg-gradient-to-br transition-all duration-300 border shadow-sm hover:shadow-lg relative overflow-hidden",
          theme.gradient,
          theme.border,
          theme.hoverBorder
        )}>
          
          {/* Top Row: Stats & Rating */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 shadow-sm">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold tabular-nums">
                    {rating ? rating.toFixed(1) : "New"}
                </span>
                {reviewCount ? (
                    <span className="text-[10px] text-muted-foreground/80">
                        ({reviewCount})
                    </span>
                ) : null}
            </div>

            {totalSessions && totalSessions > 0 ? (
                <div className="flex items-center gap-1.5 text-muted-foreground/80 bg-background/30 px-2 py-0.5 rounded-full text-xs">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    <span>{totalSessions} sessions</span>
                </div>
            ) : null}

            {peer.matchScore !== undefined && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="h-3 w-3 fill-emerald-500" />
                    <span>{Math.round(peer.matchScore * 100)}% Match</span>
                </div>
            )}
          </div>

          {/* Main Profile Info */}
          <div className="flex items-start gap-3 mb-2">
            <Avatar className="h-12 w-12 border-2 border-emerald-100 dark:border-emerald-900 shadow-sm group-hover:scale-105 transition-transform">
              <AvatarImage src={avatar} alt={name} className="object-cover" />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-900 dark:text-emerald-300">
                {initial}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 space-y-0.5">
              <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
                {name}
              </h3>
              {bio ? (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-[2rem]">
                  {bio}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic h-[2rem] flex items-center">
                  Ready to learn together
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-border/60 my-2" />

          {/* Bottom: Skills & Action */}
          <div className="mt-auto space-y-2">
              {/* Skills */}
              <div className="flex items-center gap-1.5 overflow-hidden flex-wrap h-[24px]">
                {skills.map((skill, i) => {
                  const isMatched = peer.matchedSkills?.some((s: string) => s.toLowerCase() === skill.toLowerCase());
                  if (i >= 3 && !isMatched) return null; // Show only first 3 plus matched ones? No, let's keep it simple.
                  // Actually, let's prioritize matched skills in the display.
                  return null;
                }).filter(x => x)}
                {/* Refined logic: Show up to 3 skills, prioritizing matched ones */}
                {(() => {
                  const sortedSkills = [...skills].sort((a, b) => {
                    const aMatched = peer.matchedSkills?.some((s: string) => s.toLowerCase() === a.toLowerCase());
                    const bMatched = peer.matchedSkills?.some((s: string) => s.toLowerCase() === b.toLowerCase());
                    if (aMatched && !bMatched) return -1;
                    if (!aMatched && bMatched) return 1;
                    return 0;
                  });
                  
                  return sortedSkills.slice(0, 3).map((skill, i) => {
                    const isMatched = peer.matchedSkills?.some((s: string) => s.toLowerCase() === skill.toLowerCase());
                    return (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] font-medium px-1.5 h-5 border-0 transition-all",
                          isMatched 
                            ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600/20" 
                            : theme.badge
                        )}
                      >
                        {skill}
                      </Badge>
                    );
                  });
                })()}
                {skills.length > 3 && (
                    <span className="text-[10px] text-muted-foreground font-medium pl-0.5">
                        +{skills.length - 3}
                    </span>
                )}
             </div>

             {/* Action Button */}
             <Button 
                variant="ghost" 
                className={cn("w-full justify-between group/btn h-8 rounded-lg font-semibold text-xs", theme.button)}
                asChild
             >
                <div>
                   <span>View Profile</span>
                   <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
                </div>
             </Button>
          </div>

        </Card>
      </Link>
    </motion.div>
  );
}
