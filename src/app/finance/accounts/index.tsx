import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { ArrowLeft, ArrowRightLeft, ChevronRight, Landmark, Plus } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    credit: 'Credit',
    cash: 'Cash',
    investment: 'Investment',
  };
  return labels[type] || type;
}

function getAccountTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    checking: '🏦',
    savings: '💰',
    credit: '💳',
    cash: '💵',
    investment: '📈',
  };
  return icons[type] || '🏦';
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const { accounts, transactions, loading, refreshing, refresh } = useFinance();

  // Build transaction count per account
  const accountTxCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type === 'transfer') {
        // Count transfers involving this account
        if (tx.fromAccountId) {
          counts.set(tx.fromAccountId, (counts.get(tx.fromAccountId) || 0) + 1);
        }
        if (tx.toAccountId) {
          counts.set(tx.toAccountId, (counts.get(tx.toAccountId) || 0) + 1);
        }
      } else {
        counts.set(tx.accountId, (counts.get(tx.accountId) || 0) + 1);
      }
    }
    return counts;
  }, [transactions]);

  // Total balance
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  // Loading state
  if (loading) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text size="sm" className="mt-3 text-muted-foreground">
            Loading accounts...
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text size="sm" className="text-muted-foreground">
              Finance · Accounts
            </Text>
            <Heading size="xl" className="mt-1">
              Accounts
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              {accounts.length} accounts · {formatCurrency(totalBalance)} total
            </Text>
          </View>
          <Link href="/finance/add-account" asChild>
            <Pressable>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Plus size={20} className="text-primary-foreground" />
              </View>
            </Pressable>
          </Link>
        </View>

        {/* Account List */}
        {accounts.length === 0 ? (
          <Card className="w-full items-center p-6">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Landmark size={32} className="text-muted-foreground" />
            </View>
            <Heading size="md" className="mt-4">
              No accounts yet
            </Heading>
            <Text size="sm" className="mt-2 text-center text-muted-foreground">
              Create your first account to start tracking your finances.
            </Text>
            <Link href="/finance/add-account" asChild>
              <Pressable>
                <Button variant="default" className="mt-4">
                  <ButtonText>Add Account</ButtonText>
                </Button>
              </Pressable>
            </Link>
          </Card>
        ) : (
          <View className="gap-3">
            {accounts.map((account) => (
              <Link
                key={account.id}
                href={{ pathname: '/finance/accounts/[id]', params: { id: account.id } }}
                asChild>
                <Pressable>
                  <Card className="w-full p-4">
                    <View className="flex-row items-center gap-3">
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
                        <Text size="lg">{getAccountTypeIcon(account.type)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text size="md" className="font-medium text-foreground">
                          {account.name}
                        </Text>
                        <Text size="xs" className="text-muted-foreground">
                          {getAccountTypeLabel(account.type)} · {account.currency}
                          {accountTxCounts.has(account.id)
                            ? ` · ${accountTxCounts.get(account.id)} transactions`
                            : ''}
                        </Text>
                      </View>
                      <View className="items-end gap-1">
                        <Text size="md" className="font-semibold text-foreground">
                          {formatCurrency(account.balance)}
                        </Text>
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </Link>
            ))}
          </View>
        )}

        {/* Transfer Action */}
        {accounts.length >= 2 && (
          <Link href="/finance/transfer" asChild>
            <Pressable>
              <Card className="w-full p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <ArrowRightLeft size={20} className="text-secondary-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text size="md" className="font-medium text-foreground">
                      Transfer Between Accounts
                    </Text>
                    <Text size="xs" className="text-muted-foreground">
                      Move money between your accounts
                    </Text>
                  </View>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </View>
              </Card>
            </Pressable>
          </Link>
        )}
      </View>
    </ScrollView>
  );
}
