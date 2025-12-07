"use client";

import Link from "next/link";
import Image from "next/image";
import { WifiOff, RefreshCw, Home } from "lucide-react";

export function OfflineClient() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800 px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/webyalaya-main-logo.svg"
            alt="Webyalaya"
            width={200}
            height={50}
            className="mx-auto h-12 w-auto"
            priority
          />
        </div>

        {/* Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-orange-100 dark:bg-orange-900/30">
            <WifiOff className="h-10 w-10 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold mb-3">
          You&apos;re Offline
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          It looks like you&apos;ve lost your internet connection. Some features may not be available until you&apos;re back online.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Link>
        </div>

        {/* Tips */}
        <div className="mt-12 text-left">
          <h2 className="text-sm font-semibold mb-3">
            While you&apos;re offline, you can:
          </h2>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600">•</span>
              View previously loaded study rooms
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">•</span>
              Review your cached profile data
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">•</span>
              Access downloaded content
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-500 dark:text-gray-500">
        Webyalaya will automatically reconnect when you&apos;re back online.
      </p>
    </div>
  );
}

