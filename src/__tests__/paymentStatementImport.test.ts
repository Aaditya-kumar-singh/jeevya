jest.mock('@uzimandias/react-native-pdf-to-image', () => ({ convertPages: jest.fn(), getPdfInfo: jest.fn() }));
jest.mock('expo-mlkit-ocr', () => ({ recognizeText: jest.fn(), isSupported: () => true }));

jest.mock('expo-pdf-text-extract', () => ({
  extractText: jest.fn(),
  isAvailable: () => true,
}));

import {
  previewPdfStatement,
  previewCsvStatement,
  extractPdfStatementPreview,
  extractPdfStatementPreviewWithOcr,
  previewStatementDuplicates,
} from '@/services/paymentStatementImport';
import { clearPaymentImports, createPaymentImport } from '@/services/paymentImports';
import { extractText } from 'expo-pdf-text-extract';
import { convertPages, getPdfInfo } from '@uzimandias/react-native-pdf-to-image';
import { recognizeText } from 'expo-mlkit-ocr';

describe('payment PDF statement import', () => {
  beforeEach(async () => {
    await clearPaymentImports();
  });
  test('extracts dated debit and credit rows from a text PDF payload', () => {
    const preview = previewPdfStatement([
      'Date Description Debit Credit Balance',
      '01/09/2026 UPI/ABC Store 350.00 9650.00',
      '02/09/2026 UPI/Salary Credit 45,000.00 54,650.00',
      '03/09/2026 Opening Balance 54,650.00',
    ].join('\n'));

    expect(preview.format).toBe('pdf');
    expect(preview.validCount).toBe(2);
    expect(preview.rows[0].amount).toBe(350);
    expect(preview.rows[0].direction).toBe('expense');
    expect(preview.rows[1].amount).toBe(45000);
    expect(preview.rows[1].direction).toBe('income');
    expect(preview.rows[0].date).toContain('2026-09-01');
  });

  test('identifies the bank profile while parsing a bank-style statement', () => {
    const preview = previewPdfStatement(['HDFC Bank', 'Date Narration Chq./Ref.No. Withdrawal Amt. Deposit Amt. Balance', '05/09/2026 UPI/COFFEE SHOP 350.00 9650.00'].join('\\n'));
    expect(preview.bankProfileId).toBe('hdfc');
    expect(preview.bankProfileName).toBe('HDFC Bank');
    expect(preview.bankProfileConfidence).toBeGreaterThan(0);
  });

  test('detects bank-style PDF amount before closing balance', () => {
    const preview = previewPdfStatement([
      'Txn Date Narration Chq/Ref No Withdrawal Deposit Balance',
      '05/09/2026 UPI/COFFEE SHOP 350.00 9650.00',
      '06/09/2026 NEFT SALARY Credit 45000.00 54650.00',
    ].join('\n'));
    expect(preview.validCount).toBe(2);
    expect(preview.rows[0].amount).toBe(350);
    expect(preview.rows[0].direction).toBe('expense');
    expect(preview.rows[1].amount).toBe(45000);
    expect(preview.rows[1].direction).toBe('income');
  });

  test('supports month-name dates', () => {
    const preview = previewPdfStatement('12 Sep 2026 UPI/XYZ Cafe INR 275.50');
    expect(preview.validCount).toBe(1);
    expect(preview.rows[0].amount).toBe(275.5);
    expect(preview.rows[0].merchant).toContain('XYZ Cafe');
  });

  test('falls back to on-device OCR for scanned PDFs', async () => {
    (getPdfInfo as jest.Mock).mockResolvedValueOnce({ pageCount: 1, isEncrypted: false, pages: [{ width: 595, height: 842 }] });
    (convertPages as jest.Mock).mockResolvedValueOnce([{ uri: 'file:///cache/statement-page.jpg', page: 0, width: 1600, height: 2200, format: 'jpeg' }]);
    (recognizeText as jest.Mock).mockResolvedValueOnce({ text: '05/09/2026 UPI/COFFEE SHOP 350.00 9650.00' });
    const preview = await extractPdfStatementPreviewWithOcr('file:///statement.pdf');
    expect(getPdfInfo).toHaveBeenCalledWith('file:///statement.pdf');
    expect(convertPages).toHaveBeenCalledWith('file:///statement.pdf', 0, 0, expect.objectContaining({ format: 'jpeg' }));
    expect(recognizeText).toHaveBeenCalledWith('file:///cache/statement-page.jpg');
    expect(preview.validCount).toBe(1);
    expect(preview.rows[0].amount).toBe(350);
  });
  test('reports scanned/image-only PDFs as unsupported', () => {
    const preview = previewPdfStatement('This PDF contains only an image of the statement.');
    expect(preview.validCount).toBe(0);
    expect(preview.errorCount).toBe(1);
    expect(preview.rows[0].error).toContain('image-only');
  });

  test('previews existing statement duplicates before import', async () => {
    await createPaymentImport({
      provider: 'other',
      rawText: 'Paid INR 350 to ABC Store on 01/09/2026',
      amount: 350,
      merchant: 'ABC Store',
      date: '2026-09-01T00:00:00.000Z',
      sourceType: 'statement',
    });

    const preview = previewPdfStatement('01/09/2026 ABC Store INR 350.00');
    const duplicatePreview = await previewStatementDuplicates(preview.rows, 'other');

    expect(duplicatePreview.duplicateCount).toBe(1);
    expect(duplicatePreview.duplicateRows[0].duplicate).toBe(true);
    expect(duplicatePreview.duplicateRows[0].duplicateImportId).toBeTruthy();
  });

  test('uses the native extractor and returns its parsed preview', async () => {
    (extractText as jest.Mock).mockResolvedValueOnce('04/09/2026 UPI/Test Shop 120.00');
    const preview = await extractPdfStatementPreview('file:///statement.pdf');
    expect(extractText).toHaveBeenCalledWith('file:///statement.pdf');
    expect(preview.validCount).toBe(1);
    expect(preview.rows[0].amount).toBe(120);
  });
});






