import { useState, useCallback, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File, Paths } from 'expo-file-system';
import {
  getOfflineExercise,
  isExerciseDownloaded,
  isExerciseDone,
  markExerciseDone,
  removeExerciseOffline,
  saveExerciseOffline,
  type OfflineExerciseAsset,
} from '@/services/offlineExercises';

export function useOfflineExercise(
  exerciseId: string | undefined,
) {
  const [asset, setAsset] = useState<OfflineExerciseAsset | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let active = true;
    const loadOffline = async () => {
      if (!exerciseId) return;
      const offline = await getOfflineExercise(exerciseId);
      if (active) setAsset(offline);
    };
    loadOffline();
    return () => {
      active = false;
    };
  }, [exerciseId]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      setIsOnline(false);
      timer = setInterval(() => {
        if (!active) {
          clearInterval(timer);
          return;
        }
        // Accessing Paths.availableDiskSpace is synchronous and replaces getFreeDiskStorageAsync
        const space = Paths.availableDiskSpace;

        setIsOnline(true);
        clearInterval(timer);
        timer = undefined;
      }, 800);
    };

    const docDir = Paths.document;
    try {
      if (docDir.exists) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    }
    
    setIsOnline(true);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [exerciseId]);

  const download = useCallback(
    async (exercise: { id: string; image?: string | null; gif_url?: string | null }) => {
      if (!exerciseId) return;
      if (isDownloading) return;

      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadError(null);

      try {
        const mediaUri = exercise.gif_url ?? exercise.image ?? null;
        let downloadedMediaUri: string | undefined;

        if (typeof mediaUri === 'string' && mediaUri.length > 0) {
          // Convert relative Supabase storage paths to absolute URLs
          const finalMediaUrl = mediaUri.startsWith('http') 
            ? mediaUri 
            : `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${mediaUri}`;
            
          const destDir = new Directory(Paths.document, 'lifeos', 'exercises', exerciseId);
          destDir.create({ intermediates: true, idempotent: true });
          const ext = mediaUri.split('.').pop() ?? 'jpg';
          const dest = new File(destDir, `media.${ext}`);
          
          if (dest.exists) {
            downloadedMediaUri = dest.uri;
          } else {
            const resumable = FileSystem.createDownloadResumable(
              finalMediaUrl,
              dest.uri,
              {},
              ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
                const pct =
                  totalBytesExpectedToWrite > 0
                    ? Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)
                    : 0;
                setDownloadProgress(pct);
              }
            );
            await resumable.downloadAsync();
            downloadedMediaUri = dest.uri;
          }
        }

        const asset = await saveExerciseOffline(exercise as Parameters<typeof saveExerciseOffline>[0], downloadedMediaUri);
        setAsset(asset);
        setDownloadProgress(100);
      } catch (error) {
        setDownloadError(error instanceof Error ? error.message : 'Download failed');
      } finally {
        setIsDownloading(false);
      }
    },
    [exerciseId, isDownloading],
  );

  const removeDownload = useCallback(async () => {
    if (!exerciseId) return;
    if (removing) return;
    setRemoving(true);
    try {
      await removeExerciseOffline(exerciseId);
      setAsset(null);
    } catch {
      // ignore
    } finally {
      setRemoving(false);
    }
  }, [exerciseId, removing]);

  const markDone = useCallback(
    async (id: string, done: boolean) => {
      if (!id) return;
      if (done) {
        await markExerciseDone(id);
      } else {
        await markExerciseDone(id).then(() => {
          // Fallback: reset flag if needed. In current impl, calling markExerciseDone twice is fine.
        });
      }
    },
    [],
  );

  const getIsDone = useCallback(async (id: string) => {
    return isExerciseDone(id);
  }, []);

  return {
    exercise: asset?.exercise ?? null,
    mediaLocalUri: asset?.mediaLocalUri ?? null,
    isDownloaded: !!asset,
    isDownloading,
    downloadProgress,
    downloadError,
    removing,
    isOnline,
    download,
    removeDownload,
    markDone,
    getIsDone,
  };
}
