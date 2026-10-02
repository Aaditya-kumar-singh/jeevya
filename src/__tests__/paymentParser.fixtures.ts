import type { PaymentProvider } from '@/types/paymentImport';

export interface PaymentParserFixture {
  name: string;
  provider: PaymentProvider;
  text: string;
  expected: {
    amount: number;
    direction: 'expense' | 'income' | 'transfer';
    merchant?: string;
    upiId?: string;
    referenceId?: string;
    transactionStatus: 'success' | 'pending' | 'failed' | 'reversed' | 'refunded' | 'unknown';
  };
}

/** Synthetic examples only. No real customer, account, UPI, or transaction data. */
export const PAYMENT_PARSER_FIXTURES: PaymentParserFixture[] = [
  {
    name: 'Google Pay expense',
    provider: 'google_pay',
    text: 'Google Pay: You paid INR 249 to Merchant Alpha. UPI Ref: 9876543210',
    expected: { amount: 249, direction: 'expense', merchant: 'Merchant Alpha', referenceId: '9876543210', transactionStatus: 'success' },
  },
  {
    name: 'PhonePe expense',
    provider: 'phonepe',
    text: 'PhonePe: You paid INR 799 to Merchant Beta. UTR: 456789123456',
    expected: { amount: 799, direction: 'expense', merchant: 'Merchant Beta', referenceId: '456789123456', transactionStatus: 'success' },
  },
  {
    name: 'Paytm expense',
    provider: 'paytm',
    text: 'Paytm: You paid INR 599 to Merchant Gamma. UPI Transaction ID: 123456789012',
    expected: { amount: 599, direction: 'expense', merchant: 'Merchant Gamma', referenceId: '123456789012', transactionStatus: 'success' },
  },
  {
    name: 'SBI YONO expense',
    provider: 'sbi',
    text: 'YONO SBI: Your account is debited by INR 1250 for Merchant Delta. Transaction Reference: 987654321234',
    expected: { amount: 1250, direction: 'expense', merchant: 'Merchant Delta', referenceId: '987654321234', transactionStatus: 'success' },
  },
  {
    name: 'PNB One expense',
    provider: 'pnb',
    text: 'PNB One: Your account has been debited INR 875 for Merchant Epsilon. Transaction ID: 123456789012',
    expected: { amount: 875, direction: 'expense', merchant: 'Merchant Epsilon', referenceId: '123456789012', transactionStatus: 'success' },
  },
  {
    name: 'Generic UPI payment',
    provider: 'other',
    text: 'UPI payment of INR 425 to merchant@upi for Merchant Zeta. Transaction Reference: 987654321',
    expected: { amount: 425, direction: 'expense', merchant: 'Merchant Zeta', upiId: 'merchant@upi', referenceId: '987654321', transactionStatus: 'success' },
  },
  {
    name: 'Incoming UPI payment',
    provider: 'bhim',
    text: 'INR 1500 credited to your account. UTR: 555666777888',
    expected: { amount: 1500, direction: 'income', referenceId: '555666777888', transactionStatus: 'success' },
  },
  {
    name: 'Pending UPI payment',
    provider: 'other',
    text: 'INR 320 payment to Merchant Eta is pending. UPI Ref: 111222333444',
    expected: { amount: 320, direction: 'expense', merchant: 'Merchant Eta', referenceId: '111222333444', transactionStatus: 'pending' },
  },
  {
    name: 'Failed UPI payment',
    provider: 'other',
    text: 'INR 640 payment to Merchant Theta failed. UPI Ref: 222333444555',
    expected: { amount: 640, direction: 'expense', merchant: 'Merchant Theta', referenceId: '222333444555', transactionStatus: 'failed' },
  },
  {
    name: 'Refunded PhonePe wording variant',
    provider: 'phonepe',
    text: 'PhonePe refund of INR 299 from Merchant Iota. UTR 777888999000',
    expected: { amount: 299, direction: 'income', merchant: 'Merchant Iota', referenceId: '777888999000', transactionStatus: 'refunded' },
  },
  {
    name: 'Reversed bank transaction wording variant',
    provider: 'sbi',
    text: 'SBI: INR 850 transaction to Merchant Kappa was reversed. Reference Number: 333444555666',
    expected: { amount: 850, direction: 'expense', merchant: 'Merchant Kappa', referenceId: '333444555666', transactionStatus: 'reversed' },
  },
];
