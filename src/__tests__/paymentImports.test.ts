import { parsePaymentText } from '@/services/paymentImports';
import { PAYMENT_PARSER_FIXTURES } from './paymentParser.fixtures';

describe('payment import parser', () => {
  test('parses an expense with UPI reference and merchant', () => {
    const result = parsePaymentText(
      'Paid INR 350 to ABC Store via UPI. UPI Ref 1234567890.',
      'google_pay',
    );
    expect(result.amount).toBe(350);
    expect(result.direction).toBe('expense');
    expect(result.merchant).toContain('ABC Store');
    expect(result.referenceId).toBe('1234567890');
    expect(result.transactionStatus).toBe('success');
  });

  test('parses a Google Pay style UPI payment', () => {
    const result = parsePaymentText(
      'Google Pay: You paid ₹249 to Swiggy. UPI Ref: 9876543210',
      'google_pay',
    );
    expect(result.amount).toBe(249);
    expect(result.direction).toBe('expense');
    expect(result.merchant).toContain('Swiggy');
    expect(result.referenceId).toBe('9876543210');
    expect(result.transactionStatus).toBe('success');
  });

  test('parses a PhonePe style UPI payment', () => {
    const result = parsePaymentText(
      'PhonePe: You paid ₹799 to Zomato. UTR: 456789123456',
      'phonepe',
    );
    expect(result.amount).toBe(799);
    expect(result.direction).toBe('expense');
    expect(result.merchant).toContain('Zomato');
    expect(result.referenceId).toBe('456789123456');
    expect(result.transactionStatus).toBe('success');
  });

  test('parses a Paytm style UPI payment', () => {
    const result = parsePaymentText(
      'Paytm: You paid ₹599 to Amazon. UPI Transaction ID: 123456789012',
      'paytm',
    );
    expect(result.amount).toBe(599);
    expect(result.direction).toBe('expense');
    expect(result.merchant).toContain('Amazon');
    expect(result.referenceId).toBe('123456789012');
    expect(result.transactionStatus).toBe('success');
  });

  test('parses an SBI YONO style bank payment', () => {
    const result = parsePaymentText(
      'YONO SBI: Your account is debited by INR 1,250 for AMAZON. Transaction Reference: 987654321234',
      'sbi',
    );
    expect(result.amount).toBe(1250);
    expect(result.direction).toBe('expense');
    expect(result.merchant).toContain('AMAZON');
    expect(result.referenceId).toBe('987654321234');
    expect(result.transactionStatus).toBe('success');
  });

  test('parses a PNB One style bank payment', () => {
    const result = parsePaymentText(
      'PNB One: Your account has been debited INR 875 for FLIPKART. Transaction ID: 123456789012',
      'pnb',
    );
    expect(result.amount).toBe(875);
    expect(result.direction).toBe('expense');
    expect(result.merchant).toContain('FLIPKART');
    expect(result.referenceId).toBe('123456789012');
    expect(result.transactionStatus).toBe('success');
  });

  test('parses a generic UPI payment', () => {
    const result = parsePaymentText(
      'UPI payment of INR 425 to cafe@upi for Coffee Shop. Transaction Reference: 987654321',
      'other',
    );
    expect(result.amount).toBe(425);
    expect(result.direction).toBe('expense');
    expect(result.merchant).toContain('Coffee Shop');
    expect(result.upiId).toBe('cafe@upi');
    expect(result.referenceId).toBe('987654321');
    expect(result.transactionStatus).toBe('success');
  });

  test('detects income and failure state', () => {
    const result = parsePaymentText(
      'INR 1,500 credited to your account. Transaction failed.',
      'phonepe',
    );
    expect(result.amount).toBe(1500);
    expect(result.direction).toBe('income');
    expect(result.transactionStatus).toBe('failed');
  });


  test.each(PAYMENT_PARSER_FIXTURES)('$name fixture', (fixture) => {
    const result = parsePaymentText(fixture.text, fixture.provider);
    expect(result.amount).toBe(fixture.expected.amount);
    expect(result.direction).toBe(fixture.expected.direction);
    expect(result.merchant).toBe(fixture.expected.merchant);
    expect(result.upiId).toBe(fixture.expected.upiId);
    expect(result.referenceId).toBe(fixture.expected.referenceId);
    expect(result.transactionStatus).toBe(fixture.expected.transactionStatus);
  });
  test('rejects text without an amount', () => {
    expect(() => parsePaymentText('Payment received from ABC')).toThrow(
      'Could not find a payment amount',
    );
  });
});
