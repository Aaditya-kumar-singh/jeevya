export type WorkoutStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type WeightUnit = 'kg' | 'lb';
export type PRRecordType = 'max_weight' | 'max_reps' | 'max_volume';

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  weightUnit: WeightUnit;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: string | null;
  rpe: number | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  position: number;
  setsTarget: number;
  repsTarget: number | null;
  weightTarget: number | null;
  restSeconds: number;
  notes: string | null;
  createdAt: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  status: WorkoutStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  totalVolume: number;
  createdAt: string;
  updatedAt: string;
  exercises: WorkoutExercise[];
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  recordType: PRRecordType;
  value: number;
  workoutId: string;
  achievedAt: string;
}

export interface NewWorkoutSetInput {
  reps?: number | null;
  weight?: number | null;
  weightUnit?: WeightUnit;
  durationSeconds?: number | null;
  distance?: number | null;
  rpe?: number | null;
  completed?: boolean;
}

export interface WorkoutExerciseConfig {
  exerciseId: string;
  setsTarget: number;
  repsTarget: number | null;
  weightTarget: number | null;
  restSeconds: number;
  notes?: string | null;
}

export interface CompletedSetView {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  weightUnit: WeightUnit;
}

export interface WorkoutFinishResult {
  workout: Workout;
  newPersonalRecords: PersonalRecord[];
}