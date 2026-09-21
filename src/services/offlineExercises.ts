import { Directory, File, Paths } from 'expo-file-system';
import { loadData, saveData, removeData } from '@/lib/storage';
import type { Exercise } from '@/types/exercise';

const EXERCISE_JSON_KEY = 'jeevya:offline-exercises:';
const COMPLETED_KEY = 'jeevya:exercise-completed:';

const OFFLINE_EXERCISE_DIR = new Directory(Paths.document, 'jeevya', 'exercises');

function exerciseDir(id: string): Directory {
  const dir = new Directory(OFFLINE_EXERCISE_DIR, id);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function offlineExerciseKey(id: string): string {
  return EXERCISE_JSON_KEY + id;
}

function completedKey(id: string): string {
  return COMPLETED_KEY + id;
}

export type OfflineExerciseAsset = {
  exercise: Omit<Exercise, 'instructions' | 'instruction_steps'> & {
    instructions: string | null;
    instruction_steps: string[] | null;
  };
  mediaLocalUri: string | null;
  downloadedAt: string;
};

export async function saveExerciseOffline(
  exercise: Exercise,
  mediaLocalUri?: string | null,
): Promise<OfflineExerciseAsset> {
  const dir = exerciseDir(exercise.id);
  const json: OfflineExerciseAsset = {
    exercise: {
      ...exercise,
      instructions:
        typeof exercise.instructions === 'object' && exercise.instructions
          ? Object.values(exercise.instructions)[0] ?? null
          : null,
      instruction_steps:
        typeof exercise.instruction_steps === 'object' && exercise.instruction_steps
          ? Object.values(exercise.instruction_steps)[0] ?? []
          : [],
    },
    mediaLocalUri: mediaLocalUri ?? exercise.image ?? null,
    downloadedAt: new Date().toISOString(),
  };

  await saveData(offlineExerciseKey(exercise.id), json);
  
  const jsonFile = new File(dir, 'exercise.json');
  jsonFile.write(JSON.stringify(json, null, 2));

  if (typeof mediaLocalUri === 'string' && mediaLocalUri.length > 0) {
    const mediaName = mediaLocalUri.split('/').pop() ?? `media.${Math.random().toString(36).slice(2)}`;
    const mediaDest = new File(dir, mediaName);
    const sourceFile = new File(mediaLocalUri);
    
    // Prevent copying the file onto itself if it was already downloaded to the exact destination
    if (sourceFile.uri !== mediaDest.uri) {
      if (sourceFile.exists) {
        sourceFile.copy(mediaDest);
      }
    }
    
    json.mediaLocalUri = mediaDest.uri.startsWith('file://') ? mediaDest.uri : 'file://' + mediaDest.uri;
  }

  return json;
}

export async function getOfflineExercise(
  id: string,
): Promise<OfflineExerciseAsset | null> {
  const json = await loadData<OfflineExerciseAsset | null>(offlineExerciseKey(id), null);
  if (!json) return null;

  const file = new File(OFFLINE_EXERCISE_DIR, id, 'exercise.json');
  try {
    if (file.exists) {
      const persisted = file.textSync();
      const parsed = JSON.parse(persisted) as OfflineExerciseAsset;
      if (parsed && parsed.exercise && typeof parsed.exercise.id === 'string') {
        if (typeof json.mediaLocalUri === 'string') {
          parsed.mediaLocalUri = json.mediaLocalUri;
        }
        return parsed;
      }
    }
  } catch {
    // ignore file read errors
  }

  return json;
}

export async function getOfflineExercises(): Promise<OfflineExerciseAsset[]> {
  try {
    if (!OFFLINE_EXERCISE_DIR.exists) return [];
    
    const entries = OFFLINE_EXERCISE_DIR.list();
    const ids = entries
      .filter((entry) => entry instanceof Directory)
      .map((dir) => dir.name)
      .filter((id) => id.length > 0);

    const out: OfflineExerciseAsset[] = [];
    for (const id of ids) {
      const asset = await getOfflineExercise(id);
      if (asset) out.push(asset);
    }
    return out;
  } catch {
    return [];
  }
}

export async function isExerciseDownloaded(id: string): Promise<boolean> {
  const key = offlineExerciseKey(id);
  const json = await loadData<OfflineExerciseAsset | null>(key, null);
  if (json) return true;

  const file = new File(OFFLINE_EXERCISE_DIR, id, 'exercise.json');
  return file.exists;
}

export async function removeExerciseOffline(id: string): Promise<void> {
  await saveData(offlineExerciseKey(id), null);
  const dir = new Directory(OFFLINE_EXERCISE_DIR, id);
  try {
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // ignore
  }
}

export async function markExerciseDone(id: string): Promise<void> {
  await saveData(completedKey(id), true);
}

export async function unmarkExerciseDone(id: string): Promise<void> {
  await removeData(completedKey(id));
}

export async function isExerciseDone(id: string): Promise<boolean> {
  const value = await loadData<boolean | null>(completedKey(id), null);
  return value === true;
}
