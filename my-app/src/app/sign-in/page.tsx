import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-primary-50 via-background to-secondary-50 dark:from-gray-900 dark:via-background dark:to-gray-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
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
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Sign in to continue your learning journey
            </p>
          </div>

          {/* Clerk Sign In Component with Custom Styling */}
          <div className="animate-scale-in flex justify-center">
            <SignIn
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
                  identityPreviewText: "text-foreground font-medium",
                  identityPreviewEditButton: "text-primary-600 hover:text-primary-700",
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
    </div>
  );
}
