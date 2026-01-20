"use client";

import { memo } from "react";
import { Coins, ArrowUpRight, ArrowDownLeft, RefreshCw, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletChart } from "@/components/stats/wallet-chart";
import { formatCoins } from "@/lib/utils/coin-format";
import { useTransactionHistory } from "@/hooks/use-transactions";
import { PaymentStatus } from "@/types/api.types";

interface WalletTabProps {
  coins?: number | string;
  hourlyRate?: number | string;
  isLoading?: boolean;
}

export const WalletTab = memo(function WalletTab({ coins, hourlyRate, isLoading = false }: WalletTabProps) {
  const { data: transactionsData, isLoading: transactionsLoading, refetch } = useTransactionHistory();

  const transactions = transactionsData?.transactions || [];

  // Calculate earnings stats (include both payments received and refunds received)
  const totalEarned = transactions
    .filter(t => t.type === 'PAYMENT_RECEIVED' || t.type === 'REFUND_RECEIVED')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">{formatCoins(coins)} Webya</p>
                )}
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Coins className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                {transactionsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    +{formatCoins(totalEarned)} Webya
                  </p>
                )}
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Hourly Rate</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">
                    {hourlyRate ? <>{formatCoins(hourlyRate)} Webya</> : 'Not set'}
                  </p>
                )}
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Coins className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Activity Chart */}
      <WalletChart />

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={transactionsLoading}
            >
              {transactionsLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-1">No transactions yet</p>
              <p className="text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2.5 rounded-full flex-shrink-0 ${
                        transaction.type === 'PAYMENT_RECEIVED'
                          ? 'bg-green-100 text-green-600'
                          : transaction.type === 'REFUND_RECEIVED'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {transaction.type === 'PAYMENT_RECEIVED' ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : transaction.type === 'REFUND_RECEIVED' ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p
                      className={`text-lg font-semibold ${
                        transaction.type === 'PAYMENT_MADE'
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {transaction.type === 'PAYMENT_MADE' ? '-' : '+'}
                      {formatCoins(transaction.amount)} Webya
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        transaction.status === PaymentStatus.RECEIVED
                          ? 'border-green-200 text-green-700 bg-green-50'
                          : transaction.status === PaymentStatus.ESCROW
                          ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                          : 'border-red-200 text-red-700 bg-red-50'
                      }`}
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
