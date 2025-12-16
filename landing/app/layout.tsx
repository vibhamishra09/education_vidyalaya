import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingActionButtons } from "@/components/ui/floating-action-buttons";
import { PushNotificationPrompt } from "@/components/notifications/push-notification-prompt";
import { PushNotificationListener } from "@/components/notifications/push-notification-listener";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Base URL for the site
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://webyalaya.com";

// Determine if this is a production domain (not test or dev)
const isProduction = siteUrl.includes("webyalaya.com") && 
                     !siteUrl.includes("test.webyalaya.com") && 
                     !siteUrl.includes("dev.webyalaya.com");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)", color: "#15803d" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  
  // Basic SEO
  title: {
    default: "Webyalaya - Peer to Peer Learning Platform",
    template: "%s | Webyalaya",
  },
  description: "Connect with peers to learn and teach. Join study rooms, host sessions, earn mAYA coins, and grow together in a collaborative learning community. Free peer-to-peer education platform.",
  keywords: [
    "peer learning",
    "online tutoring",
    "study rooms",
    "collaborative learning",
    "skill sharing",
    "education platform",
    "peer-to-peer education",
    "group study",
    "online learning",
    "tutoring platform",
    "skill exchange",
    "knowledge sharing",
    "mAYA coins",
    "webyalaya",
  ],
  authors: [{ name: "Webyalaya Team" }],
  creator: "Webyalaya",
  publisher: "Webyalaya",
  
  // Robots - conditionally set based on environment
  // For test/dev environments, set noindex to prevent search engine indexing
  robots: isProduction
    ? {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
          index: true,
          follow: true,
          noimageindex: false,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      }
    : {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
          "max-video-preview": -1,
          "max-image-preview": "none",
          "max-snippet": -1,
        },
      },
  
  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Webyalaya",
    title: "Webyalaya - Peer to Peer Learning Platform",
    description: "Connect with peers to learn and teach. Join study rooms, host sessions, and grow together in a collaborative learning community.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Webyalaya - Peer to Peer Learning Platform",
        type: "image/png",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Webyalaya - Peer to Peer Learning Platform",
    description: "Connect with peers to learn and teach. Join study rooms, host sessions, and grow together.",
    images: ["/og-image.png"],
    creator: "@webyalaya",
    site: "@webyalaya",
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/webyalaya-main-logo.svg",
        color: "#16a34a",
      },
    ],
  },
  
  // Manifest for PWA
  manifest: "/manifest.json",
  
  // App Links
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Webyalaya",
  },
  
  // Format Detection
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  // Verification (add your IDs when available)
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  
  // Category
  category: "education",
  
  // Additional
  applicationName: "Webyalaya",
  referrer: "origin-when-cross-origin",
  generator: "Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Webyalaya" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Webyalaya" />
        <meta name="msapplication-TileColor" content="#16a34a" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Explicit favicon to override defaults / cache issues */}
        <link rel="icon" href="/webyalaya-main-logo.svg?v=2" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch for external APIs */}
        <link rel="dns-prefetch" href="https://api.dicebear.com" />
      </head>
      <body className={`${inter.variable} antialiased font-sans pb-16 md:pb-0`}>
        {children}
        <BottomNav />
        <FloatingActionButtons />
        <PushNotificationPrompt />
        <PushNotificationListener />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
