import type { FinanceTransaction } from '@/types/finance';

export interface TransferMatch {
  transactionId: string;
  matchedTransactionId: string;
  confidence: number;
  reason: string;
}

export function findSelfTransfers(transactions: FinanceTransaction[]): TransferMatch[] {
  const transfers = transactions.filter((item) => item.type === 'transfer');
  const matches: TransferMatch[] = [];

  for (let i = 0; i < transfers.length; i += 1) {
    for (let j = i + 1; j < transfers.length; j += 1) {
      const a = transfers[i];
      const b = transfers[j];
      if (a.amount !== b.amount || a.accountId === b.accountId) continue;

      const timeDiff = Math.abs(Date.parse(a.date) - Date.parse(b.date));
      if (timeDiff > 48 * 60 * 60 * 1000) continue;

      const sameReference = !!a.referenceId && !!b.referenceId && a.referenceId === b.referenceId;
      const oppositeAccounts =
        a.fromAccountId === b.toAccountId &&
        a.toAccountId === b.fromAccountId;

      if (!sameReference && !oppositeAccounts) continue;

      matches.push({
        transactionId: a.id,
        matchedTransactionId: b.id,
        confidence: sameReference ? 0.98 : 0.9,
        reason: sameReference ? 'Same payment reference and amount.' : 'Opposite accounts, same amount and close timestamp.',
      });
    }
  }

  return matches;
}
