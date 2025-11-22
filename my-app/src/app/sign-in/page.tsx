import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-primary-50 via-background to-secondary-50 dark:from-gray-900 dark:via-background dark:to-gray-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Left side - Sign In Form */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-12 lg:px-8">
        <div className="w-full max-w-md animate-slide-in">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 via-purple-600 to-secondary-500 mx-auto mb-6 shadow-primary animate-bounce">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3 text-gradient">
            Welcome Back
          </h1>
          <p className="text-muted-foreground text-lg">
            Sign in to continue your journey with Webyalaya
          </p>
        </div>

        {/* Clerk Sign In Component with Custom Styling */}
        <div className="animate-scale-in">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white font-semibold py-3 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg",
                card:
                  "bg-card/95 backdrop-blur-xl shadow-2xl border border-border/50 rounded-2xl",
                headerTitle:
                  "text-2xl font-bold text-foreground",
                headerSubtitle:
                  "text-muted-foreground",
                socialButtonsBlockButton:
                  "border-2 border-border hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950 transition-all duration-200 font-medium",
                formFieldInput:
                  "border-2 border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all duration-200 rounded-lg",
                footerActionLink:
                  "text-primary-600 hover:text-primary-700 font-semibold transition-colors duration-200",
                dividerLine:
                  "bg-border",
                dividerText:
                  "text-muted-foreground",
                formFieldLabel:
                  "text-foreground font-medium",
                identityPreviewText:
                  "text-foreground font-medium",
                identityPreviewEditButton:
                  "text-primary-600 hover:text-primary-700",
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
            Protected by industry-standard encryption
          </p>
        </div>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center p-12 bg-gradient-to-br from-primary-100/50 to-secondary-100/50 dark:from-primary-950/30 dark:to-secondary-950/30">
        <div className="relative w-full max-w-lg animate-slide-in-right">
          {/* Decorative Elements */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary-400/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary-400/20 rounded-full blur-2xl" />

          {/* Main Illustration - Abstract Security/Auth Theme */}
          <div className="relative">
            {/* Lock Shield Illustration */}
            <div className="relative mx-auto w-full aspect-square max-w-md">
              {/* Outer rings */}
              <div className="absolute inset-0 rounded-full border-4 border-primary-300/30 dark:border-primary-600/30 animate-pulse" />
              <div className="absolute inset-8 rounded-full border-4 border-secondary-300/30 dark:border-secondary-600/30 animate-pulse" style={{ animationDelay: "0.5s" }} />
              <div className="absolute inset-16 rounded-full border-4 border-primary-300/30 dark:border-primary-600/30 animate-pulse" style={{ animationDelay: "1s" }} />

              {/* Center shield with lock */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-48 h-48 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-3xl rotate-45 shadow-2xl shadow-primary-500/50">
                  <div className="absolute inset-4 bg-background/95 rounded-2xl -rotate-45 flex items-center justify-center">
                    <svg className="w-20 h-20 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Floating icons */}
              <div className="absolute top-10 right-10 w-16 h-16 bg-success-500/20 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-bounce" style={{ animationDelay: "0.2s" }}>
                <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="absolute bottom-10 left-10 w-16 h-16 bg-primary-500/20 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-bounce" style={{ animationDelay: "0.4s" }}>
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>

              <div className="absolute top-1/2 right-0 w-16 h-16 bg-secondary-500/20 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-bounce" style={{ animationDelay: "0.6s" }}>
                <svg className="w-8 h-8 text-secondary-600 dark:text-secondary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Text Content */}
            <div className="mt-12 text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                Secure Access
              </h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Your data is protected with enterprise-grade security and end-to-end encryption
              </p>
              <div className="flex items-center justify-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                  <span className="text-sm text-muted-foreground">256-bit Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                  <span className="text-sm text-muted-foreground">2FA Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
