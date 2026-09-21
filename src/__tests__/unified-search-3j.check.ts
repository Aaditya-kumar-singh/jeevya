import { todayCivilDate } from '@/lib/date';

(async () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value); },
    removeItem: (key: string) => { memory.delete(key); },
    clear: () => memory.clear(), get length() { return memory.size; }, key: (index: number) => Array.from(memory.keys())[index] ?? null,
  } } });
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  const { saveData } = await import('@/lib/storage');
  const { searchJeevya } = await import('@/services/unifiedSearch');
  const date = todayCivilDate();
  const task = { id:'search-task', title:'Finish Jeevya', description:'cross module search', completed:false, priority:'high', dueDate:date, dueTime:null, createdAt:`${date}T08:00:00.000Z`, updatedAt:`${date}T08:00:00.000Z`, completedAt:null, archived:false, recurrence:null, seriesId:null, subtasks:[], labelIds:[] };
  const book = { id:'search-book', title:'Jeevya Architecture', author:'Test', description:'', coverUrl:'', isbn:'', status:'reading', rating:null, totalPages:100, currentPage:20, category:'', notes:'', startedAt:null, completedAt:null, createdAt:`${date}T08:00:00.000Z`, updatedAt:`${date}T08:00:00.000Z` };
  let passed = 0;
  const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
  await AsyncStorage.clear();
  await saveData('jeevya:tasks', [task]);
  await saveData('jeevya:books', [book]);
  const empty = await searchJeevya(''); assert(empty.results.length === 0, 'empty query should return no results'); passed++; console.log('PASS empty query');
  const taskResult = await searchJeevya('Finish Jeevya'); assert(taskResult.results.some((r) => r.domain === 'tasks' && r.id === task.id && r.route === `/tasks/${task.id}`), 'task search failed'); passed++; console.log('PASS task search');
  const bookResult = await searchJeevya('architecture'); assert(bookResult.results.some((r) => r.domain === 'books' && r.id === book.id), 'book search failed'); passed++; console.log('PASS book search');
  const deterministicA = await searchJeevya('jeevya'); const deterministicB = await searchJeevya('jeevya'); assert(JSON.stringify(deterministicA) === JSON.stringify(deterministicB), 'search is not deterministic'); passed++; console.log('PASS deterministic results');
  assert(taskResult.results.length <= 50, 'result limit missing'); passed++; console.log('PASS bounded results');
  console.log(`JEEVYA 3J UNIFIED SEARCH: ${passed} passed, 0 failed`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
