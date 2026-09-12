export interface Exercise {
  id: string;
  name: string;
  category: string | null;
  body_part: string | null;
  equipment: string | null;
  target: string | null;
  muscle_group: string | null;
  secondary_muscles: string[];
  instructions: Record<string, string> | null;
  instruction_steps: Record<string, string[]> | null;
  media_id: string | null;
  image: string | null;
  gif_url: string | null;
  created_at: string | null;
}

export interface ExerciseFilter {
  query?: string | null;
  body_part?: string | null;
  category?: string | null;
  equipment?: string | null;
  target?: string | null;
}

export interface ExercisePage {
  data: Exercise[];
  count: number | null;
  hasMore: boolean;
  source: 'supabase' | 'fallback';
}

export interface ExerciseFilterOptions {
  bodyParts: string[];
  equipment: string[];
  targets: string[];
}