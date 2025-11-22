import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-secondary-50 via-background to-primary-50 dark:from-gray-900 dark:via-background dark:to-gray-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-secondary-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-secondary-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Left side - Sign Up Form */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-12 lg:px-8">
        <div className="w-full max-w-md animate-slide-in">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary-500 via-cyan-600 to-primary-500 mx-auto mb-6 shadow-secondary animate-bounce">
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3 text-gradient">
            Join Webyalaya
          </h1>
          <p className="text-muted-foreground text-lg">
            Create your account and start exploring amazing things
          </p>
        </div>

        {/* Clerk Sign Up Component with Custom Styling */}
        <div className="animate-scale-in">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-gradient-to-r from-secondary-600 to-primary-600 hover:from-secondary-700 hover:to-primary-700 text-white font-semibold py-3 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg",
                card:
                  "bg-card/95 backdrop-blur-xl shadow-2xl border border-border/50 rounded-2xl",
                headerTitle:
                  "text-2xl font-bold text-foreground",
                headerSubtitle:
                  "text-muted-foreground",
                socialButtonsBlockButton:
                  "border-2 border-border hover:border-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-950 transition-all duration-200 font-medium",
                formFieldInput:
                  "border-2 border-border focus:border-secondary-500 focus:ring-2 focus:ring-secondary-200 dark:focus:ring-secondary-900 transition-all duration-200 rounded-lg",
                footerActionLink:
                  "text-secondary-600 hover:text-secondary-700 font-semibold transition-colors duration-200",
                dividerLine:
                  "bg-border",
                dividerText:
                  "text-muted-foreground",
                formFieldLabel:
                  "text-foreground font-medium",
                identityPreviewText:
                  "text-foreground font-medium",
                identityPreviewEditButton:
                  "text-secondary-600 hover:text-secondary-700",
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

      {/* Right side - Illustration */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center p-12 bg-gradient-to-br from-secondary-100/50 to-primary-100/50 dark:from-secondary-950/30 dark:to-primary-950/30">
        <div className="relative w-full max-w-lg animate-slide-in-right">
          {/* Decorative Elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary-400/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary-400/20 rounded-full blur-2xl" />

          {/* Main Illustration - Community/Growth Theme */}
          <div className="relative">
            {/* Network Connection Illustration */}
            <div className="relative mx-auto w-full aspect-square max-w-md">
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.3 }} />
                  </linearGradient>
                </defs>
                <line x1="200" y1="100" x2="300" y2="200" stroke="url(#lineGradient)" strokeWidth="3" className="animate-pulse" />
                <line x1="200" y1="100" x2="100" y2="200" stroke="url(#lineGradient)" strokeWidth="3" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
                <line x1="300" y1="200" x2="250" y2="300" stroke="url(#lineGradient)" strokeWidth="3" className="animate-pulse" style={{ animationDelay: "0.4s" }} />
                <line x1="100" y1="200" x2="150" y2="300" stroke="url(#lineGradient)" strokeWidth="3" className="animate-pulse" style={{ animationDelay: "0.6s" }} />
                <line x1="150" y1="300" x2="250" y2="300" stroke="url(#lineGradient)" strokeWidth="3" className="animate-pulse" style={{ animationDelay: "0.8s" }} />
              </svg>

              {/* Center main node */}
              <div className="absolute top-16 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-br from-secondary-500 to-primary-500 rounded-3xl rotate-12 shadow-2xl shadow-secondary-500/50 flex items-center justify-center animate-bounce">
                <div className="absolute inset-2 bg-background/95 rounded-2xl -rotate-12 flex items-center justify-center">
                  <svg className="w-12 h-12 text-secondary-600 dark:text-secondary-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
              </div>

              {/* Satellite nodes */}
              <div className="absolute top-1/2 right-20 w-20 h-20 bg-primary-500/20 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-bounce" style={{ animationDelay: "0.2s" }}>
                <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="absolute top-1/2 left-20 w-20 h-20 bg-secondary-500/20 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-bounce" style={{ animationDelay: "0.4s" }}>
                <svg className="w-10 h-10 text-secondary-600 dark:text-secondary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>

              <div className="absolute bottom-20 left-1/3 w-20 h-20 bg-success-500/20 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-bounce" style={{ animationDelay: "0.6s" }}>
                <svg className="w-10 h-10 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-primary-500/20 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-bounce" style={{ animationDelay: "0.8s" }}>
                <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Text Content */}
            <div className="mt-12 text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                Join Our Community
              </h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Connect with thousands of users learners exploring amazing things together
              </p>
              <div className="grid grid-cols-3 gap-4 pt-4 max-w-sm mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">10K+</div>
                  <div className="text-xs text-muted-foreground">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">50K+</div>
                  <div className="text-xs text-muted-foreground">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-600 dark:text-success-400">99.9%</div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
