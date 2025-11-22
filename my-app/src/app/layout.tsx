import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/contexts/toast-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingActionButtons } from "@/components/ui/floating-action-buttons";
import { PushNotificationPrompt } from "@/components/notifications/push-notification-prompt";
import { HiddenSignInButton } from "@/components/auth/hidden-sign-in-button";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Webyalaya",
  description: "Peer to peer learning platform",
  icons: {
    icon: "/favicon.ico",
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
        <body className={`${inter.variable} antialiased font-sans pb-16 md:pb-0`}>
          <QueryProvider>
            <NotificationProvider>
              <ToastProvider>
                {children}
                <BottomNav />
                <FloatingActionButtons />
                <PushNotificationPrompt />
                <HiddenSignInButton />
              </ToastProvider>
            </NotificationProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
