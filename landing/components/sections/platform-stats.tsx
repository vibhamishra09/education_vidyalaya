"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Users, BookOpen, Clock, Star, GraduationCap } from "lucide-react";

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
}

function CountUp({ end, duration = 2, suffix = "" }: CountUpProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isInView]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
  delay?: number;
  gradient: string;
  showRating?: boolean;
  rating?: number;
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star className="w-4 h-4 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      ))}
    </div>
  );
}

function StatCard({ icon, value, label, suffix, delay = 0, gradient, showRating = false, rating }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="relative group"
    >
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 transition-all duration-300 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5">
        {/* Gradient accent */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>

          {/* Rating Display (if showRating is true) */}
          {showRating && rating !== undefined ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <StarRating rating={rating} />
                <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  {rating}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                <CountUp end={value} suffix={suffix} />
              </div>
            </div>
          ) : (
            /* Value */
            <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              <CountUp end={value} suffix={suffix} />
            </div>
          )}

          {/* Label */}
          <p className="text-sm text-muted-foreground font-medium font-tagline">
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Minimum display values - show these until actual data exceeds them
const MIN_STATS = {
  usersOnboarded: 145,
  studyRoomsHosted: 85,
  sessionsCompleted: 230,
  learningHours: 520,
  reviewsGiven: 180,
};

export function PlatformStats() {
  // Use dummy data for stats
  const stats = {
    usersOnboarded: 168,
    studyRoomsHosted: 122,
    sessionsCompleted: 253,
    learningHours: 665,
    reviewsGiven: 189,
  };

  // Use the higher of actual stats or minimum values
  const displayStats = {
    usersOnboarded: Math.max(stats?.usersOnboarded ?? 0, MIN_STATS.usersOnboarded),
    studyRoomsHosted: Math.max(stats?.studyRoomsHosted ?? 0, MIN_STATS.studyRoomsHosted),
    sessionsCompleted: Math.max(stats?.sessionsCompleted ?? 0, MIN_STATS.sessionsCompleted),
    learningHours: Math.max(stats?.learningHours ?? 0, MIN_STATS.learningHours),
    reviewsGiven: Math.max(stats?.reviewsGiven ?? 0, MIN_STATS.reviewsGiven),
  };

  const topStats = [
    {
      icon: <Users className="w-6 h-6 text-green-600" />,
      value: displayStats.usersOnboarded,
      label: "Learners Onboarded",
      gradient: "bg-gradient-to-br from-green-500/5 to-transparent",
    },
    {
      icon: <BookOpen className="w-6 h-6 text-blue-600" />,
      value: displayStats.studyRoomsHosted,
      label: "Study Rooms Hosted",
      gradient: "bg-gradient-to-br from-blue-500/5 to-transparent",
    },
    {
      icon: <Clock className="w-6 h-6 text-amber-600" />,
      value: displayStats.learningHours,
      label: "Hours of Learning",
      suffix: "+",
      gradient: "bg-gradient-to-br from-amber-500/5 to-transparent",
    },
  ];

  const reviewStat = {
    icon: <Star className="w-6 h-6 text-rose-600" />,
    value: 2640,
    label: "Reviews Given",
    gradient: "bg-gradient-to-br from-rose-500/5 to-transparent",
    showRating: true,
    rating: 4.8,
  };

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/5 via-transparent to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Growing Together
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto font-tagline">
            Join our thriving community of learners helping each other succeed
          </p>
        </motion.div>

        {/* First three stats in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto mb-6">
          {topStats.map((stat, index) => (
            <StatCard
              key={stat.label}
              {...stat}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Review stat centered below */}
        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            <StatCard
              {...reviewStat}
              delay={0.3}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
