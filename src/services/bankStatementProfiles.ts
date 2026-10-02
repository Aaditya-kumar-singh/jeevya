export interface BankStatementProfile {
  id: string;
  name: string;
  markers: string[];
  dateHeaders: string[];
  descriptionHeaders: string[];
  debitHeaders: string[];
  creditHeaders: string[];
  referenceHeaders: string[];
}

export const BANK_STATEMENT_PROFILES: BankStatementProfile[] = [
  { id: 'sbi', name: 'State Bank of India', markers: ['state bank of india', 'sbi', 'txn date', 'value date'], dateHeaders: ['txn date', 'transaction date', 'value date'], descriptionHeaders: ['description', 'transaction remarks', 'narration'], debitHeaders: ['debit', 'withdrawal', 'withdrawal amt'], creditHeaders: ['credit', 'deposit', 'deposit amt'], referenceHeaders: ['ref no', 'reference no', 'cheque no'] },
  { id: 'hdfc', name: 'HDFC Bank', markers: ['hdfc bank', 'narration', 'chq./ref.no', 'withdrawal amt.'], dateHeaders: ['date', 'transaction date', 'value date'], descriptionHeaders: ['narration', 'description', 'particulars'], debitHeaders: ['withdrawal amt', 'withdrawal', 'debit'], creditHeaders: ['deposit amt', 'deposit', 'credit'], referenceHeaders: ['chq./ref.no', 'chq/ref no', 'reference no'] },
  { id: 'icici', name: 'ICICI Bank', markers: ['icici bank', 'transaction remarks', 'withdrawal amount', 'deposit amount'], dateHeaders: ['transaction date', 'value date'], descriptionHeaders: ['transaction remarks', 'description'], debitHeaders: ['withdrawal amount', 'debit'], creditHeaders: ['deposit amount', 'credit'], referenceHeaders: ['cheque number', 'reference number'] },
  { id: 'axis', name: 'Axis Bank', markers: ['axis bank', 'tran date', 'particulars', 'chq no'], dateHeaders: ['tran date', 'transaction date', 'value date'], descriptionHeaders: ['particulars', 'description', 'narration'], debitHeaders: ['debit', 'withdrawal'], creditHeaders: ['credit', 'deposit'], referenceHeaders: ['chq no', 'chq/ref no', 'reference no'] },
  { id: 'pnb', name: 'Punjab National Bank', markers: ['punjab national bank', 'pnb', 'transaction date', 'transaction remarks'], dateHeaders: ['transaction date', 'txn date', 'value date'], descriptionHeaders: ['transaction remarks', 'description', 'narration'], debitHeaders: ['withdrawal', 'debit'], creditHeaders: ['deposit', 'credit'], referenceHeaders: ['cheque number', 'ref no', 'reference no'] },
  { id: 'kotak', name: 'Kotak Mahindra Bank', markers: ['kotak mahindra', 'kotak bank', 'chq/ref no', 'description'], dateHeaders: ['date', 'transaction date'], descriptionHeaders: ['description', 'narration', 'particulars'], debitHeaders: ['debit', 'withdrawal'], creditHeaders: ['credit', 'deposit'], referenceHeaders: ['chq/ref no', 'reference no'] },
  { id: 'bob', name: 'Bank of Baroda', markers: ['bank of baroda', 'bob', 'transaction date', 'withdrawal'], dateHeaders: ['transaction date', 'txn date', 'value date'], descriptionHeaders: ['narration', 'description', 'particulars'], debitHeaders: ['withdrawal', 'debit'], creditHeaders: ['deposit', 'credit'], referenceHeaders: ['cheque no', 'ref no'] },
  { id: 'canara', name: 'Canara Bank', markers: ['canara bank', 'transaction date', 'withdrawal', 'deposit'], dateHeaders: ['transaction date', 'txn date', 'value date'], descriptionHeaders: ['narration', 'description', 'particulars'], debitHeaders: ['withdrawal', 'debit'], creditHeaders: ['deposit', 'credit'], referenceHeaders: ['cheque no', 'ref no'] },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function detectBankStatementProfile(text: string): BankStatementProfile | null {
  const normalized = normalize(text);
  let best: { profile: BankStatementProfile; score: number } | null = null;
  for (const profile of BANK_STATEMENT_PROFILES) {
    const score = profile.markers.reduce((sum, marker) => sum + (normalized.includes(normalize(marker)) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { profile, score };
  }
  return best?.profile ?? null;
}

export function getBankProfileConfidence(text: string): number {
  const normalized = normalize(text);
  const scores = BANK_STATEMENT_PROFILES.map((profile) => profile.markers.reduce((sum, marker) => sum + (normalized.includes(normalize(marker)) ? 1 : 0), 0));
  const max = Math.max(0, ...scores);
  return max === 0 ? 0 : Math.min(1, max / 4);
}
