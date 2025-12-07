import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-secondary-50 via-background to-primary-50 dark:from-gray-900 dark:via-background dark:to-gray-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-secondary-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-secondary-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Centered Content */}
      <div className="relative w-full flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto animate-slide-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-56 mx-auto mb-6">
              <Image
                src="/webyalaya-main-logo.svg"
                alt="Webyalaya"
                width={240}
                height={60}
                className="w-full h-auto"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-gradient">
              Join Webyalaya
            </h1>
            <p className="text-muted-foreground">
              Create your account and start learning
            </p>
          </div>

          {/* Clerk Sign Up Component with Custom Styling */}
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
  );
}
