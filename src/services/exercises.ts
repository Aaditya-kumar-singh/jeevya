import { supabase } from '@/lib/supabase';
import { exerciseLibrary } from '@/lib/mockData';
import type {
  Exercise,
  ExerciseFilter,
  ExerciseFilterOptions,
  ExercisePage,
} from '@/types/exercise';

export type {
  Exercise,
  ExerciseFilter,
  ExerciseFilterOptions,
  ExercisePage,
} from '@/types/exercise';

export const EXERCISES_PAGE_SIZE = 20;

/** Maps the local 14-exercise demo categories onto the real dataset's body_part values. */
const LOCAL_TO_BODY_PART: Record<string, string> = {
  Chest: 'chest',
  Back: 'back',
  Legs: 'upper legs',
  Shoulders: 'shoulders',
  Arms: 'upper arms',
  Core: 'waist',
  Cardio: 'cardio',
};

const FALLBACK_OPTIONS: ExerciseFilterOptions = {
  bodyParts: [
    'back',
    'cardio',
    'chest',
    'lower arms',
    'lower legs',
    'neck',
    'shoulders',
    'upper arms',
    'upper legs',
    'waist',
  ],
  equipment: [
    'assisted',
    'band',
    'barbell',
    'body weight',
    'cable',
    'dumbbell',
    'kettlebell',
    'leverage machine',
  ],
  targets: [
    'abs',
    'biceps',
    'calves',
    'delts',
    'glutes',
    'lats',
    'pectorals',
    'quads',
    'triceps',
  ],
};

function toExercise(row: { id: string; name: string; category: string }): Exercise {
  const bodyPart = LOCAL_TO_BODY_PART[row.category] ?? row.category;
  return {
    id: row.id,
    name: row.name,
    category: bodyPart,
    body_part: bodyPart,
    equipment: null,
    target: null,
    muscle_group: null,
    secondary_muscles: [],
    instructions: null,
    instruction_steps: null,
    media_id: null,
    image: null,
    gif_url: null,
    created_at: null,
  };
}

function fallbackRows(filter: ExerciseFilter = {}): Exercise[] {
  const q = filter.query?.trim().toLowerCase() ?? '';
  return exerciseLibrary
    .filter((row) => {
      const bodyPart = LOCAL_TO_BODY_PART[row.category] ?? row.category;
      const matchesQuery = q.length === 0 || row.name.toLowerCase().includes(q);
      const matchesBodyPart = !filter.body_part || bodyPart === filter.body_part;
      return matchesQuery && matchesBodyPart;
    })
    .map(toExercise);
}

/**
 * Fetches a page of exercises from Supabase (20 at a time) with optional
 * search + filters. Falls back to the local 14-exercise library when the
 * network / Supabase is unavailable.
 */
export async function getExercises(
  input: { page?: number; pageSize?: number; filter?: ExerciseFilter } = {},
): Promise<ExercisePage> {
  const { page = 0, pageSize = EXERCISES_PAGE_SIZE, filter = {} } = input;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabase
      .from('exercises')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (filter.query?.trim()) {
      query = query.ilike('name', `%${filter.query.trim()}%`);
    }
    if (filter.body_part) {
      query = query.eq('body_part', filter.body_part);
    }
    if (filter.category) {
      query = query.eq('category', filter.category);
    }
    if (filter.equipment) {
      query = query.eq('equipment', filter.equipment);
    }
    if (filter.target) {
      query = query.eq('target', filter.target);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as Exercise[];
    return {
      data: rows,
      count,
      hasMore: rows.length === pageSize && (count ?? 0) > from + rows.length,
      source: 'supabase',
    };
  } catch {
    const rows = fallbackRows(filter);
    const slice = rows.slice(from, from + pageSize);
    return {
      data: slice,
      count: rows.length,
      hasMore: from + slice.length < rows.length,
      source: 'fallback',
    };
  }
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Exercise | null;
  } catch {
    return fallbackRows().find((row) => row.id === id) ?? null;
  }
}

export async function getExercisesByIds(ids: string[]): Promise<Map<string, Exercise>> {
  if (ids.length === 0) return new Map();
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    return new Map((data ?? []).map((row) => [row.id, row as unknown as Exercise]));
  } catch {
    return new Map(
      fallbackRows()
        .filter((row) => ids.includes(row.id))
        .map((row) => [row.id, row]),
    );
  }
}

export async function getExerciseCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('exercises')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  } catch {
    return exerciseLibrary.length;
  }
}

async function distinctValues(column: string): Promise<string[]> {
  const values = new Set<string>();
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from('exercises')
      .select(column)
      .range(start, start + 999);
    if (error) throw error;
    for (const row of data ?? []) {
      const value = (row as unknown as Record<string, unknown>)[column];
      if (typeof value === 'string' && value.length > 0) values.add(value);
    }
    if ((data?.length ?? 0) < 1000) break;
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export async function getExerciseFilterOptions(): Promise<ExerciseFilterOptions> {
  try {
    const [bodyParts, equipment, targets] = await Promise.all([
      distinctValues('body_part'),
      distinctValues('equipment'),
      distinctValues('target'),
    ]);
    return { bodyParts, equipment, targets };
  } catch {
    return FALLBACK_OPTIONS;
  }
}