"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Testimonial {
  id: number;
  name: string;
  avatar?: string;
  role?: string;
  rating: number;
  text: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Chen",
    avatar: "",
    role: "Computer Science Student",
    rating: 5,
    text: "Webyalaya has completely transformed how I study. The peer-to-peer learning sessions are incredibly engaging, and I've learned so much from teaching others. The community is supportive and welcoming!",
  },
  {
    id: 2,
    name: "Michael Rodriguez",
    avatar: "",
    role: "Mathematics Enthusiast",
    rating: 5,
    text: "I love how easy it is to find study partners and create study rooms. The platform makes collaborative learning fun and effective. Highly recommend to anyone looking to improve their understanding!",
  },
  {
    id: 3,
    name: "Emily Watson",
    avatar: "",
    role: "Biology Major",
    rating: 5,
    text: "The debate rooms feature is amazing! It's helped me think critically about topics and see different perspectives. The quality of discussions here is unmatched.",
  },
  {
    id: 4,
    name: "David Kim",
    avatar: "",
    role: "Physics Student",
    rating: 5,
    text: "As someone who learns best by teaching, Webyalaya is perfect. I've hosted multiple study rooms and the experience has been fantastic. The platform is intuitive and the community is great!",
  },
  {
    id: 5,
    name: "Priya Patel",
    avatar: "",
    role: "Chemistry Enthusiast",
    rating: 5,
    text: "I've tried many learning platforms, but Webyalaya stands out. The peer-to-peer approach makes learning feel less intimidating and more collaborative. It's become an essential part of my study routine!",
  },
  {
    id: 6,
    name: "James Anderson",
    avatar: "",
    role: "Engineering Student",
    rating: 5,
    text: "The study rooms feature is brilliant. I've connected with so many like-minded learners and the sessions are always productive. This platform has helped me excel in my courses!",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export function TestimonialsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Change testimonial every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-16 relative overflow-hidden bg-muted/30">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            What Our Community Says
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto font-tagline">
            Real stories from learners who love using Webyalaya
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Testimonial Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2">
                  <CardContent className="pt-8 pb-8 px-6 sm:px-8">
                    <div className="flex flex-col items-center text-center space-y-6">
                      {/* Stars */}
                      <StarRating rating={currentTestimonial.rating} />

                      {/* Testimonial Text */}
                      <p className="text-lg sm:text-xl text-foreground leading-relaxed max-w-3xl">
                        &ldquo;{currentTestimonial.text}&rdquo;
                      </p>

                      {/* Author Info */}
                      <div className="flex flex-col items-center gap-3">
                        <Avatar className="h-16 w-16">
                          <AvatarImage
                            src={currentTestimonial.avatar}
                            alt={currentTestimonial.name}
                          />
                          <AvatarFallback className="text-lg">
                            {currentTestimonial.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-lg">
                            {currentTestimonial.name}
                          </h4>
                          {currentTestimonial.role && (
                            <p className="text-sm text-muted-foreground">
                              {currentTestimonial.role}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-12 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              onClick={goToPrevious}
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-12 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              onClick={goToNext}
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-8">
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
