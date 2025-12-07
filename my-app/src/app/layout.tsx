import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { Suspense } from "react";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/contexts/toast-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingActionButtons } from "@/components/ui/floating-action-buttons";
import { PushNotificationPrompt } from "@/components/notifications/push-notification-prompt";
import { PushNotificationListener } from "@/components/notifications/push-notification-listener";
import { HiddenSignInButton } from "@/components/auth/hidden-sign-in-button";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const harabara = localFont({
  src: "../../public/fonts/Harabara.ttf",
  variable: "--font-harabara",
  weight: "400",
  display: "swap",
});

const gotham = localFont({
  src: [
    {
      path: "../../public/fonts/GOTHAM-LIGHT.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/GOTHAM-MEDIUM.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/GOTHAM-BOLD.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gotham",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Webyalaya",
  description: "Peer to peer learning platform",
  icons: {
    icon: "/webyalaya-main-logo.svg",
    shortcut: "/webyalaya-main-logo.svg",
    apple: "/webyalaya-main-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
        {/* explicit favicon to override defaults / cache issues */}
        <link rel="icon" href="/webyalaya-main-logo.svg?v=2" />
        <link rel="apple-touch-icon" href="/webyalaya-main-logo.svg" />
      </head>
        <body className={`${inter.variable} ${harabara.variable} ${gotham.variable} antialiased font-sans pb-16 md:pb-0`}>
          <QueryProvider>
            <NotificationProvider>
              <ToastProvider>
                {children}
                <BottomNav />
                <FloatingActionButtons />
                <PushNotificationPrompt />
                <PushNotificationListener />
                <Suspense fallback={null}>
                  <HiddenSignInButton />
                </Suspense>
              </ToastProvider>
            </NotificationProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
