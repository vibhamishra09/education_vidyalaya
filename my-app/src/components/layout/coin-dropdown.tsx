"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMaya } from "@/lib/utils/coin-format";
import { useTransactionHistory } from "@/hooks/use-transactions";
import { PaymentStatus } from "@/types/api.types";

interface CoinDropdownProps {
  coins?: number;
  isLoading?: boolean;
}

export function CoinDropdown({ coins = 0, isLoading = false }: CoinDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: transactionsData, isLoading: transactionsLoading } = useTransactionHistory();

  const recentTransactions = transactionsData?.transactions?.slice(0, 3) || [];

  // Ensure coins is always a number
  const coinBalance = typeof coins === 'string' ? parseFloat(coins) : (coins ?? 0);
  const displayCoins = isNaN(coinBalance) ? 0 : coinBalance;

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Coins className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium">
          {isLoading ? '...' : formatMaya(displayCoins)} <span className="text-xs">m</span>AYA
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
              className="absolute right-0 mt-2 w-80 z-50"
            >
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span><span className="text-sm">m</span>AYA Balance</span>
                    <Link href="/profile?tab=wallet" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" size="sm" className="h-8">
                        View All
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Balance Display */}
                  <div className="text-center py-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Coins className="h-6 w-6 text-yellow-600" />
                      <span className="text-3xl font-bold">
                        {formatMaya(displayCoins)} <span className="text-xl">m</span>AYA
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available Balance
                    </p>
                  </div>

                  {/* Recent Transactions */}
                  <div>
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
                                {formatMaya(transaction.amount)} <span className="text-[10px]">m</span>AYA
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
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
