export type WorkoutStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'active';
export type WeightUnit = 'kg' | 'lb';
export type PRRecordType = 'max_weight' | 'max_reps' | 'max_volume' | 'longest_duration' | 'longest_distance';

export interface WorkoutPR {
  exerciseId: string;
  recordType: PRRecordType;
  value: number;
  sessionId: string;
  sessionDate: string;
  setId: string;
}

export interface WorkoutProgressionPoint {
  sessionId: string;
  date: string;
  sessionName: string;
  bestWeightKg?: number;
  bestReps?: number;
  bestVolume?: number;
  bestDurationSeconds?: number;
  bestDistanceKm?: number;
}

export interface WorkoutPerformanceSnapshot {
  sessionId: string;
  date: string;
  sessionName: string;
  bestWeightKg?: number;
  bestReps?: number;
  bestVolume?: number;
  bestDurationSeconds?: number;
  bestDistanceKm?: number;
  estimatedOneRepMax?: number;
}

export interface WorkoutPerformanceChanges {
  weightChange: number | null;
  repsChange: number | null;
  volumeChange: number | null;
}

export interface WorkoutExerciseProgression {
  exerciseId: string;
  points: WorkoutProgressionPoint[];
  currentPerformance: WorkoutPerformanceSnapshot | null;
  previousPerformance: WorkoutPerformanceSnapshot | null;
  weightChange: number | null;
  repsChange: number | null;
  volumeChange: number | null;
  currentEstimatedOneRepMax: number | null;
  previousEstimatedOneRepMax: number | null;
  estimatedOneRepMaxChange: number | null;
  bestEstimatedOneRepMax: number | null;
}

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  weightKg?: number | null;
  weightUnit: WeightUnit;
  durationSeconds: number | null;
  distance: number | null;
  distanceKm?: number | null;
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
  order?: number;
  setsTarget: number;
  repsTarget: number | null;
  weightTarget: number | null;
  restSeconds: number;
  notes: string | null;
  createdAt: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  exercises: WorkoutExercise[];
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

/** Backwards-compatible builder/history shape retained for existing screens. */
export interface Workout extends Omit<WorkoutSession, 'startedAt' | 'completedAt' | 'status' | 'durationSeconds'> {
  status: WorkoutStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  totalVolume: number;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  recordType: 'max_weight' | 'max_reps' | 'max_volume';
  value: number;
  workoutId: string;
  achievedAt: string;
}

export interface NewWorkoutSetInput {
  reps?: number | null;
  weight?: number | null;
  weightKg?: number | null;
  weightUnit?: WeightUnit;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceKm?: number | null;
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

export interface WorkoutTotals {
  volume: number;
  completedSetCount: number;
  totalSetCount: number;
  exerciseCount: number;
  durationSeconds: number;
}

export interface WorkoutTemplateSet {
  id: string;
  setNumber: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceKm?: number | null;
  restSeconds?: number | null;
}

export interface WorkoutTemplateExercise {
  id: string;
  exerciseId: string;
  order: number;
  sets: WorkoutTemplateSet[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutTemplateExercise[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutTemplateSetInput {
  setNumber?: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceKm?: number | null;
  restSeconds?: number | null;
}

export interface WorkoutTemplateExerciseInput {
  exerciseId: string;
  sets?: WorkoutTemplateSetInput[];
}

export interface CreateWorkoutTemplateInput {
  name: string;
  description?: string;
  exercises?: WorkoutTemplateExerciseInput[];
  isFavorite?: boolean;
}

export interface UpdateWorkoutTemplateInput {
  name?: string;
  description?: string;
  isFavorite?: boolean;
  exercises?: WorkoutTemplateExerciseInput[];
}

export interface WorkoutProgramSchedule {
  id: string;
  dayOfWeek: number;
  templateId: string;
  order: number;
  enabled: boolean;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schedule: WorkoutProgramSchedule[];
}

export interface WorkoutProgramScheduleInput {
  dayOfWeek: number;
  templateId: string;
  order?: number;
  enabled?: boolean;
}

export interface CreateWorkoutProgramInput {
  name: string;
  description?: string;
  schedule?: WorkoutProgramScheduleInput[];
  isActive?: boolean;
}

export interface UpdateWorkoutProgramInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface WorkoutHistoryFilter {
  fromDate?: string;
  toDate?: string;
  exerciseId?: string;
  newestFirst?: boolean;
  limit?: number;
  offset?: number;
}

export interface WorkoutHistorySummary {
  completedWorkoutCount: number;
  totalCompletedSets: number;
  totalExercisesPerformed: number;
  totalWorkoutDurationSeconds: number;
  totalVolume: number;
}

export interface WorkoutHistoryExerciseEntry {
  sessionId: string;
  sessionDate: string;
  sessionName: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceKm: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface WorkoutHistoryResult {
  workouts: WorkoutSession[];
  total: number;
  offset: number;
  limit?: number;
}
