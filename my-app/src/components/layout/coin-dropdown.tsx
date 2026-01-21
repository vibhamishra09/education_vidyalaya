"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Coins, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCoins } from "@/lib/utils/coin-format";
import { useTransactionHistory } from "@/hooks/use-transactions";
import { PaymentStatus } from "@/types/api.types";

interface CoinDropdownProps {
  coins?: number;
  isLoading?: boolean;
}

export function CoinDropdown({ coins = 0, isLoading = false }: CoinDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const { data: transactionsData, isLoading: transactionsLoading } = useTransactionHistory();

  const recentTransactions = transactionsData?.transactions?.slice(0, 3) || [];

  // Ensure coins is always a number
  const coinBalance = typeof coins === 'string' ? parseFloat(coins) : (coins ?? 0);
  const displayCoins = isNaN(coinBalance) ? 0 : coinBalance;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Coins className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium">
          {isLoading ? '...' : formatCoins(displayCoins)} WEBYA
        </span>
      </div>

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
              className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-80 z-50 sm:absolute sm:left-auto sm:translate-x-0 sm:top-auto sm:right-0 sm:mt-2 sm:w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    <span>WEBYA Balance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Balance Display */}
                  <div className="text-center py-3 bg-muted/30 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <Coins className="h-6 w-6 text-yellow-600" />
                      <span className="text-3xl font-bold">
                        {formatCoins(displayCoins)} WEBYA
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Available Balance
                    </p>
                  </div>

                  {/* Recent Transactions */}
                  <div className="px-4 py-3">
                    <h4 className="text-sm font-medium mb-3">Recent Transactions</h4>
                    {transactionsLoading ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Loading transactions...
                      </div>
                    ) : recentTransactions.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No recent transactions
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentTransactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-full ${
                                transaction.type === 'PAYMENT_RECEIVED'
                                  ? 'bg-green-100 text-green-600'
                                  : transaction.type === 'REFUND_RECEIVED'
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-red-100 text-red-600'
                              }`}>
                                {transaction.type === 'PAYMENT_RECEIVED' ? (
                                  <ArrowDownLeft className="h-3 w-3" />
                                ) : transaction.type === 'REFUND_RECEIVED' ? (
                                  <RefreshCw className="h-3 w-3" />
                                ) : (
                                  <ArrowUpRight className="h-3 w-3" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-medium truncate max-w-[140px]">
                                  {transaction.description}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(transaction.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-semibold ${
                                transaction.type === 'PAYMENT_MADE'
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }`}>
                                {transaction.type === 'PAYMENT_MADE' ? '-' : '+'}
                                {formatCoins(transaction.amount)} WEBYA
                              </p>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1 h-4 ${
                                  transaction.status === PaymentStatus.RECEIVED
                                    ? 'border-green-200 text-green-700'
                                    : transaction.status === PaymentStatus.ESCROW
                                    ? 'border-yellow-200 text-yellow-700'
                                    : 'border-red-200 text-red-700'
                                }`}
                              >
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {recentTransactions.length > 0 && (
                    <div className="px-4 py-3 border-t">
                      <Link href="/profile?tab=wallet" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full">
                          View All Transactions
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
