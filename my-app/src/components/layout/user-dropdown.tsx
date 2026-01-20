"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/hooks/use-users";
import { formatCoins } from "@/lib/utils/coin-format";
// import { isAuthError } from "@/lib/utils/error-handling";
interface UserDropdownProps {
  user: {
    imageUrl?: string;
    fullName?: string | null;
    firstName?: string | null;
    emailAddresses?: Array<{ emailAddress: string }>;
  } | null;
  signOut: () => void;
}

export function UserDropdown({ user, signOut }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: currentUserData, isLoading: isUserLoading } = useCurrentUser();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
  
  // Check if the error is an authentication error
  // const isAuthErrorOccurred = isAuthError(userError);

  const handleLogout = () => {
    setIsOpen(false);
    signOut();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-2 p-1 hover:bg-muted rounded-full transition-colors"
        onClick={() => setIsOpen(!isOpen)}
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

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-64 z-50"
              onClick={(e) => e.stopPropagation()}
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
                    <div
                      className="flex items-center gap-1 mt-2 px-1 cursor-help"
                      title={isUserLoading ? 'Loading...' : `${formatCoins(currentUserData?.user?.coins)} WEBYA`}
                    >
                      <Coins className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">
                        {isUserLoading ? '...' : formatCoins(currentUserData?.user?.coins)} WEBYA
                      </span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Profile</span>
                      </div>
                    </Link>
                  </div>

                  {/* Logout Button */}
                  <div className="border-t py-1">
                    <button
                      onClick={handleLogout}
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
  );
}
