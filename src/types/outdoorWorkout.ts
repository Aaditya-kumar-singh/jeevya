import type { ActivityType } from '@/types/nutrition';

export interface GpsPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speedMps?: number | null;
  heading?: number | null;
}

export type OutdoorWorkoutStatus = 'active' | 'completed' | 'cancelled';

export interface OutdoorWorkout {
  id: string;
  activityType: ActivityType;
  name: string;
  startedAt: string;
  endedAt?: string;
  status: OutdoorWorkoutStatus;
  durationSeconds: number;
  distanceKm: number;
  averageSpeedKmh: number;
  calories?: number;
  route: GpsPoint[];
  backgroundTracking: boolean;
  healthConnectStatus: 'pending' | 'synced' | 'skipped' | 'error';
  healthConnectRecordIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StartOutdoorWorkoutInput {
  activityType: ActivityType;
  name?: string;
}
