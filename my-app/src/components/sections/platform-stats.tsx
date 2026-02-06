"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { usePlatformStats } from "@/hooks/use-platform-stats";
import { Users, BookOpen, Clock, Star } from "lucide-react";

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
}

function CountUp({ end, duration = 2, suffix = "" }: CountUpProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const animationRef = useRef<number | null>(null);
  const previousEndRef = useRef<number>(end);

  useEffect(() => {
    // If not in view yet, just set the value without animation
    if (!isInView) {
      setCount(end);
      previousEndRef.current = end;
      return;
    }

    // If end hasn't changed, don't re-animate
    if (previousEndRef.current === end) {
      return;
    }

    // Cancel any existing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    // Start from the previous end value (or 0 if this is the first time)
    const startValue = previousEndRef.current;
    previousEndRef.current = end;

    // If end is 0, just set it directly
    if (end === 0) {
      setCount(0);
      return;
    }

    // Start animation from startValue to end
    setCount(startValue);

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const newCount = Math.floor(startValue + easeOutQuart * (end - startValue));
      setCount(newCount);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end at exactly the target value
        setCount(end);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
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
  showRating?: boolean;
  rating?: number;
}

function StatCard({ icon, value, label, suffix, showRating = false, rating }: StatCardProps) {
  return (
    <div className="group h-full rounded-2xl border border-border/50 bg-card px-5 py-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-500/20 hover:-translate-y-0.5 flex flex-col justify-center">
      <div className="flex items-center justify-between gap-4">
        
        {/* Text Section (Left) */}
        <div className="flex flex-col">
          {/* Label Row - Now includes Rating if present */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
            
            {showRating && rating !== undefined && (
              <div className="flex items-center gap-1 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i}
                      className={`w-2.5 h-2.5 ${
                        i < Math.floor(rating) 
                          ? "fill-yellow-500 text-yellow-500" 
                          : "text-gray-300 dark:text-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500">
                  {rating}
                </span>
              </div>
            )}
          </div>
          
          {/* Value Row */}
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            <CountUp end={value} suffix={suffix} />
          </span>
        </div>

        {/* Icon Section (Right) */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function PlatformStats() {
  const { data: stats } = usePlatformStats();

  const allStats = [
    {
      icon: <Users className="w-6 h-6" />,
      value: stats?.usersOnboarded ?? 0,
      label: "Learners",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      value: stats?.studyRoomsHosted ?? 0,
      label: "Study Rooms",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      value: stats?.learningHours ?? 0,
      label: "Hours Spent",
      suffix: "+",
    },
    {
      icon: <Star className="w-6 h-6" />,
      value: stats?.reviewsGiven ?? 0,
      label: "Reviews",
      showRating: stats?.averageRating !== undefined && stats.averageRating > 0,
      rating: stats?.averageRating,
    },
  ];

  return (
    <section className="py-10 relative overflow-hidden bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-2"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Growing Together
            </h2>
            <p className="text-sm text-muted-foreground font-tagline">
              Join our thriving community of learners helping each other succeed
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="h-full"
              >
                <StatCard {...stat} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}