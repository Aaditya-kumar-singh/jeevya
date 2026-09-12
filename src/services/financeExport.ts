// ─── Finance Export Service ────────────────────────────────────────────────────
// Handles CSV generation, JSON backup, and file writing.
// All export logic is isolated from UI.

import { File, Paths } from 'expo-file-system';
import { Linking } from 'react-native';
import type {
  FinanceAccount,
  FinanceTransaction,
  FinanceCategory,
  FinanceBudget,
  FinanceSavingsGoal,
} from '@/types/finance';

// ─── CSV Helpers ──────────────────────────────────────────────────────────────

/**
 * Escape a value for safe CSV embedding.
 * Handles commas, double quotes, and line breaks per RFC 4180.
 */
export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // If the value contains a comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Build a CSV row from an array of values.
 */
export function csvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(escapeCsvField).join(',');
}

/**
 * Build a complete CSV string from headers and data rows.
 */
export function buildCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines: string[] = [];

  // BOM for Excel compatibility
  lines.push('\uFEFF');
  lines.push(csvRow(headers));

  for (const row of rows) {
    lines.push(csvRow(row));
  }

  return lines.join('\n');
}

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

function buildAccountMap(accounts: FinanceAccount[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of accounts) {
    map.set(a.id, a.name);
  }
  return map;
}

function buildCategoryMap(categories: FinanceCategory[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of categories) {
    map.set(c.id, c.name);
  }
  return map;
}

function formatDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ─── Transaction CSV Export ───────────────────────────────────────────────────

export type TransactionFilter = 'all' | 'current-month' | 'selected-month';

export function generateTransactionsCsv(
  transactions: FinanceTransaction[],
  accounts: FinanceAccount[],
  categories: FinanceCategory[],
  filter: TransactionFilter,
  selectedMonth?: string,
): { csv: string; filename: string } {
  const accountMap = buildAccountMap(accounts);
  const categoryMap = buildCategoryMap(categories);

  // Filter transactions
  let filtered = [...transactions];
  if (filter === 'current-month') {
    const monthKey = formatMonthKey();
    filtered = filtered.filter((tx) => tx.date.slice(0, 7) === monthKey);
  } else if (filter === 'selected-month' && selectedMonth) {
    filtered = filtered.filter((tx) => tx.date.slice(0, 7) === selectedMonth);
  }

  // Sort by date descending
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const headers = [
    'ID',
    'Type',
    'Title',
    'Amount',
    'Account',
    'Category',
    'Date',
    'Note',
    'From Account',
    'To Account',
    'Created At',
    'Updated At',
  ];

  const rows = filtered.map((tx) => [
    tx.id,
    tx.type,
    tx.title,
    tx.amount,
    accountMap.get(tx.accountId) || tx.accountId,
    tx.type === 'transfer' ? 'Transfer' : (categoryMap.get(tx.categoryId) || 'Uncategorized'),
    tx.date,
    tx.note,
    tx.fromAccountId ? (accountMap.get(tx.fromAccountId) || tx.fromAccountId) : '',
    tx.toAccountId ? (accountMap.get(tx.toAccountId) || tx.toAccountId) : '',
    tx.createdAt,
    tx.updatedAt,
  ]);

  const datePart = filter === 'selected-month' && selectedMonth ? selectedMonth : formatDateKey();
  const filename = `lifeos-transactions-${datePart}.csv`;

  return { csv: buildCsv(headers, rows), filename };
}

// ─── Accounts CSV Export ──────────────────────────────────────────────────────

export function generateAccountsCsv(accounts: FinanceAccount[]): {
  csv: string;
  filename: string;
} {
  const headers = ['ID', 'Name', 'Type', 'Balance', 'Currency', 'Created At', 'Updated At'];

  const rows = accounts.map((a) => [
    a.id,
    a.name,
    a.type,
    a.balance,
    a.currency,
    a.createdAt,
    a.updatedAt,
  ]);

  return {
    csv: buildCsv(headers, rows),
    filename: `lifeos-accounts-${formatDateKey()}.csv`,
  };
}

// ─── Budgets CSV Export ───────────────────────────────────────────────────────

export function generateBudgetsCsv(
  budgets: FinanceBudget[],
  categories: FinanceCategory[],
): { csv: string; filename: string } {
  const categoryMap = buildCategoryMap(categories);

  const headers = ['ID', 'Category', 'Amount', 'Month', 'Created At', 'Updated At'];

  const rows = budgets.map((b) => [
    b.id,
    categoryMap.get(b.categoryId) || b.categoryId,
    b.amount,
    b.month,
    b.createdAt,
    b.updatedAt,
  ]);

  return {
    csv: buildCsv(headers, rows),
    filename: `lifeos-budgets-${formatDateKey()}.csv`,
  };
}

// ─── Savings Goals CSV Export ─────────────────────────────────────────────────

export function generateSavingsGoalsCsv(goals: FinanceSavingsGoal[]): {
  csv: string;
  filename: string;
} {
  const headers = [
    'ID',
    'Name',
    'Target Amount',
    'Current Amount',
    'Remaining',
    'Progress %',
    'Deadline',
    'Created At',
    'Updated At',
  ];

  const rows = goals.map((g) => {
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    const progress = g.targetAmount > 0
      ? Math.round((g.currentAmount / g.targetAmount) * 100)
      : 0;

    return [
      g.id,
      g.name,
      g.targetAmount,
      g.currentAmount,
      remaining,
      `${progress}%`,
      g.deadline,
      g.createdAt,
      g.updatedAt,
    ];
  });

  return {
    csv: buildCsv(headers, rows),
    filename: `lifeos-savings-goals-${formatDateKey()}.csv`,
  };
}

// ─── Full JSON Backup ─────────────────────────────────────────────────────────

export interface FinanceBackup {
  metadata: {
    app: string;
    module: string;
    exportedAt: string;
    schemaVersion: string;
  };
  data: {
    accounts: FinanceAccount[];
    transactions: FinanceTransaction[];
    categories: FinanceCategory[];
    budgets: FinanceBudget[];
    savingsGoals: FinanceSavingsGoal[];
  };
}

export function generateJsonBackup(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  categories: FinanceCategory[],
  budgets: FinanceBudget[],
  savingsGoals: FinanceSavingsGoal[],
): { json: string; filename: string } {
  const backup: FinanceBackup = {
    metadata: {
      app: 'LifeOS',
      module: 'finance',
      exportedAt: new Date().toISOString(),
      schemaVersion: '1.0',
    },
    data: {
      accounts,
      transactions,
      categories,
      budgets,
      savingsGoals,
    },
  };

  return {
    json: JSON.stringify(backup, null, 2),
    filename: `lifeos-finance-backup-${formatDateKey()}.json`,
  };
}

// ─── File Writing & Sharing ───────────────────────────────────────────────────

/**
 * Write content to a file in the document directory and attempt to share/open it.
 * Returns the file URI on success.
 */
export async function writeFileAndShare(
  content: string,
  filename: string,
): Promise<string> {
  // Create file in document directory using new expo-file-system API
  const file = new File(Paths.document, filename);

  // Write content (synchronous in new API)
  file.write(content, { encoding: 'utf8' });

  const fileUri = file.uri;

  // Try to share using expo-sharing if available
  try {
    const Sharing = require('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: filename.endsWith('.json')
          ? 'application/json'
          : 'text/csv',
        dialogTitle: `Export ${filename}`,
        UTI: filename.endsWith('.json')
          ? 'public.json'
          : 'public.comma-separated-values-text',
      });
      return fileUri;
    }
  } catch {
    // expo-sharing not available
  }

  // Fallback: open file with system handler
  try {
    await Linking.openURL(fileUri);
  } catch {
    // If Linking also fails (e.g., web), just return the URI
  }

  return fileUri;
}
