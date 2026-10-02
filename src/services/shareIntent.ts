import * as FileSystem from 'expo-file-system/legacy';

const SHARE_FILE = 'jeevya-share-intent.json';

export interface JeevyaShareIntent {
  receivedAt: number;
  mimeType: string;
  subject?: string;
  text?: string;
  uri?: string;
}

export async function consumeShareIntent(): Promise<JeevyaShareIntent | null> {
  if (!FileSystem.documentDirectory) return null;
  const uri = FileSystem.documentDirectory + SHARE_FILE;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(uri);
    await FileSystem.deleteAsync(uri, { idempotent: true });
    const parsed = JSON.parse(content) as JeevyaShareIntent;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
