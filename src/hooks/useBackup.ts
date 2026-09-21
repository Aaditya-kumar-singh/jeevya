import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportBackup, restoreBackup, serializeBackup, validateBackup } from '@/services/backup';
import type { BackupValidationResult, JeevyaBackup } from '@/types/backup';

export function useBackup() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastValidation, setLastValidation] = useState<BackupValidationResult | null>(null);

  const exportUserBackup = useCallback(async (): Promise<JeevyaBackup | null> => {
    setBusy(true); setMessage(null); setError(null);
    try {
      const backup = await exportBackup();
      const filename = `jeevya-backup-${backup.createdAt.slice(0, 10)}.json`;
      const uri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}${filename}`;
      await FileSystem.writeAsStringAsync(uri, serializeBackup(backup));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export Jeevya Backup' });
        setMessage('Backup exported successfully.');
      } else {
        setMessage(`Backup exported to ${uri}`);
      }
      return backup;
    } catch {
      setError('Backup export failed. Your existing data was not changed.');
      return null;
    } finally { setBusy(false); }
  }, []);

  const importUserBackup = useCallback(async (): Promise<boolean> => {
    setBusy(true); setMessage(null); setError(null); setLastValidation(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true, multiple: false });
      if (picked.canceled) return false;
      const asset = picked.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri);
      const validation = validateBackup(content);
      setLastValidation(validation);
      if (!validation.valid || !validation.backup) {
        setError('Backup validation failed. Existing data was preserved.');
        return false;
      }
      const result = await restoreBackup(validation.backup);
      if (!result.success) { setError(result.message); return false; }
      setMessage('Restore completed. Jeevya will reload from the restored source data.');
      return true;
    } catch {
      setError('Restore failed. Existing data was preserved.');
      return false;
    } finally { setBusy(false); }
  }, []);

  return { busy, message, error, lastValidation, exportUserBackup, importUserBackup };
}
