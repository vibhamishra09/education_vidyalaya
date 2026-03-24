import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { CreditCard, Wallet, ArrowUpRight, ArrowDownLeft, Clock, DollarSign, Plus } from 'lucide-react-native';

const PACKAGES = [
    { coins: 100, price: 10 },
    { coins: 200, price: 20 },
    { coins: 500, price: 50, tag: "Popular" },
    { coins: 1000, price: 100, tag: "Best Value" },
    { coins: 2000, price: 200 },
    { coins: 5000, price: 500 },
];

const TRANSACTIONS = [
    { id: '1', title: 'Python Session', type: 'credit', amount: 0, date: 'Today, 2:30 PM', status: 'Completed' },
    { id: '2', title: 'Dailymeets Subscription', type: 'debit', amount: 1, date: 'Yesterday, 10:00 AM', status: 'Completed' },
    { id: '3', title: 'test', type: 'debit', amount: 1, date: 'Jan 28, 9:15 AM', status: 'Completed' },
    { id: '4', title: 'work meet', type: 'debit', amount: 0, date: 'Jan 25, 4:00 PM', status: 'Completed' },
    { id: '5', title: 'Team Meet', type: 'debit', amount: 1, date: 'Jan 22, 11:30 AM', status: 'Completed' },
];

const WALLET_STATS = [
    { label: "Current Balance", value: "1,500", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
    { label: "Total Earned", value: "3,250", icon: ArrowUpRight, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { label: "Hourly Rate", value: "50", icon: Clock, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
];

export function WalletTab() {
  return (
    <View className="px-4 pb-20">
      {/* Wallet Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-4 px-4">
        {WALLET_STATS.map((stat, index) => {
            const Icon = stat.icon;
            return (
                <View key={index} className="mr-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-40 shadow-sm">
                    <View className={`w-10 h-10 rounded-full items-center justify-center mb-3 ${stat.bg}`}>
                        <Icon size={20} className={stat.color} />
                    </View>
                    <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{stat.value}</Text>
                    <Text className="text-slate-500 text-xs font-medium">{stat.label}</Text>
                </View>
            );
        })}
      </ScrollView>

      {/* Buy Coins */}
      <View className="mb-8">
        <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">Buy Coins</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
             {PACKAGES.map((pkg, index) => (
                 <TouchableOpacity 
                    key={index} 
                    className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
                 >
                    {pkg.tag && (
                        <View className="absolute top-0 right-0 bg-emerald-500 px-2 py-0.5 rounded-bl-lg">
                            <Text className="text-[10px] font-bold text-white uppercase">{pkg.tag}</Text>
                        </View>
                    )}
                    <View className="flex-row items-center gap-1 mb-1">
                        <Text className="text-xl font-bold text-slate-900 dark:text-white">{pkg.coins}</Text>
                        <Text className="text-xs text-slate-400 font-medium">Coins</Text>
                    </View>
                    <Text className="text-emerald-600 font-bold">₹{pkg.price}</Text>
                 </TouchableOpacity>
             ))}
        </View>
      </View>

      {/* Transaction History */}
      <View>
        <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">Transaction History</Text>
        {TRANSACTIONS.map((tx) => (
            <View key={tx.id} className="flex-row items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${
                        tx.type === 'credit' ? 'bg-emerald-100' : 'bg-slate-100'
                    }`}>
                        {tx.type === 'credit' ? (
                            <ArrowDownLeft size={20} className="text-emerald-600" />
                        ) : (
                            <ArrowUpRight size={20} className="text-slate-600" />
                        )}
                    </View>
                    <View>
                        <Text className="font-semibold text-slate-900 dark:text-white">{tx.title}</Text>
                        <Text className="text-xs text-slate-500">{tx.date}</Text>
                    </View>
                </View>
                <View className="items-end">
                    <Text className={`font-bold ${
                        tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                    }`}>
                        {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                    </Text>
                    <Text className="text-[10px] text-slate-400 uppercase">{tx.status}</Text>
                </View>
            </View>
        ))}
      </View>
    </View>
  );
}
