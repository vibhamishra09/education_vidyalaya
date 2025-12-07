import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-secondary-50 via-background to-primary-50 dark:from-gray-900 dark:via-background dark:to-gray-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-secondary-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-secondary-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
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
              Join Webyalaya
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Create your account and start your learning journey today.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <span>Free to join, start learning immediately</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>Earn coins by teaching, spend on learning</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span>Join thousands of learners worldwide</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <span>Unlock achievements as you progress</span>
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
                Join Webyalaya
              </h1>
              <p className="text-muted-foreground">
                Create your account and start learning
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
                      "bg-gradient-to-r from-secondary-600 to-primary-600 hover:from-secondary-700 hover:to-primary-700 text-white font-semibold py-3 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg",
                    headerTitle: "text-2xl font-bold text-foreground",
                    headerSubtitle: "text-muted-foreground",
                    socialButtonsBlockButton:
                      "border-2 border-border hover:border-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-950 transition-all duration-200 font-medium",
                    formFieldInput:
                      "border-2 border-border focus:border-secondary-500 focus:ring-2 focus:ring-secondary-200 dark:focus:ring-secondary-900 transition-all duration-200 rounded-lg",
                    footerActionLink:
                      "text-secondary-600 hover:text-secondary-700 font-semibold transition-colors duration-200",
                    dividerLine: "bg-border",
                    dividerText: "text-muted-foreground",
                    formFieldLabel: "text-foreground font-medium",
                    identityPreviewText: "text-foreground font-medium",
                    identityPreviewEditButton: "text-secondary-600 hover:text-secondary-700",
                    otpCodeFieldInput:
                      "border-2 border-border focus:border-secondary-500 focus:ring-2 focus:ring-secondary-200",
                  },
                  layout: {
                    socialButtonsPlacement: "bottom",
                    socialButtonsVariant: "blockButton",
                  }
                }}
              />
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                By signing up, you agree to our Terms of Service
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure & encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
