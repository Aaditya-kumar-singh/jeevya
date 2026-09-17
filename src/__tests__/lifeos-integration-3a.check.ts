// LifeOS 3A: cross-module integration foundation tests.
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

(async () => {
  const memory = new Map<string, string>();
  if (!(globalThis as unknown as { window?: { localStorage?: unknown } }).window?.localStorage) {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
      clear: () => { memory.clear(); },
      get length() { return memory.size; },
      key: (index: number) => Array.from(memory.keys())[index] ?? null,
    } } });
  }
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  const { loadData, saveData } = await import('@/lib/storage');
  const { todayCivilDate } = await import('@/lib/date');
  const { getLifeOSDailyState } = await import('@/services/lifeosIntegration');
  const date = todayCivilDate();
  const keys = ['lifeos:tasks','lifeos:tasks:migration:v1','lifeos:habits','lifeos:habit-logs','lifeos:workouts:sessions','lifeos:health:sleep','lifeos:nutrition:foods','lifeos:nutrition:food-logs','lifeos:nutrition:recipes','lifeos:nutrition:body-profile','lifeos:nutrition:energy-activities','lifeos:finance:accounts','lifeos:finance:transactions','lifeos:books','lifeos:book-goals','lifeos:journal'];
  const task = { id:'task-3a', title:'3A task', description:'', completed:false, priority:'high', dueDate:date, dueTime:null, createdAt:`${date}T08:00:00.000Z`, updatedAt:`${date}T08:00:00.000Z`, completedAt:null, archived:false, recurrence:null, seriesId:null, subtasks:[], labelIds:[] };
  const habit = { id:'habit-3a', name:'3A habit', description:'', icon:'check', color:'blue', frequency:'daily', days:[], targetCount:1, reminderTime:null, startDate:date, endDate:null, isActive:true, isArchived:false, createdAt:`${date}T08:00:00.000Z`, updatedAt:`${date}T08:00:00.000Z` };
  const food = { id:'food-3a', name:'3A food', brand:null, category:'test', description:null, source:'custom', sourceDetail:null, preparation:'raw', serving:{amount:100,unit:'g'}, nutrition:{basis:'per_100g',servingAmount:null,servingUnit:null,calories:250,protein:20,carbohydrates:10,fat:8,fiber:2,sugar:2,saturatedFat:2,sodium:100,micronutrients:{}} };
  const foodLog = { id:'log-3a', foodId:'food-3a', quantity:100, unit:'g', mealType:'lunch', date, itemType:'food', createdAt:`${date}T09:00:00.000Z`, updatedAt:`${date}T09:00:00.000Z` };
  const previousDate = (() => { const d = new Date(`${date}T12:00:00.000Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0,10); })();
  const sleep = { id:'sleep-3a', date, sleepStart:`${previousDate}T22:00:00.000Z`, sleepEnd:`${date}T06:00:00.000Z`, durationMinutes:480, quality:'good', createdAt:`${date}T06:00:00.000Z`, updatedAt:`${date}T06:00:00.000Z` };
  const account = { id:'acct-3a', name:'Cash', type:'cash', balance:1000, currency:'INR', createdAt:`${date}T08:00:00.000Z`, updatedAt:`${date}T08:00:00.000Z` };
  const transaction = { id:'txn-3a', accountId:'acct-3a', type:'expense', amount:120, categoryId:'cat-3a', title:'Coffee', note:'', date, createdAt:`${date}T10:00:00.000Z`, updatedAt:`${date}T10:00:00.000Z` };
  const book = { id:'book-3a', title:'Integration Book', author:'Test', description:'', coverUrl:'', isbn:'', status:'reading', rating:null, totalPages:300, currentPage:90, category:'', notes:'', startedAt:`${date}T08:00:00.000Z`, completedAt:null, createdAt:`${date}T08:00:00.000Z`, updatedAt:`${date}T08:00:00.000Z` };
  const goal = { id:'goal-3a', type:'pages', period:'monthly', target:300, startDate:date.slice(0,7)+'-01', endDate:date, createdAt:`${date}T08:00:00.000Z`, updatedAt:`${date}T08:00:00.000Z` };
  const journal = { id:'journal-3a', title:'Today', content:'Integration test', date, mood:'good', tags:[], createdAt:`${date}T08:00:00.000Z`, updatedAt:`${date}T11:00:00.000Z` };
  let passed = 0;
  const check = async (name:string, fn:()=>Promise<void>) => { await fn(); passed++; console.log(`✓ ${name}`); };
  await AsyncStorage.clear();
  await saveData('lifeos:tasks:migration:v1', {version:1});
  await check('empty LifeOS state', async () => { const s=await getLifeOSDailyState(date); assert(s.tasks.total===0&&s.habits.activeToday===0&&s.finance.accountCount===0&&s.books.currentlyReading===0&&!s.journal.hasEntryToday,'empty state not empty'); });
  await AsyncStorage.multiSet([
    ['lifeos:tasks',JSON.stringify([task])],['lifeos:habits',JSON.stringify([habit])],['lifeos:habit-logs',JSON.stringify([{id:'habit-log-3a',habitId:habit.id,date,completed:true,value:null,createdAt:`${date}T09:00:00.000Z`,updatedAt:`${date}T09:00:00.000Z`}])],['lifeos:health:sleep',JSON.stringify([sleep])],['lifeos:nutrition:foods',JSON.stringify([food])],['lifeos:nutrition:food-logs',JSON.stringify([foodLog])],['lifeos:nutrition:recipes','[]'],['lifeos:finance:accounts',JSON.stringify([account])],['lifeos:finance:transactions',JSON.stringify([transaction])],['lifeos:books',JSON.stringify([book])],['lifeos:book-goals',JSON.stringify([goal])],['lifeos:journal',JSON.stringify([journal])],
  ]);
  await check('tasks contribution', async()=>assert((await getLifeOSDailyState(date)).tasks.dueToday===1,'tasks missing'));
  await check('habits contribution', async()=>{const h=(await getLifeOSDailyState(date)).habits;assert(h.activeToday===1&&h.completedToday===1&&h.completionRate===100,'habits missing');});
  await check('health contribution', async()=>{const h=(await getLifeOSDailyState(date)).health;assert(h.sleep?.durationMinutes===480&&h.recovery?.date===date,'health missing');});
  await check('nutrition contribution', async()=>assert((await getLifeOSDailyState(date)).nutrition.summary.totals.calories===250,'nutrition missing'));
  await check('finance contribution', async()=>{const f=(await getLifeOSDailyState(date)).finance;assert(f.accountCount===1&&f.transactionsToday===1&&f.expenseToday===120&&f.currencyBreakdown.INR===1000,'finance missing');});
  await check('books contribution', async()=>{const b=(await getLifeOSDailyState(date)).books;assert(b.currentlyReading===1&&b.readingBooks[0]?.currentPage===90,'books missing');});
  await check('journal contribution', async()=>{const j=(await getLifeOSDailyState(date)).journal;assert(j.entryCountToday===1&&j.latestEntry?.id===journal.id,'journal missing');});
  await check('goals contribution', async()=>assert((await getLifeOSDailyState(date)).goals[0]?.currentValue===90,'goals missing'));
  await check('multiple domains together', async()=>{const s=await getLifeOSDailyState(date);assert(s.tasks.dueToday===1&&s.habits.completedToday===1&&s.nutrition.summary.loggedCount===1&&s.finance.transactionsToday===1,'combined state incomplete');});
  await check('missing domain data is tolerated', async()=>{await AsyncStorage.removeItem('lifeos:journal');const s=await getLifeOSDailyState(date);assert(!s.journal.hasEntryToday&&s.tasks.dueToday===1,'missing domain broke integration');});
  await check('same date and data are deterministic', async()=>{const a=await getLifeOSDailyState(date);const b=await getLifeOSDailyState(date);assert(JSON.stringify(a)===JSON.stringify(b),'results differ');});
  await check('source data remains unchanged', async()=>{const before=await loadData<unknown[]>('lifeos:tasks',[]);const json=JSON.stringify(before);await getLifeOSDailyState(date);const after=await loadData<unknown[]>('lifeos:tasks',[]);assert(JSON.stringify(after)===json,'source data changed');});
  await check('integration service does not persist data', async()=>{const before=await AsyncStorage.multiGet(keys);await getLifeOSDailyState(date);const after=await AsyncStorage.multiGet(keys);assert(JSON.stringify(before)===JSON.stringify(after),'integration changed storage');});
  await check('date handling rejects invalid civil dates safely', async()=>{const s=await getLifeOSDailyState('2026-02-30');assert(s.date==='2026-02-30'&&s.tasks.total===0&&s.habits.activeToday===0,'invalid civil date handling failed');});
  console.log(`LIFEOS 3A INTEGRATION: ${passed} passed, 0 failed`);
})().catch((error)=>{console.error(error);process.exitCode=1;});

