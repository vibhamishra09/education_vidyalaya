"use client";

import Link from "next/link";
import { Coins, ArrowRight, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCoins } from "@/lib/utils/coin-format";
import { useTransactionHistory } from "@/hooks/use-transactions";
import { PaymentStatus } from "@/types/api.types";
import { Skeleton } from "@/components/ui/skeleton";

interface CoinWidgetProps {
  coins?: number;
  isLoading?: boolean;
}

export function CoinWidget({ coins = 0, isLoading = false }: CoinWidgetProps) {
  const { data: transactionsData, isLoading: transactionsLoading } = useTransactionHistory();

  const recentTransactions = transactionsData?.transactions?.slice(0, 3) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">WEBYA Coins</CardTitle>
          <Link href="/profile?tab=wallet">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="text-center py-4 bg-muted/30 rounded-lg">
          {isLoading ? (
            <Skeleton className="h-10 w-32 mx-auto" />
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                <Coins className="h-6 w-6 text-yellow-600" />
                <span className="text-3xl font-bold">{formatCoins(coins)} WEBYA</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Available Balance</p>
            </>
          )}
        </div>

        {/* Recent Transactions */}
        <div>
          <h4 className="text-sm font-medium mb-3">Recent Transactions</h4>
          {transactionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent transactions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`p-1.5 rounded-full flex-shrink-0 ${
                        transaction.type === 'PAYMENT_RECEIVED'
                          ? 'bg-green-100 text-green-600'
                          : transaction.type === 'REFUND_RECEIVED'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {transaction.type === 'PAYMENT_RECEIVED' ? (
                        <ArrowDownLeft className="h-3 w-3" />
                      ) : transaction.type === 'REFUND_RECEIVED' ? (
                        <RefreshCw className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {transaction.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-xs font-semibold ${
                        transaction.type === 'PAYMENT_MADE'
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
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
      </CardContent>
    </Card>
  );
}
