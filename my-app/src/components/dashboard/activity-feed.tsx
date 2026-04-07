"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  IndianRupee,
  Radio,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useDashboardFeed } from "@/hooks/use-dashboard";
import {
  ActivityFeedItem,
  ActivityFeedReason,
  FeedMode,
} from "@/types/api.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const FEED_TABS: Array<{ value: FeedMode; label: string }> = [
  { value: "for_you", label: "For You" },
  { value: "following", label: "Following" },
];

function formatWhen(startsAt?: string | null, isLive?: boolean): string {
  if (isLive) {
    return "Live now";
  }

  if (!startsAt) {
    return "Happening soon";
  }

  const date = new Date(startsAt);
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function reasonLabel(reason: ActivityFeedReason): string {
  switch (reason) {
    case "following":
      return "Following";
    case "trending":
      return "Trending";
    case "free":
      return "Free";
    case "low_cost":
      return "Low cost";
    case "new":
      return "New";
    case "limited_seats":
      return "Few seats left";
    case "live":
      return "Live";
    case "upcoming":
      return "Upcoming";
    case "mentor":
      return "Top mentor";
    case "interest_match":
      return "Matches you";
    default:
      return reason;
  }
}

function reasonIcon(reason: ActivityFeedReason) {
  switch (reason) {
    case "trending":
      return <TrendingUp className="h-3.5 w-3.5" />;
    case "free":
    case "low_cost":
      return <IndianRupee className="h-3.5 w-3.5" />;
    case "live":
      return <Radio className="h-3.5 w-3.5" />;
    case "following":
    case "mentor":
      return <Users className="h-3.5 w-3.5" />;
    default:
      return <Sparkles className="h-3.5 w-3.5" />;
  }
}

function FeedCard({ item }: { item: ActivityFeedItem }) {
  const primaryReasons = item.reasons.slice(0, 3);
  const avatarFallback = item.host.name?.charAt(0)?.toUpperCase() || "W";

  return (
    <Card className="border-border/60 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              {primaryReasons.map((reason) => (
                <Badge
                  key={`${item.id}-${reason}`}
                  variant="secondary"
                  className="gap-1 rounded-full px-2.5 py-1"
                >
                  {reasonIcon(reason)}
                  {reasonLabel(reason)}
                </Badge>
              ))}
            </div>

            <div className="mb-3 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={item.host.avatar || undefined} alt={item.host.name} />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.host.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatWhen(item.startsAt, item.isLive)}
                </p>
              </div>
            </div>

            <h4 className="text-lg font-semibold leading-tight">{item.headline}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{item.subheadline}</p>

            {item.description ? (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1">
                {item.entityType === "study_room" ? "Study room" : "Debate room"}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1">
                {item.participantCount}/{item.maxParticipants} joined
              </span>
              {typeof item.seatsLeft === "number" && item.seatsLeft >= 0 ? (
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {item.seatsLeft} seats left
                </span>
              ) : null}
              {typeof item.price === "number" ? (
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {item.price === 0 ? "Free" : `₹${item.price}`}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link href={item.href}>
              <Button className={cn(item.isLive ? "shadow-sm" : "")}>
                {item.ctaLabel}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ActivityFeed() {
  const [mode, setMode] = useState<FeedMode>("for_you");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useDashboardFeed(mode, 8);

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data?.pages],
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-orange-500" />
              Activity Feed
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Discover live rooms, trending debates, and people worth joining.
            </p>
          </div>

          <div className="grid h-9 w-full grid-cols-2 rounded-md bg-muted p-1 sm:w-[200px]">
            {FEED_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={cn(
                  "rounded-sm px-3 text-sm font-medium transition-all",
                  mode === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMode(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <FeedSkeleton /> : null}

        {!isLoading && items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">
              {mode === "following"
                ? "Follow a few peers to build your following feed."
                : "Your feed will light up as new rooms and debates appear."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Trending sessions, low-cost rooms, and active creators will appear here.
            </p>
          </div>
        ) : null}

        {!isLoading && items.length > 0
          ? items.map((item) => <FeedCard key={item.id} item={item} />)
          : null}

        <div ref={loadMoreRef} className="h-4" />

        {isFetchingNextPage ? (
          <div className="space-y-4 pt-2">
            <FeedSkeleton />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
