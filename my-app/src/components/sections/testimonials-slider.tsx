"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReviews } from "@/hooks/use-reviews";
import { usersApi } from "@/lib/api";

interface Testimonial {
  id: string;
  reviewerId: string;
  name: string;
  avatar?: string;
  rating: number;
  sessionsTaught: number;
  text: string;
}

const REVIEWS_REFRESH_INTERVAL_MS = 15000;

function StarRating({ rating, inverted = false }: { rating: number, inverted?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 sm:h-4 sm:w-4 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : inverted 
                ? "text-blue-300/50" 
                : "text-gray-300"    
          }`}
        />
      ))}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function TestimonialsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [reviewerSessionsTaught, setReviewerSessionsTaught] = useState<Record<string, number>>({});
  const { data: reviewsData, isLoading } = useReviews(
    { page: 1, limit: 20 },
    { refetchInterval: REVIEWS_REFRESH_INTERVAL_MS, refetchIntervalInBackground: true }
  );
  const negativeWords = ["bad", "worst", "poor", "terrible"];

  const baseTestimonials = useMemo<Testimonial[]>(() => {
    const reviews = reviewsData?.reviews ?? [];

    return reviews
      .filter((review) => {
          const text = review.review?.trim();
          if (!text) return false;

          const lower = text.toLowerCase();

          const isNegative = negativeWords.some(word =>
            lower.includes(word)
          );

          return text.length > 5 && !isNegative;
        })
      .map((review) => ({
        id: review.id,
        reviewerId: review.reviewer.id,
        name: review.reviewer.name,
        avatar: review.reviewer.avatar,
        rating: review.rating,
        sessionsTaught: 0,
        text: review.review.trim(),
      }));
  }, [reviewsData?.reviews]);
  const reviewerIds = useMemo(
    () => Array.from(new Set(baseTestimonials.map((testimonial) => testimonial.reviewerId))),
    [baseTestimonials]
  );

  useEffect(() => {
    const missingReviewerIds = reviewerIds.filter((id) => reviewerSessionsTaught[id] === undefined);
    if (!missingReviewerIds.length) return;

    let cancelled = false;

    const fetchReviewerStats = async () => {
      const responses = await Promise.allSettled(
        missingReviewerIds.map(async (reviewerId) => {
          const profile = await usersApi.getPublicUserProfile(reviewerId);
          return {
            reviewerId,
            sessionsTaught: profile.publicStats?.sessionsTaught ?? 0,
          };
        })
      );

      if (cancelled) return;

      setReviewerSessionsTaught((prev) => {
        const next = { ...prev };
        for (const response of responses) {
          if (response.status === "fulfilled") {
            next[response.value.reviewerId] = response.value.sessionsTaught;
          }
        }
        return next;
      });
    };

    void fetchReviewerStats();

    return () => {
      cancelled = true;
    };
  }, [reviewerIds, reviewerSessionsTaught]);

  const testimonials = useMemo<Testimonial[]>(() => {
    return [...baseTestimonials]
      .map((testimonial) => ({
        ...testimonial,
        sessionsTaught: reviewerSessionsTaught[testimonial.reviewerId] ?? 0,
      }))
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.sessionsTaught !== a.sessionsTaught) return b.sessionsTaught - a.sessionsTaught;
        return a.id.localeCompare(b.id);
      });
  }, [baseTestimonials, reviewerSessionsTaught]);

  useEffect(() => {
    if (currentIndex >= testimonials.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, testimonials.length]);

  useEffect(() => {
    if (!isAutoPlaying || testimonials.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  const goToPrevious = () => {
    if (!testimonials.length) return;
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    if (!testimonials.length) return;
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-8 sm:py-10 relative overflow-hidden">
      {/* Soft gradient background with extended fade */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/0 via-primary/[0.02] to-background/0" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-4 sm:mb-6"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-2">
            What Our Community Says
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto font-tagline">
            Real stories from learners who love using We
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {isLoading ? (
              <div className="pt-12 px-2 sm:px-4">
                <div className="relative rounded-[2rem] bg-card p-6 sm:p-10 shadow-lg ring-1 ring-black/5 min-h-[220px] flex items-center justify-center">
                  <p className="text-muted-foreground">Loading authentic reviews...</p>
                </div>
              </div>
            ) : !currentTestimonial ? (
              <div className="pt-12 px-2 sm:px-4">
                <div className="relative rounded-[2rem] bg-card p-6 sm:p-10 shadow-lg ring-1 ring-black/5 min-h-[220px] flex items-center justify-center">
                  <p className="text-muted-foreground text-center">
                    No public reviews yet. Complete a session and share your feedback to appear here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Testimonial Card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTestimonial.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="pt-12 px-2 sm:px-4"
                  >
                    <div className="relative rounded-[2rem] bg-card p-6 sm:p-10 shadow-lg ring-1 ring-black/5 min-h-[220px]">
                      
                      {/* HEADER AREA: Ribbon + Role side-by-side */}
                      <div className="absolute -left-2 top-6 z-20 flex items-center gap-4">
                        
                        {/* The Blue Ribbon Wrapper */}
                        <div className="relative">
                          <div className="relative z-10 flex items-center gap-2 sm:gap-3 rounded-r-2xl rounded-tl-sm bg-[#2b6cb0] py-2 sm:py-2.5 pl-4 sm:pl-6 pr-6 sm:pr-8 text-white shadow-md">
                            <span className="text-lg sm:text-xl font-bold tracking-tight">{currentTestimonial.name}</span>
                            <div className="h-4 sm:h-5 w-px bg-white/30" />
                            <StarRating rating={currentTestimonial.rating} inverted={true} />
                          </div>
                          {/* Darker Fold Tail - anchored to the ribbon wrapper */}
                          <div className="absolute left-0 top-full h-3 w-2 bg-[#1a4971] rounded-bl-xl" />
                        </div>

                      </div>

                      {/* Avatar Overlay */}
                      <div className="absolute right-4 -top-10 sm:right-8 sm:-top-16 z-30">
                        <Avatar className="h-24 w-24 sm:h-32 sm:w-32 ring-4 sm:ring-8 ring-background shadow-xl bg-muted">
                          <AvatarImage
                            src={currentTestimonial.avatar}
                            alt={currentTestimonial.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-3xl font-bold text-muted-foreground">
                            {getInitials(currentTestimonial.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Main Content */}
                      <div className="relative mt-12 space-y-3">
                        <blockquote className="text-base sm:text-lg text-foreground/80 leading-relaxed">
                          &ldquo;{currentTestimonial.text}&rdquo;
                        </blockquote>
                        
                        {/* Previous footer location removed for compactness */}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </>
            )}

            {/* Navigation Buttons */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-12 h-10 w-10 rounded-full shadow-md hover:shadow-lg transition-shadow bg-background/70 backdrop-blur"
              onClick={goToPrevious}
              aria-label="Previous testimonial"
              disabled={testimonials.length <= 1}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-12 h-10 w-10 rounded-full shadow-md hover:shadow-lg transition-shadow bg-background/70 backdrop-blur"
              onClick={goToNext}
              aria-label="Next testimonial"
              disabled={testimonials.length <= 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6 min-h-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}