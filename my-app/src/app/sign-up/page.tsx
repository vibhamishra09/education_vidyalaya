import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Join Webyalaya for free! Create your account to start learning and teaching with peers. Connect with study rooms, share skills, and earn mAYA coins.",
  keywords: [
    "sign up",
    "register",
    "create account",
    "join webyalaya",
    "peer learning",
    "free education",
  ],
  openGraph: {
    title: "Sign Up | Webyalaya",
    description: "Join Webyalaya and start your peer-to-peer learning journey today!",
    url: "/sign-up",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Join Webyalaya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign Up | Webyalaya",
    description: "Join Webyalaya and start your peer-to-peer learning journey!",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/sign-up",
  },
};

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-primary-50 via-background to-secondary-50 dark:from-gray-900 dark:via-background dark:to-gray-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 relative group">
              <Image
                src="/webyalaya-main-logo.svg"
                alt="Webyalaya"
                width={128}
                height={128}
                className="object-contain px-1 transition-transform group-hover:scale-105"
              />
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/browse"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Browse
              </Link>
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Split Layout */}
      <div className="relative flex-1 flex">
        {/* Left Side - Logo & Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-12 py-12">
          <div className="max-w-md animate-slide-in">
            <div className="w-72 mb-8">
              <Image
                src="/webyalaya-main-logo.svg"
                alt="Webyalaya"
                width={320}
                height={80}
                className="w-full h-auto"
                priority
              />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-gradient">
              Start Learning Today
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of learners and teachers on Webyalaya. Create your free account to get started.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span>Learn from peers who&apos;ve mastered the skills</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span>Connect with a community of learners</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>Earn mAYA coins by teaching others</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 sm:px-8 py-12">
          <div className="w-full max-w-md animate-slide-in">
            {/* Mobile Logo (shown only on small screens) */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 text-gradient">
                Start Learning Today
              </h1>
              <p className="text-muted-foreground">
                Create your free account to get started
              </p>
            </div>

            {/* Clerk Sign Up Component */}
            <div className="animate-scale-in flex justify-center">
              <SignUp
                appearance={{
                  elements: {
                    rootBox: "w-full mx-auto",
                    cardBox: "w-full mx-auto",
                    card: "w-full mx-auto bg-card/95 backdrop-blur-xl shadow-2xl border border-border/50 rounded-2xl",
                    formButtonPrimary:
                      "bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white font-semibold py-3 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg",
                    headerTitle: "text-2xl font-bold text-foreground",
                    headerSubtitle: "text-muted-foreground",
                    socialButtonsBlockButton:
                      "border-2 border-border hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950 transition-all duration-200 font-medium",
                    formFieldInput:
                      "border-2 border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all duration-200 rounded-lg",
                    footerActionLink:
                      "text-primary-600 hover:text-primary-700 font-semibold transition-colors duration-200",
                    dividerLine: "bg-border",
                    dividerText: "text-muted-foreground",
                    formFieldLabel: "text-foreground font-medium",
                  },
                  layout: {
                    socialButtonsPlacement: "bottom",
                    socialButtonsVariant: "blockButton",
                  }
                }}
              />
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                By signing up, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
