// ─── Health Provider Types (Phase 1J) ────────────────────────────────────────
// Shared types for the provider-independent health integration layer.

import type { ActivityIntensity, ActivityType } from '@/types/nutrition';

/** Raw exercise record shape returned by Health Connect SDK. */
export interface RawHealthConnectRecord {
  recordType: 'ExerciseSession';
  metadata: { id: string };
  title?: string;
  exerciseType: number;
  startTime: string; // ISO
  endTime: string; // ISO
  duration: number; // millis
  energy?: { energy: number; unit: 'kcal' };
  distance?: { distance: number; unit: 'm' };
  /** HC intensity: 0=unknown, 1=light, 2=moderate, 3=vigorous, 5=extra vigorous */
  intensity?: number;
}

/** Map from HC exerciseType number to LifeOS ActivityType. */
export const HC_EXERCISE_TYPE_MAP: Record<number, ActivityType> = {
  1: 'other',           // Aerobics
  2: 'other',           // Badminton
  3: 'cycling',         // Baseball
  4: 'cycling',         // Basketball
  5: 'cycling',         // Beach volleyball
  6: 'cycling',         // Bench press
  7: 'cycling',         // Boxing
  8: 'cycling',         // Calisthenics
  9: 'cycling',         // Cricket
  10: 'cycling',        // Crossfit
  11: 'cycling',        // Cycling (stationary)
  12: 'cycling',        // Cycling (outdoor)
  13: 'other',          // Dancing
  14: 'other',          // Elliptical
  15: 'other',          // Fencing
  16: 'other',          // Football (American)
  17: 'sports',         // Football (Soccer)
  18: 'other',          // Frisbee
  19: 'other',          // Golf
  20: 'other',          // Gymnastics
  21: 'other',          // Handball
  22: 'other',          // HIIT
  23: 'other',          // Hockey
  24: 'other',          // Ice skating
  25: 'other',          // Jump rope
  26: 'other',          // Kayaking
  27: 'other',          // Kettlebell training
  28: 'other',          // Kickboxing
  29: 'other',          // Lacrosse
  30: 'other',          // Martial arts
  31: 'other',          // Meditation
  32: 'other',          // Paddleboarding
  33: 'other',          // Paragliding
  34: 'other',          // Pilates
  35: 'other',          // Racquetball
  36: 'other',          // Rock climbing
  37: 'running',        // Rowing
  38: 'other',          // Rowing machine
  39: 'other',          // Rugby
  40: 'running',        // Running (treadmill)
  41: 'running',        // Running (outdoor)
  42: 'other',          // Sailing
  43: 'other',          // Skating
  44: 'other',          // Skiing
  45: 'other',          // Snowboarding
  46: 'other',          // Soccer
  47: 'strength_training', // Softball
  48: 'strength_training', // Squash
  49: 'strength_training', // Stair climbing
  50: 'strength_training', // Strength training
  51: 'other',          // Table tennis
  52: 'other',          // Tennis
  53: 'other',          // Upper weight training
  54: 'other',          // Volleyball
  55: 'walking',        // Walking
  56: 'swimming',       // Water polo
  57: 'strength_training', // Weightlifting
  58: 'other',          // Wheelchair
  59: 'other',          // Yoga
  60: 'other',          // Zumba
  61: 'other',          // Cross-country skiing
  62: 'other',          // Downhill skiing
  63: 'other',          // Snowshoeing
  64: 'other',          // Skating (indoor)
  65: 'other',          // Skating (outdoor)
  66: 'other',          // Sledding
  67: 'other',          // Snowmobiling
  68: 'other',          // Snowboarding
  69: 'other',          // Snow tubing
  70: 'other',          // Ice hockey
  71: 'other',          // Ice skating (speed)
  100: 'swimming',      // Swimming (lap)
  101: 'swimming',      // Swimming (open water)
  102: 'other',         // Wheelchair basketball
  103: 'other',         // Wheelchair fencing
  104: 'other',         // Wheelchair rugby
  105: 'other',         // Wheelchair tennis
};

/** Map from HC intensity number to LifeOS ActivityIntensity. */
export function mapHCIntensity(intensity?: number): ActivityIntensity {
  if (intensity === 1) return 'light';
  if (intensity === 2) return 'moderate';
  if (intensity === 3 || intensity === 5) return 'vigorous';
  return 'moderate'; // safe default
}

/** Map from HC exerciseType number to LifeOS ActivityType. */
export function mapHCExerciseType(exerciseType: number): ActivityType {
  return HC_EXERCISE_TYPE_MAP[exerciseType] ?? 'other';
}
