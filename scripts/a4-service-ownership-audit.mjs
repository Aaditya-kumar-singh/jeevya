import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const appRoot = path.join(root, 'app');
const serviceRoot = path.join(root, 'services');

function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const screens = sourceFiles(appRoot);
const services = sourceFiles(serviceRoot);
let checks = 0;
let failures = 0;
function assert(ok, message) {
  checks += 1;
  if (!ok) { failures += 1; console.error(`FAIL ${message}`); }
}

for (const file of screens) {
  const text = fs.readFileSync(file, 'utf8');
  assert(!/@react-native-async-storage\/async-storage/.test(text), `screen imports AsyncStorage: ${file}`);
  assert(!/@\/lib\/storage/.test(text), `screen imports persistence helper: ${file}`);
  assert(!/\b(?:loadData|saveData|removeData)\s*\(/.test(text), `screen calls persistence helper: ${file}`);
  assert(!/['"`]lifeos:[^'"`]+['"`]/.test(text), `screen embeds storage key: ${file}`);
}

const ownership = [
  ['tasks.ts','TASKS_KEY'], ['books.ts','BOOKS_KEY'], ['book-goals.ts','GOALS_KEY'],
  ['book-progress.ts','PROGRESS_KEY'], ['habits.ts','HABITS_KEY'], ['habits.ts','HABIT_LOGS_KEY'],
  ['journal.ts','JOURNAL_KEY'], ['labels.ts','LABELS_KEY'], ['finance.ts','ACCOUNTS_KEY'],
  ['finance.ts','TRANSACTIONS_KEY'], ['finance.ts','CATEGORIES_KEY'], ['finance.ts','BUDGETS_KEY'],
  ['finance.ts','SAVINGS_GOALS_KEY'], ['nutrition.ts','FOODS_KEY'], ['nutrition.ts','FOOD_LOGS_KEY'],
  ['nutrition.ts','RECIPES_KEY'], ['nutrition.ts','BODY_PROFILE_KEY'], ['nutrition.ts','ENERGY_ACTIVITIES_KEY'],
  ['workouts.ts','WORKOUTS_KEY'], ['workoutTemplates.ts','WORKOUT_TEMPLATES_KEY'],
  ['workoutTemplates.ts','WORKOUT_PROGRAMS_KEY'], ['sleep.ts','SLEEP_KEY'],
];
for (const [fileName, key] of ownership) {
  const file = services.find((f) => path.basename(f) === fileName);
  assert(Boolean(file), `missing owner service ${fileName}`);
  const text = file ? fs.readFileSync(file, 'utf8') : '';
  assert(new RegExp(`(?:export )?const\\s+${key}\\s*=`).test(text), `${key} not declared by ${fileName}`);
  assert(new RegExp(`saveData\\(${key}`).test(text), `${key} has no writer in ${fileName}`);
}

const hookScreens = [
  'health/workout-builder.tsx', 'health/workout-session/[id].tsx',
  'health/workout-templates.tsx', 'health/workout-template-editor.tsx',
  'health/workout-programs.tsx', 'health/workout-program-editor.tsx',
];
for (const relative of hookScreens) {
  const file = path.join(appRoot, relative);
  const text = fs.readFileSync(file, 'utf8');
  assert(/@\/hooks\//.test(text), `missing hook import ${relative}`);
  assert(!/@\/services\/workouts['"]/.test(text), `direct workout service bypass ${relative}`);
  assert(!/@\/services\/workoutTemplates['"]/.test(text), `direct template/program service bypass ${relative}`);
}

console.log(`A4 ownership audit: ${checks} checks, ${failures} failures`);
process.exitCode = failures ? 1 : 0;
