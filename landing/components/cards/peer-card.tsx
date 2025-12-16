import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Star, Users } from 'lucide-react';
import { SocialLinksDisplay } from '@/components/ui/social-links-display';
import type { BrowsePeer } from '@/types/api.types';

interface PeerCardProps {
  peer: BrowsePeer;
}

export function PeerCardComponent({ peer }: PeerCardProps) {
  const { name, avatar, bio, skills, rating, reviewCount, totalSessions, socialLinks } = peer;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Link href={`/profile/${peer.id}`} className="shrink-0">
            <Avatar className="h-16 w-16 ring-4 ring-primary/20 cursor-pointer hover:ring-primary/40 transition-all">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/profile/${peer.id}`} className="hover:underline">
                <h3 className="font-semibold text-lg truncate">{name}</h3>
              </Link>
              <SocialLinksDisplay socialLinks={socialLinks} size="sm" maxDisplay={4} />
            </div>
            {bio && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{bio}</p>
            )}
            {/* Rating and Sessions */}
            <div className="flex items-center gap-3 mt-2">
              {rating !== null && rating !== undefined ? (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                  {reviewCount !== undefined && reviewCount > 0 && (
                    <span className="text-xs text-muted-foreground">({reviewCount})</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span className="text-xs">No reviews</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">{totalSessions ?? 0} sessions</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Skills:</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/profile/${peer.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            View Profile
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
