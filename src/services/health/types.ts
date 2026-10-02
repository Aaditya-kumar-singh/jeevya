// Shared types for the provider-independent health integration layer.

import type { ActivityIntensity, ActivityType } from '@/types/nutrition';

export interface RawHealthConnectRecord {
  recordType: 'ExerciseSession';
  metadata?: { id?: string; clientRecordId?: string };
  title?: string;
  exerciseType: number;
  startTime: string;
  endTime: string;
  exerciseRoute?: {
    type?: number;
    route?: Array<{
      time: string;
      latitude: number;
      longitude: number;
      horizontalAccuracy?: { value: number; unit: string };
      verticalAccuracy?: { value: number; unit: string };
      altitude?: { value: number; unit: string };
    }>;
  };
}

export const HC_EXERCISE_TYPE_MAP: Record<number, ActivityType> = {
  2: 'sports',
  4: 'sports',
  5: 'sports',
  8: 'cycling',
  9: 'cycling',
  11: 'sports',
  13: 'other',
  14: 'sports',
  16: 'sports',
  17: 'sports',
  25: 'other',
  36: 'other',
  37: 'other',
  41: 'running',
  56: 'running',
  57: 'running',
  64: 'sports',
  68: 'walking',
  70: 'strength_training',
  74: 'swimming',
  75: 'sports',
  76: 'sports',
  78: 'sports',
  79: 'walking',
  81: 'strength_training',
  83: 'other',
};

export function mapHCIntensity(intensity?: number): ActivityIntensity {
  if (intensity === 1) return 'light';
  if (intensity === 2) return 'moderate';
  if (intensity === 3 || intensity === 5) return 'vigorous';
  return 'moderate';
}

export function mapHCExerciseType(exerciseType: number): ActivityType {
  return HC_EXERCISE_TYPE_MAP[exerciseType] ?? 'other';
}

export const HC_EXERCISE_TYPE_BY_ACTIVITY: Record<ActivityType, number> = {
  walking: 79,
  running: 56,
  cycling: 8,
  swimming: 74,
  strength_training: 70,
  sports: 17,
  other: 0,
};
