"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  Check,
  Flame,
  Loader2,
  Radio,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  Search,
  Zap,
} from "lucide-react";
import { useDashboardFeed } from "@/hooks/use-dashboard";
import { useSearchUsers, useFollowUser, useCurrentUser } from "@/hooks/use-users";
import { RecommendedPeersList } from "./recommended-peers-list";
import {
  ActivityFeedItem,
  ActivityFeedReason,
  FeedMode,
} from "@/types/api.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const FEED_TABS: Array<{ value: FeedMode; label: string }> = [
  { value: "for_you", label: "For You" },
  { value: "following", label: "Following" },
];

type ActivityFeedProps = {
  variant?: "dashboard" | "page";
  limit?: number;
  className?: string;
};

function cleanFeedText(value?: string | null): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/â€¢/g, "|")
    .replace(/â‚¹/g, "INR ")
    .replace(/^INR 0 Study Room -\s*/i, "Free Study Room: ")
    .trim();
}

function formatWhen(startsAt?: string | null, isLive?: boolean): string {
  if (isLive) {
    return "Live now";
  }

  if (!startsAt) {
    return "Opening soon";
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

function getEntityLabel(item: ActivityFeedItem): string {
  return item.entityType === "study_room" ? "Study Room" : "Debate Room";
}

function reasonLabel(reason: ActivityFeedReason): string {
  switch (reason) {
    case "following":
      return "From your network";
    case "trending":
      return "Trending now";
    case "free":
      return "Free entry";
    case "low_cost":
      return "Budget friendly";
    case "new":
      return "Fresh post";
    case "limited_seats":
      return "Almost full";
    case "live":
      return "Live now";
    case "upcoming":
      return "Starting soon";
    case "mentor":
      return "Top rated host";
    case "interest_match":
      return "Matches your interests";
    default:
      return reason;
  }
}

function reasonClasses(reason: ActivityFeedReason): string {
  switch (reason) {
    case "live":
      return "border-red-200 bg-red-50 text-red-700";
    case "trending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "following":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "mentor":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "interest_match":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function reasonIcon(reason: ActivityFeedReason) {
  switch (reason) {
    case "trending":
      return <TrendingUp className="h-3.5 w-3.5" />;
    case "live":
      return <Radio className="h-3.5 w-3.5" />;
    case "mentor":
      return <Star className="h-3.5 w-3.5" />;
    default:
      return <Sparkles className="h-3.5 w-3.5" />;
  }
}

function coverShellClasses(item: ActivityFeedItem): string {
  return item.entityType === "study_room"
    ? "from-emerald-800 via-emerald-500 to-cyan-300"
    : "from-slate-900 via-sky-600 to-cyan-300";
}

function fallbackTags(item: ActivityFeedItem): string[] {
  const existing = item.topicTags?.filter(Boolean) ?? [];
  if (existing.length > 0) {
    return existing.slice(0, 3);
  }

  if (item.entityType === "study_room") {
    return ["Live learning", "Peer-led", "Seats open"];
  }

  return ["Debate", "Hot topic", "Community"];
}

function FeedCover({ item }: { item: ActivityFeedItem }) {
  const cleanedTitle = cleanFeedText(item.title);
  const tags = fallbackTags(item);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/50 bg-emerald-900 text-white shadow-[0_24px_60px_-28px_rgba(52,211,153,0.3)]">
      {item.coverImageUrl ? (
        <>
          <Image
            src={item.coverImageUrl}
            alt={cleanedTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 720px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-900/35 to-emerald-950/5" />
        </>
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            coverShellClasses(item),
          )}
        >
          <div className="absolute -left-8 top-8 h-32 w-32 rounded-full bg-white/16 blur-2xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-cyan-100/18 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.03))]" />
        </div>
      )}

      <div className="relative flex min-h-64 flex-col justify-between p-5 sm:min-h-72 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <Badge className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {getEntityLabel(item)}
          </Badge>
          <Badge
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur",
              item.isLive
                ? "border-red-200/30 bg-red-500/15 text-red-50"
                : "border-white/20 bg-white/10 text-white",
            )}
          >
            {item.isLive ? "Live session" : "Next up"}
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="max-w-2xl space-y-2">
            <p className="font-tagline text-xs uppercase tracking-[0.24em] text-white/70">
              Community spotlight
            </p>
            <h3 className="font-tagline text-2xl font-bold leading-tight text-white sm:text-[2rem]">
              {cleanedTitle}
            </h3>
            <p className="max-w-xl text-sm text-white/78 sm:text-[15px]">
              {cleanFeedText(item.description) || cleanFeedText(item.subheadline)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={`${item.id}-${tag}`}
                className="rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-medium text-white/92 backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedPostCard({ item }: { item: ActivityFeedItem }) {
  const avatarFallback = item.host.name?.charAt(0)?.toUpperCase() || "W";
  const topReasons = item.reasons.slice(0, 3);

  return (
    <article className="rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,255,249,0.95))] p-4 shadow-[0_28px_70px_-42px_rgba(34,197,94,0.28)] backdrop-blur sm:p-5">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/profile/${item.host.id}`}>
            <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm hover:ring-emerald-100 transition-all">
              <AvatarImage src={item.host.avatar || undefined} alt={item.host.name} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/profile/${item.host.id}`}>
                <p className="truncate text-sm font-semibold text-slate-900 hover:text-emerald-700 hover:underline transition-colors">
                  {item.host.name}
                </p>
              </Link>
              {item.host.reviewCount > 0 ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  {item.host.avgRating.toFixed(1)} rating
                </span>
              ) : null}
            </div>
            <p className="truncate text-sm text-slate-500">
              {cleanFeedText(item.headline)}
            </p>
            <p className="text-xs text-slate-400">{formatWhen(item.startsAt, item.isLive)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {getEntityLabel(item)}
          </Badge>
          {item.isLive ? (
            <Badge className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700">
              Live now
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mb-5 space-y-4">
        <div className="space-y-2">
          <h4 className="font-tagline text-xl font-bold leading-tight text-slate-950 sm:text-2xl">
            {cleanFeedText(item.title)}
          </h4>
          <p className="text-sm leading-6 text-slate-600">
            {cleanFeedText(item.description) || cleanFeedText(item.subheadline)}
          </p>
        </div>

        <FeedCover item={item} />

        <div className="flex flex-wrap gap-2">
          {topReasons.map((reason) => (
            <span
              key={`${item.id}-${reason}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                reasonClasses(reason),
              )}
            >
              {reasonIcon(reason)}
              {reasonLabel(reason)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-emerald-100/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {cleanFeedText(item.subheadline)}
        </p>
        <Link href={item.href} className="sm:shrink-0">
          <Button className="h-11 rounded-full px-5 shadow-sm">
            {item.ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </article>
  );
}

function FeedSkeletonCard() {
  return (
    <div className="rounded-[32px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.4)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <Skeleton className="h-64 rounded-[28px]" />

        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SignedOutFeedState({ variant }: { variant: "dashboard" | "page" }) {
  return (
    <div
      className={cn(
        "rounded-[32px] border border-emerald-200/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.98),rgba(239,246,255,0.96))] p-6 shadow-[0_28px_70px_-42px_rgba(16,185,129,0.55)]",
        variant === "page" ? "sm:p-8" : "",
      )}
    >
      <div className="flex max-w-2xl flex-col gap-4">
        <Badge className="w-fit rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-emerald-700">
          Personalized feed
        </Badge>
        <div className="space-y-2">
          <h3 className="font-tagline text-2xl font-bold text-slate-950">
            Sign in to unlock your community feed
          </h3>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            The new feed is tailored around live rooms, trending debates, your network,
            and the topics you want to learn next.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SignInButton mode="modal">
            <Button className="h-11 rounded-full px-5">Sign in to continue</Button>
          </SignInButton>
          <Link href="/how-it-works">
            <Button variant="outline" className="h-11 rounded-full px-5">
              See how We works
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SuggestedPeersList({ enabled = true }: { enabled?: boolean }) {
  const { isLoaded, isSignedIn } = useUser();
  const { data: peers, isLoading } = useSearchUsers("", 100, enabled);
  const { mutate: followUser, isPending } = useFollowUser();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="mt-6 space-y-3 text-left">
        <Skeleton className="h-[68px] w-full rounded-2xl" />
        <Skeleton className="h-[68px] w-full rounded-2xl" />
        <Skeleton className="h-[68px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!peers || peers.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No peers found right now.</p>;
  }

  const handleFollow = (id: string) => {
    if (!isSignedIn || followedIds.has(id)) return;
    followUser(id, {
      onSuccess: () => {
        setFollowedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(id);
          return newSet;
        });
      },
    });
  };

  return (
    <div className="mt-6 flex flex-col gap-3 text-left">
      {peers.map((peer) => {
        const isFollowed = followedIds.has(peer.id!);
        return (
          <div key={peer.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-10 w-10 border border-slate-100">
                <AvatarImage src={peer.avatar || undefined} />
                <AvatarFallback>{peer.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{peer.name}</p>
                <p className="truncate text-xs text-slate-500">{peer.bio || "No bio available"}</p>
              </div>
            </div>
            {!isLoaded || isSignedIn ? (
              <Button
                size="sm"
                variant={isFollowed ? "secondary" : "default"}
                className="ml-2 shrink-0 rounded-full"
                onClick={() => handleFollow(peer.id!)}
                disabled={!isLoaded || isFollowed || isPending}
              >
                {isFollowed ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Followed
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Follow
                  </>
                )}
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button size="sm" className="ml-2 shrink-0 rounded-full">
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Follow
                </Button>
              </SignInButton>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ActivityFeed({
  variant = "dashboard",
  limit = 8,
  className,
}: ActivityFeedProps) {
  const [mode, setMode] = useState<FeedMode>("for_you");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPeerDialogOpen, setIsPeerDialogOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { isLoaded, isSignedIn } = useUser();
  const { data: currentUserData } = useCurrentUser();
  const followingCount = currentUserData?.user?.followingCount || 0;
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useDashboardFeed(mode, limit);

  const rawItems = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data?.pages],
  );

  const items = useMemo(() => {
    if (!searchQuery.trim()) return rawItems;
    const lowerQuery = searchQuery.toLowerCase();
    return rawItems.filter(
      (item) =>
        item.title?.toLowerCase().includes(lowerQuery) ||
        item.headline?.toLowerCase().includes(lowerQuery) ||
        item.subheadline?.toLowerCase().includes(lowerQuery) ||
        item.host?.name?.toLowerCase().includes(lowerQuery)
    );
  }, [rawItems, searchQuery]);

  useEffect(() => {
    if (mode !== "following") {
      setIsPeerDialogOpen(false);
    }
  }, [mode]);

  useEffect(() => {
    if (variant === "dashboard") return;

    const node = loadMoreRef.current;
    const root = scrollContainerRef.current;
    if (!node || !root || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      {
        root,
        rootMargin: "220px 0px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const isPage = variant === "page";
  const feedViewportClassName = isPage
    ? "max-h-[72vh] lg:max-h-[60rem]"
    : "max-h-[68vh] lg:max-h-[52rem]";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.98))] shadow-[0_32px_90px_-50px_rgba(15,23,42,0.35)]",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_55%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_50%)]" />

      <div className={cn("relative p-5 sm:p-6", isPage ? "lg:p-8" : "")}>
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge className="w-fit rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-emerald-700 backdrop-blur">
              Premium community feed
            </Badge>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Flame className="h-5 w-5 text-orange-500" />
                <h2 className="font-tagline text-2xl font-bold tracking-tight">
                  {isPage ? "Community Feed" : "Activity Feed"}
                </h2>
              </div>

            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-[240px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search rooms or hosts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-full border border-slate-200 bg-white/85 pl-9 pr-4 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <div className="grid h-11 w-full flex-shrink-0 grid-cols-2 rounded-full border border-slate-200 bg-white/85 p-1 shadow-sm sm:w-[220px]">
                {FEED_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={cn(
                      "rounded-full px-4 text-sm font-medium transition-all",
                      mode === tab.value
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900",
                    )}
                    onClick={() => setMode(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 sm:justify-end">
              <span className="rounded-full bg-slate-100 px-3 py-1">Cover stories</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Live signals</span>
            </div>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className={cn(
            "mt-8 overflow-y-auto px-1 pr-2 pb-8 sm:px-3 sm:pr-4",
            "[mask-image:linear-gradient(to_bottom,transparent,black_24px,black_calc(100%-24px),transparent)]",
            feedViewportClassName,
          )}
        >
          <div className="space-y-8 py-6">
            {/* Recommended Matches Section */}
            {isLoaded && isSignedIn && !isLoading && mode === "for_you" && !searchQuery && (
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Recommended for you
                  </h3>
                </div>
                <RecommendedPeersList limit={6} enabled={true} />
              </div>
            )}
            {!isLoaded || isLoading ? (
              <>
                <FeedSkeletonCard />
                <FeedSkeletonCard />
              </>
            ) : null}

            {isLoaded && !isSignedIn && mode === "following" ? <SignedOutFeedState variant={variant} /> : null}

            {isLoaded && (!isSignedIn ? mode === "for_you" : true) && !isLoading && items.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center">
                <p className="text-base font-semibold text-slate-900">
                  {mode === "following"
                    ? followingCount > 0
                      ? "Your network hasn't posted anything lately."
                      : "Follow a few peers to build your network feed."
                    : "Fresh community posts will land here as new rooms and debates open."}
                </p>
                <p className={cn("mt-2 text-sm text-slate-500", mode === "following" ? "mb-6" : "")}>
                  {mode === "following" && followingCount > 0
                    ? "Check the 'For You' feed for trending content, or follow more people below to grow your network!"
                    : "We will surface live sessions, strong hosts, low-cost rooms, and topics aligned with what you want to learn."}
                </p>
                {mode === "following" ? (
                  <Button
                    variant="outline"
                    className="rounded-full border-slate-300 shadow-sm"
                    onClick={() => setIsPeerDialogOpen(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {followingCount > 0 ? "Find more peers to follow" : "Find peers to follow"}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {isLoaded && isSignedIn && !isLoading && items.length > 0 && mode === "following" ? (
              <div className="mb-6 flex flex-col items-stretch gap-4 rounded-3xl border border-slate-200/60 bg-white/60 p-5 backdrop-blur">
                <div className="flex w-full items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Grow your network</p>
                    <p className="text-xs text-slate-500">Follow more peers to see their updates here.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-slate-300 shadow-sm"
                    onClick={() => setIsPeerDialogOpen(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Find peers
                  </Button>
                </div>
              </div>
            ) : null}

            {isLoaded && (!isSignedIn ? mode === "for_you" : true) && !isLoading
              ? (variant === "dashboard" ? items.slice(0, 4) : items).map((item) => <FeedPostCard key={item.id} item={item} />)
              : null}

            {isLoaded && (!isSignedIn ? mode === "for_you" : true) && items.length > 0 ? (
              variant === "dashboard" ? (
                <div className="mt-8 flex justify-center pb-4">
                  <Link href="/browse">
                    <Button variant="outline" className="h-12 rounded-full border-slate-300 px-8 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                      Show more activity
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div ref={loadMoreRef} className="h-4" />
              )
            ) : null}

            {variant === "page" && isFetchingNextPage ? (
              <div className="space-y-6 pb-2">
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more posts
                </div>
                <FeedSkeletonCard />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={isPeerDialogOpen} onOpenChange={setIsPeerDialogOpen}>
        <DialogContent className="max-w-[92vw] rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(240,253,244,0.98))] p-0 shadow-[0_32px_90px_-50px_rgba(16,185,129,0.5)] sm:max-w-2xl">
          <DialogHeader className="border-b border-emerald-100 px-6 pt-6 pb-4 text-left">
            <DialogTitle className="font-tagline text-2xl font-bold text-slate-950">
              Find peers to follow
            </DialogTitle>
            <DialogDescription className="max-w-xl text-sm leading-6 text-slate-600">
              Build your network faster by following peers whose profiles you want to keep up with.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
            <SuggestedPeersList enabled={isPeerDialogOpen} />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
