import { detectBankStatementProfile, getBankProfileConfidence } from '@/services/bankStatementProfiles';

describe('bank statement profile matrix', () => {
  test.each([
    ['sbi', 'State Bank of India\nTxn Date Value Date Description Ref No Debit Credit Balance'],
    ['hdfc', 'HDFC Bank\nDate Narration Chq./Ref.No. Value Date Withdrawal Amt. Deposit Amt.'],
    ['icici', 'ICICI Bank\nValue Date Transaction Date Transaction Remarks Cheque Number Withdrawal Amount Deposit Amount'],
    ['axis', 'Axis Bank\nTran Date Chq No Particulars Debit Credit Balance'],
    ['pnb', 'Punjab National Bank\nTransaction Date Value Date Cheque Number Transaction Remarks Withdrawal Deposit'],
    ['kotak', 'Kotak Mahindra Bank\nDate Description Chq/Ref No Debit Credit Balance'],
    ['bob', 'Bank of Baroda\nTransaction Date Narration Withdrawal Deposit Balance'],
    ['canara', 'Canara Bank\nTransaction Date Value Date Narration Withdrawal Deposit Balance'],
  ])('detects %s statement profile', (id, text) => {
    expect(detectBankStatementProfile(text)?.id).toBe(id);
    expect(getBankProfileConfidence(text)).toBeGreaterThan(0);
  });

  test('does not guess a bank from generic transaction text', () => {
    expect(detectBankStatementProfile('01/09/2026 UPI SHOP INR 250.00')).toBeNull();
    expect(getBankProfileConfidence('01/09/2026 UPI SHOP INR 250.00')).toBe(0);
  });
});
