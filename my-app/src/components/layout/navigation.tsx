"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
import { NotificationDropdown } from "./notification-dropdown";
import { UserDropdown } from "./user-dropdown";
import { CoinDropdown } from "./coin-dropdown";
import { useCurrentUser } from "@/hooks/use-users";
import { formatCoins } from "@/lib/utils/coin-format";
// import { isAuthError } from "@/lib/utils/error-handling";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { User, Settings, LogOut } from "lucide-react";

export function Navigation() {
  const [mobileAvatarOpen, setMobileAvatarOpen] = useState(false);
  const { isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const { data: currentUserData, isLoading: isUserLoading } = useCurrentUser();
  const pathname = usePathname();
  
  // Check if the error is an authentication error
  // const isAuthErrorOccurred = isAuthError(userError);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 relative group">
            <img
              src="/logo_green.png"
              alt="Webyalaya"
              className="h-8 object-contain rounded-md bg-white dark:bg-gray-900 px-1 transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isSignedIn ? (
              <>
                <Link
                  href="/browse"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    pathname === '/browse'
                      ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
                  }`}
                >
                  Browse
                </Link>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    pathname === '/dashboard'
                      ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
                  }`}
                >
                  Dashboard
                </Link>

                {/* Coins */}
                <CoinDropdown
                  coins={
                    currentUserData?.user?.coins !== undefined && currentUserData?.user?.coins !== null
                      ? typeof currentUserData.user.coins === 'string'
                        ? parseFloat(currentUserData.user.coins)
                        : currentUserData.user.coins
                      : 0
                  }
                  isLoading={isUserLoading}
                />

                {/* Notifications */}
                <NotificationDropdown />

                {/* User Dropdown */}
                <UserDropdown user={user} signOut={signOut} />
              </>
            ) : (
              <>
                <Link
                  href="/browse"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    pathname === '/browse'
                      ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/50 hover:after:rounded-full'
                  }`}
                >
                  Browse
                </Link>
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button variant="outline" size="sm">
                      Sign Up
                    </Button>
                  </SignUpButton>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          {isSignedIn ? (
            <div className="md:hidden relative">
              <button
                className="p-2"
                onClick={() => setMobileAvatarOpen(!mobileAvatarOpen)}
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 ring-primary transition-all">
                  <AvatarImage 
                    src={currentUserData?.user?.avatar || user?.imageUrl} 
                    alt={currentUserData?.user?.name || user?.fullName || user?.firstName || "User"} 
                  />
                  <AvatarFallback>
                    {currentUserData?.user?.name?.charAt(0) || user?.firstName?.charAt(0) || user?.emailAddresses?.[0]?.emailAddress?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>

              {/* Mobile Avatar Dropdown */}
              <AnimatePresence>
                {mobileAvatarOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMobileAvatarOpen(false)}
                    />

                    {/* Dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 z-50"
                    >
                      <Card className="shadow-lg">
                        <CardContent className="p-0">
                          {/* User Info Header */}
                          <div className="px-4 py-3 border-b">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage 
                                  src={currentUserData?.user?.avatar || user?.imageUrl} 
                                  alt={currentUserData?.user?.name || user?.fullName || user?.firstName || "User"} 
                                />
                                <AvatarFallback>
                                  {currentUserData?.user?.name?.charAt(0) || user?.firstName?.charAt(0) || user?.emailAddresses?.[0]?.emailAddress?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {currentUserData?.user?.name || user?.fullName || user?.firstName || "User"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {currentUserData?.user?.username 
                                    ? `@${currentUserData.user.username}` 
                                    : currentUserData?.user?.email?.split('@')[0] 
                                    ? `@${currentUserData.user.email.split('@')[0]}`
                                    : user?.emailAddresses?.[0]?.emailAddress?.split('@')[0]
                                    ? `@${user.emailAddresses[0].emailAddress.split('@')[0]}`
                                    : "No username"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-2 px-1">
                              <Coins className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium">
                                {isUserLoading ? '...' : formatCoins(currentUserData?.user?.coins)} coins
                              </span>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="py-1">
                            <Link
                              href="/profile"
                              onClick={() => setMobileAvatarOpen(false)}
                            >
                              <div className={`flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer ${
                                pathname === '/profile' ? 'bg-muted/30' : ''
                              }`}>
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Profile</span>
                              </div>
                            </Link>
                            
                            <Link
                              href="/settings"
                              onClick={() => setMobileAvatarOpen(false)}
                            >
                              <div className={`flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer ${
                                pathname === '/settings' ? 'bg-muted/30' : ''
                              }`}>
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Settings</span>
                              </div>
                            </Link>
                          </div>

                          {/* Logout Button */}
                          <div className="border-t py-1">
                            <button
                              onClick={() => {
                                setMobileAvatarOpen(false);
                                signOut();
                              }}
                              className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer w-full text-left"
                            >
                              <LogOut className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Logout</span>
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="md:hidden flex items-center gap-2">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline" size="sm">
                  Sign Up
                </Button>
              </SignUpButton>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
