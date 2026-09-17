export const dailyPulse = {
  lifeScore: 72,
  scoreChange: 8,
  completedTasks: 6,
  totalTasks: 8,
};

export const healthSnapshot = {
  sleep: '7h 32m',
  water: '5 / 8',
  workout: 'Not started',
};

export const todayTasks = [
  { id: '1', title: 'Morning workout', completed: true },
  { id: '2', title: 'Read 20 pages', completed: true },
  { id: '3', title: 'Finish project', completed: false },
  { id: '4', title: 'Journal', completed: false },
];

export const financeSnapshot = {
  spent: 24580,
  budgetRemaining: 3420,
};

export type ExerciseCategory =
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Cardio';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  sets: number;
  reps: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export const exerciseLibrary: Exercise[] = [
  { id: 'e1', name: 'Push-ups', category: 'Chest', sets: 3, reps: '12-15', difficulty: 'Beginner' },
  { id: 'e2', name: 'Bench Press', category: 'Chest', sets: 4, reps: '8-10', difficulty: 'Intermediate' },
  { id: 'e3', name: 'Pull-ups', category: 'Back', sets: 3, reps: '6-10', difficulty: 'Intermediate' },
  { id: 'e4', name: 'Bent-over Row', category: 'Back', sets: 4, reps: '10-12', difficulty: 'Intermediate' },
  { id: 'e5', name: 'Squats', category: 'Legs', sets: 4, reps: '12-15', difficulty: 'Beginner' },
  { id: 'e6', name: 'Romanian Deadlift', category: 'Legs', sets: 3, reps: '10-12', difficulty: 'Advanced' },
  { id: 'e7', name: 'Overhead Press', category: 'Shoulders', sets: 3, reps: '10-12', difficulty: 'Intermediate' },
  { id: 'e8', name: 'Lateral Raises', category: 'Shoulders', sets: 3, reps: '12-15', difficulty: 'Beginner' },
  { id: 'e9', name: 'Bicep Curls', category: 'Arms', sets: 3, reps: '12', difficulty: 'Beginner' },
  { id: 'e10', name: 'Tricep Dips', category: 'Arms', sets: 3, reps: '10-12', difficulty: 'Beginner' },
  { id: 'e11', name: 'Plank', category: 'Core', sets: 3, reps: '60s', difficulty: 'Beginner' },
  { id: 'e12', name: 'Hanging Leg Raises', category: 'Core', sets: 3, reps: '12-15', difficulty: 'Advanced' },
  { id: 'e13', name: 'Running', category: 'Cardio', sets: 1, reps: '20 min', difficulty: 'Beginner' },
  { id: 'e14', name: 'Jump Rope', category: 'Cardio', sets: 5, reps: '2 min', difficulty: 'Intermediate' },
];

export const exerciseCategories: ('All' | ExerciseCategory)[] = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Cardio',
];

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  done: boolean;
}

export const todaysWorkout = {
  title: 'Full-body Strength A',
  durationMin: 45,
  exerciseIds: ['e1', 'e5', 'e3', 'e7', 'e11'],
};

export const waterGoal = {
  drunkMl: 1250,
  goalMl: 2000,
  glassMl: 250,
};

export const sleepHistory = [
  { day: 'Mon', hours: 6.5 },
  { day: 'Tue', hours: 7.1 },
  { day: 'Wed', hours: 7.5 },
  { day: 'Thu', hours: 6.8 },
  { day: 'Fri', hours: 7.6 },
  { day: 'Sat', hours: 8.1 },
  { day: 'Sun', hours: 7.5 },
];

export const sleepTonight = {
  lastNight: '7h 32m',
  bedtime: '11:15 PM',
  wakeup: '6:47 AM',
  quality: 82,
};

export const nutritionToday = {
  caloriesEaten: 1640,
  calorieGoal: 2200,
  protein: 110,
  proteinGoal: 140,
  waterPercent: 62,
  meals: [
    { id: 'm1', name: 'Oatmeal + banana', calories: 420 },
    { id: 'm2', name: 'Chicken rice bowl', calories: 680 },
    { id: 'm3', name: 'Greek yogurt + nuts', calories: 340 },
    { id: 'm4', name: 'Evening snack', calories: 200 },
  ],
};

export const healthScoreBreakdown = {
  score: 74,
  sleep: 80,
  activity: 65,
  water: 62,
  nutrition: 75,
};

export interface LifeTask {
  id: string;
  title: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  area: 'Health' | 'Work' | 'Growth' | 'Personal';
  due: string;
}

export const detailedTasks: LifeTask[] = [
  { id: '1', title: 'Morning workout', completed: true, priority: 'High', area: 'Health', due: 'Today · 7:00 AM' },
  { id: '2', title: 'Read 20 pages', completed: true, priority: 'Medium', area: 'Growth', due: 'Today · 9:00 PM' },
  { id: '3', title: 'Finish project milestone', completed: false, priority: 'High', area: 'Work', due: 'Today · 5:00 PM' },
  { id: '4', title: 'Journal reflection', completed: false, priority: 'Low', area: 'Personal', due: 'Today · 10:00 PM' },
  { id: '5', title: 'Plan tomorrow', completed: false, priority: 'Medium', area: 'Work', due: 'Tomorrow · 8:00 AM' },
  { id: '6', title: 'Evening walk', completed: false, priority: 'Low', area: 'Health', due: 'Today · 6:30 PM' },
];

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
}


export const seedTasks: Task[] = detailedTasks.map((t) => ({
  id: t.id,
  title: t.title,
  completed: t.completed,
  priority: t.priority.toLowerCase() as TaskPriority,
  dueDate: t.due,
  createdAt: new Date().toISOString(),
}));

export type TaskFilter = 'All' | 'Today' | 'Done';

export interface Transaction {
  id: string;
  label: string;
  category: 'Food' | 'Transport' | 'Shopping' | 'Bills' | 'Income';
  amount: number;
  date: string;
  kind: 'expense' | 'income';
}

export const transactions: Transaction[] = [
  { id: 't1', label: 'Groceries', category: 'Food', amount: 2450, date: 'Today', kind: 'expense' },
  { id: 't2', label: 'Metro card', category: 'Transport', amount: 800, date: 'Today', kind: 'expense' },
  { id: 't3', label: 'Salary', category: 'Income', amount: 85000, date: 'Sep 1', kind: 'income' },
  { id: 't4', label: 'Electricity bill', category: 'Bills', amount: 1830, date: 'Yesterday', kind: 'expense' },
  { id: 't5', label: 'Bookstore', category: 'Shopping', amount: 1200, date: 'Yesterday', kind: 'expense' },
  { id: 't6', label: 'Freelance payout', category: 'Income', amount: 12000, date: 'Sep 8', kind: 'income' },
];

export interface BudgetCategory {
  id: string;
  name: string;
  spent: number;
  limit: number;
}

export const budgetCategories: BudgetCategory[] = [
  { id: 'b1', name: 'Food', spent: 8200, limit: 10000 },
  { id: 'b2', name: 'Transport', spent: 2300, limit: 4000 },
  { id: 'b3', name: 'Shopping', spent: 5100, limit: 6000 },
  { id: 'b4', name: 'Bills', spent: 6980, limit: 8000 },
];

export interface SavingsGoal {
  id: string;
  name: string;
  saved: number;
  target: number;
}

export const savingsGoals: SavingsGoal[] = [
  { id: 'g1', name: 'Emergency fund', saved: 42000, target: 100000 },
  { id: 'g2', name: 'New laptop', saved: 18500, target: 65000 },
  { id: 'g3', name: 'Trip', saved: 9000, target: 30000 },
];

export interface Book {
  id: string;
  title: string;
  author: string;
  progress: number;
  status: 'Reading' | 'Finished' | 'Wishlist';
}

export const books: Book[] = [
  { id: 'atomic-habits', title: 'Atomic Habits', author: 'James Clear', progress: 68, status: 'Reading' },
  { id: 'deep-work', title: 'Deep Work', author: 'Cal Newport', progress: 34, status: 'Reading' },
  { id: 'alchemist', title: 'The Alchemist', author: 'Paulo Coelho', progress: 100, status: 'Finished' },
  { id: 'psychology-of-money', title: 'The Psychology of Money', author: 'Morgan Housel', progress: 0, status: 'Wishlist' },
];

export interface JournalEntry {
  id: string;
  title: string;
  preview: string;
  date: string;
  mood: 'Great' | 'Good' | 'Okay' | 'Low';
}

export const journalEntries: JournalEntry[] = [
  { id: 'j1', title: 'Strong morning routine', preview: 'Workout done, inbox cleared, focused deep work for 2 hours.', date: 'Today', mood: 'Great' },
  { id: 'j2', title: 'Slow but steady', preview: 'Skipped evening reading, but kept calories on track.', date: 'Yesterday', mood: 'Okay' },
  { id: 'j3', title: 'Weekly review', preview: 'Health score up 4 points. Finance overspent on food.', date: 'Sep 7', mood: 'Good' },
];

export const settingsSections = [
  { id: 'profile', title: 'Profile', subtitle: 'Name, goals, reminders' },
  { id: 'appearance', title: 'Appearance', subtitle: 'Light / dark theme' },
  { id: 'notifications', title: 'Notifications', subtitle: 'Habits, tasks, budget alerts' },
  { id: 'data', title: 'Data', subtitle: 'Export, reset demo data' },
];

