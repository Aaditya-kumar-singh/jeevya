import { useCallback, useEffect, useState } from 'react';
import {
  addExerciseToWorkout, createWorkout, deleteEmptyDrafts, duplicateWorkoutExercise,
  getActiveWorkout, getWorkout, getWorkoutSessions, moveWorkoutExercise, removeWorkoutExercise,
  saveWorkout, startWorkout, updateWorkoutExercise, updateWorkoutName, updateWorkoutSession,
  completeWorkout, cancelWorkout, deleteWorkout, addWorkoutSet, updateWorkoutSet, removeWorkoutSet,
  completeWorkoutSet, uncompleteWorkoutSet, getPreviousExercisePerformance as getPreviousPerformance,
} from '@/services/workouts';
import type { Workout, WorkoutExerciseConfig, WorkoutSession, WorkoutTemplate, WorkoutTemplateExerciseInput, WorkoutTemplateSetInput, CreateWorkoutTemplateInput, UpdateWorkoutTemplateInput , CreateWorkoutProgramInput, UpdateWorkoutProgramInput, WorkoutHistoryFilter, WorkoutProgramScheduleInput } from '@/types/workout';
import {
  addTemplateExercise as addTemplateExerciseService,
  addTemplateSet as addTemplateSetService,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  duplicateWorkoutTemplate,
  getWorkoutTemplate,
  getWorkoutTemplates,
  moveTemplateExercise as moveTemplateExerciseService,
  removeTemplateExercise as removeTemplateExerciseService,
  removeTemplateSet as removeTemplateSetService,
  searchWorkoutTemplates,
  startWorkoutFromTemplate as startWorkoutFromTemplateService,
  toggleWorkoutTemplateFavorite,

  activateProgram, addScheduleEntry, createProgram, deactivateProgram, deleteProgram, duplicateProgram as duplicateProgramService,
  getActiveProgram, getProgram, getScheduledTemplatesForDate, listPrograms, removeScheduleEntry,
  reorderScheduleEntries, updateProgram, updateScheduleEntry,
  updateTemplateExercise as updateTemplateExerciseService,
  updateTemplateSet as updateTemplateSetService,
  updateWorkoutTemplate} from '@/services/workoutTemplates';


import {
  getAllExercisePRs,
  getExercisePRs,
  getExerciseProgression,
  getLatestExercisePerformance,
  getPreviousExercisePerformance as getPreviousProgressionPerformance,
  calculateEstimatedOneRepMax,
  getBestEstimatedOneRepMax,
} from '@/services/workoutProgression';
import {
  getWorkoutHistory,
  getWorkoutHistoryByDate,
  getWorkoutHistoryByExercise,
  getWorkoutHistorySummary,
  getExerciseHistory,
  getLatestCompletedWorkout,
  getCompletedWorkoutCount,
  getWorkoutHistoryDateRange,
} from '@/services/workoutHistory';


export function useWorkout(workoutId?: string | null) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [programs, setPrograms] = useState<import('@/types/workout').WorkoutProgram[]>([]);
  const loadPrograms = useCallback(async (query?: string) => { const next = await listPrograms(query); setPrograms(next); return next; }, []);
  const addProgram = useCallback(async (input: CreateWorkoutProgramInput) => { const r=await createProgram(input); await loadPrograms(); return r; }, [loadPrograms]);
  const editProgram = useCallback(async (id:string, patch:UpdateWorkoutProgramInput) => { const r=await updateProgram(id,patch); await loadPrograms(); return r; }, [loadPrograms]);
  const removeProgram = useCallback(async (id:string) => { await deleteProgram(id); await loadPrograms(); }, [loadPrograms]);
  const duplicateProgram = useCallback(async (id:string) => { const r=await duplicateProgramService(id); await loadPrograms(); return r; }, [loadPrograms]);
  const toggleProgramActive = useCallback(async (id:string, active:boolean) => { const r=active?await activateProgram(id):await deactivateProgram(id); await loadPrograms(); return r; }, [loadPrograms]);
  const addProgramScheduleEntry = useCallback(async (id:string,input:WorkoutProgramScheduleInput)=>{const r=await addScheduleEntry(id,input);await loadPrograms();return r;},[loadPrograms]);
  const updateProgramScheduleEntry = useCallback(async (id:string,eid:string,p:Partial<WorkoutProgramScheduleInput>)=>{const r=await updateScheduleEntry(id,eid,p);await loadPrograms();return r;},[loadPrograms]);
  const removeProgramScheduleEntry = useCallback(async (id:string,eid:string)=>{const r=await removeScheduleEntry(id,eid);await loadPrograms();return r;},[loadPrograms]);
  const reorderProgramScheduleEntries = useCallback(async (id:string,eid:string,d:-1|1)=>{const r=await reorderScheduleEntries(id,eid,d);await loadPrograms();return r;},[loadPrograms]);

  const loadTemplates = useCallback(async (query?: string) => {
    const next = query?.trim() ? await searchWorkoutTemplates(query) : await getWorkoutTemplates();
    setTemplates(next);
    return next;
  }, []);

  const loadWorkouts = useCallback(async () => {
    const [sessions, active] = await Promise.all([getWorkoutSessions(), getActiveWorkout()]);
    setWorkoutSessions(sessions);
    setActiveWorkout(active ? toSession(active) : null);
    return sessions;
  }, []);

  const reload = useCallback(async () => {
    try {
      if (workoutId) {
        const found = await getWorkout(workoutId);
        if (!found) { setError('Workout not found.'); return; }
        setWorkout(found);
      } else {
        await deleteEmptyDrafts();
        setWorkout(await createWorkout());
      }
      await Promise.all([loadWorkouts(), loadTemplates()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workout');
    } finally { setLoading(false); }
  }, [workoutId, loadTemplates, loadWorkouts]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const addExercise = useCallback(async (config: WorkoutExerciseConfig) => {
    if (!workout) return; setWorkout(await addExerciseToWorkout(workout.id, config));
  }, [workout]);
  const removeExercise = useCallback(async (id: string) => {
    if (!workout) return; setWorkout(await removeWorkoutExercise(workout.id, id));
  }, [workout]);
  const duplicateExercise = useCallback(async (id: string) => {
    if (!workout) return; setWorkout(await duplicateWorkoutExercise(workout.id, id));
  }, [workout]);
  const updateExercise = useCallback(async (id: string, patch: Parameters<typeof updateWorkoutExercise>[2]) => {
    if (!workout) return; setWorkout(await updateWorkoutExercise(workout.id, id, patch));
  }, [workout]);
  const moveExercise = useCallback(async (id: string, direction: -1 | 1) => {
    if (!workout) return; setWorkout(await moveWorkoutExercise(workout.id, id, direction));
  }, [workout]);
  const updateName = useCallback(async (name: string) => {
    if (!workout) return; setWorkout(await updateWorkoutName(workout.id, name));
  }, [workout]);
  const save = useCallback(async () => {
    if (!workout) return; setSaving(true); setError(null);
    try { setWorkout(await saveWorkout(workout)); } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save workout'); }
    finally { setSaving(false); }
  }, [workout]);
  const start = useCallback(async () => {
    if (!workout) return null; setSaving(true); setError(null);
    try { const active = await startWorkout(workout.id); setWorkout(active); await loadWorkouts(); return active; }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to start workout'); return null; }
    finally { setSaving(false); }
  }, [workout, loadWorkouts]);

  const getWorkoutById = useCallback((id: string) => getWorkout(id), []);
  const getPreviousExercisePerformance = useCallback(async (exerciseId: string) => getPreviousPerformance(exerciseId, await getWorkoutSessions()), []);
  const getWorkoutHistoryData = useCallback((filter?: WorkoutHistoryFilter) => getWorkoutHistory(filter), []);
  const getWorkoutHistoryForDate = useCallback((date: string) => getWorkoutHistoryByDate(date), []);
  const getWorkoutHistoryForExercise = useCallback((exerciseId: string) => getWorkoutHistoryByExercise(exerciseId), []);
  const getWorkoutHistorySummaryData = useCallback((filter?: WorkoutHistoryFilter) => getWorkoutHistorySummary(filter), []);
  const getExerciseHistoryData = useCallback((exerciseId: string, filter?: Omit<WorkoutHistoryFilter, 'exerciseId'>) => getExerciseHistory(exerciseId, filter), []);
  const getLatestCompletedWorkoutData = useCallback((exerciseId?: string) => getLatestCompletedWorkout(exerciseId), []);
  const getCompletedWorkoutCountData = useCallback((filter?: WorkoutHistoryFilter) => getCompletedWorkoutCount(filter), []);
  const getWorkoutHistoryDateRangeData = useCallback((filter?: Omit<WorkoutHistoryFilter, 'fromDate' | 'toDate' | 'limit' | 'offset'>) => getWorkoutHistoryDateRange(filter), []);
  const getExercisePRsData = useCallback((exerciseId: string) => getExercisePRs(exerciseId), []);
  const getAllExercisePRsData = useCallback(() => getAllExercisePRs(), []);
  const getExerciseProgressionData = useCallback((exerciseId: string) => getExerciseProgression(exerciseId), []);
  const getLatestExercisePerformanceData = useCallback((exerciseId: string) => getLatestExercisePerformance(exerciseId), []);
  const getPreviousProgressionPerformanceData = useCallback((exerciseId: string) => getPreviousProgressionPerformance(exerciseId), []);
  const calculateEstimatedOneRepMaxData = useCallback((weightKg: number, reps: number) => calculateEstimatedOneRepMax(weightKg, reps), []);
  const getBestEstimatedOneRepMaxData = useCallback((exerciseId: string) => getBestEstimatedOneRepMax(exerciseId), []);
  const updateWorkout = useCallback((id: string, patch: Partial<WorkoutSession>) => updateWorkoutSession(id, patch), []);
  const finishWorkout = useCallback(async (id: string) => { const result = await completeWorkout(id); await loadWorkouts(); return result; }, [loadWorkouts]);
  const stopWorkout = useCallback(async (id: string) => { const result = await cancelWorkout(id); await loadWorkouts(); return result; }, [loadWorkouts]);
  const deleteWorkoutById = useCallback((id: string) => deleteWorkout(id), []);
  const addSet = useCallback((id: string, exerciseId: string) => addWorkoutSet(id, exerciseId), []);
  const updateSet = useCallback((id: string, exerciseId: string, setId: string, patch: Parameters<typeof updateWorkoutSet>[3]) => updateWorkoutSet(id, exerciseId, setId, patch), []);
  const removeSet = useCallback((id: string, exerciseId: string, setId: string) => removeWorkoutSet(id, exerciseId, setId), []);
  const completeSet = useCallback((id: string, exerciseId: string, setId: string, patch?: Parameters<typeof completeWorkoutSet>[3]) => completeWorkoutSet(id, exerciseId, setId, patch), []);
  const uncompleteSet = useCallback((id: string, exerciseId: string, setId: string) => uncompleteWorkoutSet(id, exerciseId, setId), []);

  const addTemplate = useCallback(async (input: CreateWorkoutTemplateInput) => {
    const result = await createWorkoutTemplate(input);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const editTemplate = useCallback(async (id: string, patch: UpdateWorkoutTemplateInput) => {
    const result = await updateWorkoutTemplate(id, patch);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const removeTemplate = useCallback(async (id: string) => {
    await deleteWorkoutTemplate(id);
    await loadTemplates();
  }, [loadTemplates]);
  const duplicateTemplate = useCallback(async (id: string) => {
    const result = await duplicateWorkoutTemplate(id);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const toggleTemplateFavorite = useCallback(async (id: string) => {
    const result = await toggleWorkoutTemplateFavorite(id);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const addTemplateExercise = useCallback(async (id: string, input: WorkoutTemplateExerciseInput) => {
    const result = await addTemplateExerciseService(id, input);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const updateTemplateExercise = useCallback(async (id: string, exerciseId: string, patch: Parameters<typeof updateTemplateExerciseService>[2]) => {
    const result = await updateTemplateExerciseService(id, exerciseId, patch);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const removeTemplateExercise = useCallback(async (id: string, exerciseId: string) => {
    const result = await removeTemplateExerciseService(id, exerciseId);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const moveTemplateExercise = useCallback(async (id: string, exerciseId: string, direction: -1 | 1) => {
    const result = await moveTemplateExerciseService(id, exerciseId, direction);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const addTemplateSet = useCallback(async (id: string, exerciseId: string, input?: WorkoutTemplateSetInput) => {
    const result = await addTemplateSetService(id, exerciseId, input);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const updateTemplateSet = useCallback(async (id: string, exerciseId: string, setId: string, patch: WorkoutTemplateSetInput) => {
    const result = await updateTemplateSetService(id, exerciseId, setId, patch);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const removeTemplateSet = useCallback(async (id: string, exerciseId: string, setId: string) => {
    const result = await removeTemplateSetService(id, exerciseId, setId);
    await loadTemplates();
    return result;
  }, [loadTemplates]);
  const getTemplate = useCallback((id: string) => getWorkoutTemplate(id), []);
  const startWorkoutFromTemplate = useCallback(async (id: string) => {
    const result = await startWorkoutFromTemplateService(id);
    await loadWorkouts();
    return result;
  }, [loadWorkouts]);

  return { workout, setWorkout, workoutSessions, activeWorkout, templates, loadWorkouts, loadTemplates,
    getWorkout: getWorkoutById, updateWorkout, completeWorkout: finishWorkout, cancelWorkout: stopWorkout,
    addSet, updateSet, removeSet, completeSet, uncompleteSet, getPreviousExercisePerformance,
    getWorkoutHistory: getWorkoutHistoryData, getWorkoutHistoryByDate: getWorkoutHistoryForDate,
    getWorkoutHistoryByExercise: getWorkoutHistoryForExercise, getWorkoutHistorySummary: getWorkoutHistorySummaryData,
    getExerciseHistory: getExerciseHistoryData, getLatestCompletedWorkout: getLatestCompletedWorkoutData,
    getCompletedWorkoutCount: getCompletedWorkoutCountData, getWorkoutHistoryDateRange: getWorkoutHistoryDateRangeData,
    getExercisePRs: getExercisePRsData, getAllExercisePRs: getAllExercisePRsData,
    getExerciseProgression: getExerciseProgressionData, getLatestExercisePerformance: getLatestExercisePerformanceData,
    getPreviousProgressionPerformance: getPreviousProgressionPerformanceData,
    calculateEstimatedOneRepMax: calculateEstimatedOneRepMaxData, getBestEstimatedOneRepMax: getBestEstimatedOneRepMaxData,
    getTemplate, addTemplate, editTemplate, removeTemplate, duplicateTemplate, toggleTemplateFavorite,
    addTemplateExercise, updateTemplateExercise, removeTemplateExercise, moveTemplateExercise,
    addTemplateSet, updateTemplateSet, removeTemplateSet, startWorkoutFromTemplate,
    programs, loadPrograms, addProgram, editProgram, removeProgram, duplicateProgram, toggleProgramActive,
    addProgramScheduleEntry, updateProgramScheduleEntry, removeProgramScheduleEntry, reorderProgramScheduleEntries,
    getProgram, getActiveProgram, getScheduledTemplatesForDate,
    loading, saving, error, addExercise, removeExercise, duplicateExercise, updateExercise,
    moveExercise, updateName, save, start, deleteWorkout: deleteWorkoutById };
}

function toSession(w: Workout): WorkoutSession {
  return { id:w.id, name:w.name, startedAt:w.startedAt ?? w.createdAt, completedAt:w.completedAt ?? undefined,
    status:(w.status === 'active' ? 'in_progress' : w.status) as WorkoutSession['status'], exercises:w.exercises,
    durationSeconds:w.durationSeconds ?? undefined, createdAt:w.createdAt, updatedAt:w.updatedAt };
}
