/**
 * Import the hasaneyldrm/exercises-dataset into Supabase.
 *
 * SERVER-SIDE ONLY. Uses the Supabase service-role key, which must NEVER be
 * bundled into the Expo app, committed to git, or placed in .env.local.
 *
 * Usage:
 *   1. Create a root `.env` file (already gitignored) with:
 *        SUPABASE_URL=https://<project-ref>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
 *   2. Run:
 *        npm run exercises:import
 *
 * The script is idempotent (upserts on `id`), so re-running it after a dataset
 * update re-syncs the full catalog.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Create a root .env file (copy .env.example) and run again:\n' +
      '  npm run exercises:import',
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DATASET_URL =
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';

const BATCH_SIZE = 500;

interface RawExercise {
  id?: unknown;
  name?: unknown;
  category?: unknown;
  body_part?: unknown;
  equipment?: unknown;
  target?: unknown;
  muscle_group?: unknown;
  secondary_muscles?: unknown;
  instructions?: unknown;
  instruction_steps?: unknown;
  media_id?: unknown;
  image?: unknown;
  gif_url?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function transform(raw: RawExercise, index: number) {
  const id = asString(raw.id) ?? `exercise-${index + 1}`;
  return {
    id,
    name: asString(raw.name) ?? 'Unknown exercise',
    category: asString(raw.category),
    body_part: asString(raw.body_part),
    equipment: asString(raw.equipment),
    target: asString(raw.target),
    muscle_group: asString(raw.muscle_group),
    secondary_muscles: Array.isArray(raw.secondary_muscles)
      ? raw.secondary_muscles.filter((m): m is string => typeof m === 'string')
      : [],
    instructions: raw.instructions ?? null,
    instruction_steps: raw.instruction_steps ?? null,
    media_id: asString(raw.media_id),
    image: asString(raw.image),
    gif_url: asString(raw.gif_url),
  };
}

async function downloadDataset(): Promise<RawExercise[]> {
  console.log('Loading exercises...');
  const res = await fetch(DATASET_URL);
  if (!res.ok) {
    throw new Error(`Failed to download dataset: ${res.status} ${res.statusText}`);
  }
  const json: unknown = await res.json();
  if (!Array.isArray(json)) {
    throw new Error('Dataset is not a JSON array');
  }
  console.log(`✓ Dataset loaded\n\nExercises found: ${json.length}\n\nUploading:`);
  return json as RawExercise[];
}

async function verifyCount() {
  console.log('\nVerifying database...');
  const { count, error } = await supabase
    .from('exercises')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('  Verification query error:', error.message);
    return;
  }
  console.log(`✓ Supabase exercises: ${count ?? 0}`);
}

async function main() {
  const raw = await downloadDataset();
  const rows = raw.map((entry, index) => transform(entry, index));

  let imported = 0;
  let failed = 0;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const { error } = await supabase
      .from('exercises')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      failed += batch.length;
      console.error(`\n  ✗ Batch ${start / BATCH_SIZE + 1} failed: ${error.message}`);
    } else {
      imported += batch.length;
    }

    const done = Math.min(start + batch.length, rows.length);
    const pct = Math.round((done / rows.length) * 20);
    process.stdout.write(
      `\r[${'█'.repeat(pct)}${' '.repeat(20 - pct)}] ${done} / ${rows.length}`,
    );
  }

  console.log('\n');
  console.log(`✓ Imported: ${imported}`);
  console.log(`✓ Failed: ${failed}`);
  await verifyCount();

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('\nImport failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});