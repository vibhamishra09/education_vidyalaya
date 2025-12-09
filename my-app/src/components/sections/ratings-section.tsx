"use client";

import { motion } from "framer-motion";
import { Star, ExternalLink } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";

interface RatingSource {
  name: string;
  rating: number;
  reviewCount: number;
  url?: string;
  icon?: React.ReactNode;
}

interface RatingsSectionProps {
  overallRating?: number;
  totalReviews?: number;
  sources?: RatingSource[];
}

const defaultSources: RatingSource[] = [
  {
    name: "Google",
    rating: 4.8,
    reviewCount: 1250,
    url: "https://www.google.com/search?q=webyalaya",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    name: "Trustpilot",
    rating: 4.7,
    reviewCount: 890,
    url: "https://www.trustpilot.com/review/webyalaya.com",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L8.4 7.2L0 8.4L5.4 13.8L3.6 22.2L12 18L20.4 22.2L18.6 13.8L24 8.4L15.6 7.2L12 0Z" fill="#00B67A"/>
      </svg>
    ),
  },
  {
    name: "Product Hunt",
    rating: 4.9,
    reviewCount: 320,
    url: "https://www.producthunt.com/products/webyalaya",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.604 8.4c-1.106 0-2-.894-2-2s.894-2 2-2 2 .894 2 2-.898 2-2 2zm3.7 0c-1.106 0-2-.894-2-2s.894-2 2-2 2 .894 2 2-.898 2-2 2zM6.296 8.4c-1.106 0-2-.894-2-2s.894-2 2-2 2 .894 2 2-.898 2-2 2zm-3.7 9.194c0 4.314 5.284 5.306 7.682 5.306 2.398 0 7.682-.992 7.682-5.306 0-4.314-5.284-5.306-7.682-5.306-2.398 0-7.682.992-7.682 5.306z" fill="#DA552F"/>
      </svg>
    ),
  },
];

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const starSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className={`${starSize} fill-yellow-400 text-yellow-400`} />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star className={`${starSize} text-gray-300`} />
          <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star className={`${starSize} fill-yellow-400 text-yellow-400`} />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className={`${starSize} text-gray-300`} />
      ))}
    </div>
  );
}

function RatingSourceCard({ source, delay = 0 }: { source: RatingSource; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="group"
    >
      <div className="relative overflow-hidden rounded-xl bg-card border border-border/50 p-6 transition-all duration-300 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5">
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Source Icon/Name */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {source.icon ? (
              <div className="text-green-600">{source.icon}</div>
            ) : null}
            <span className="font-semibold text-sm">{source.name}</span>
          </div>

          {/* Rating */}
          <div className="flex flex-col items-center gap-2">
            <StarRating rating={source.rating} size="md" />
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{source.rating}</span>
              <span className="text-sm text-muted-foreground">/5</span>
            </div>
          </div>

          {/* Review Count */}
          <p className="text-xs text-muted-foreground font-tagline">
            {source.reviewCount.toLocaleString()} reviews
          </p>

          {/* Link */}
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors mt-2"
            >
              View reviews
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function RatingsSection({
  overallRating = 4.8,
  totalReviews = 2460,
  sources = defaultSources,
}: RatingsSectionProps) {
  return (
    <section className="py-16 bg-muted/30 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Trusted by Learners Worldwide
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto font-tagline mb-8">
              See what our community has to say about Webyalaya
            </p>

            {/* Overall Rating Display */}
            <div className="flex flex-col items-center gap-4 mb-12">
              <div className="flex items-center gap-3">
                <StarRating rating={overallRating} size="lg" />
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    {overallRating}
                  </span>
                  <span className="text-2xl text-muted-foreground">/5</span>
                </div>
              </div>
              <p className="text-lg text-muted-foreground font-tagline">
                Based on <span className="font-semibold text-foreground">{totalReviews.toLocaleString()}</span> reviews
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Rating Sources Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {sources.map((source, index) => (
            <RatingSourceCard key={source.name} source={source} delay={index * 0.1} />
          ))}
        </div>

        {/* Trust Badge */}
        <FadeIn delay={0.3}>
          <div className="text-center mt-12">
            <p className="text-sm text-muted-foreground font-tagline">
              ⭐ Verified reviews from trusted platforms
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

