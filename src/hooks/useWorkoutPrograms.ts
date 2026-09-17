import { useCallback } from 'react';
import {
  activateProgram,
  addScheduleEntry,
  createProgram,
  deactivateProgram,
  deleteProgram,
  duplicateProgram,
  getProgram,
  getScheduledTemplatesForDate,
  getWorkoutTemplates,
  listPrograms,
  removeScheduleEntry,
  reorderScheduleEntries,
  updateProgram,
  updateScheduleEntry,
} from '@/services/workoutTemplates';
import type { UpdateWorkoutProgramInput, WorkoutProgramScheduleInput } from '@/types/workout';

export function useWorkoutPrograms() {
  const getPrograms = useCallback((query?: string) => listPrograms(query), []);
  const getProgramById = useCallback((id: string) => getProgram(id), []);
  const create = useCallback((input: Parameters<typeof createProgram>[0]) => createProgram(input), []);
  const update = useCallback(
    (id: string, patch: UpdateWorkoutProgramInput) => updateProgram(id, patch),
    [],
  );
  const remove = useCallback((id: string) => deleteProgram(id), []);
  const duplicate = useCallback((id: string) => duplicateProgram(id), []);
  const setActive = useCallback(
    (id: string, active: boolean) => (active ? activateProgram(id) : deactivateProgram(id)),
    [],
  );
  const addSchedule = useCallback(
    (id: string, input: WorkoutProgramScheduleInput) => addScheduleEntry(id, input),
    [],
  );
  const updateSchedule = useCallback(
    (id: string, entryId: string, patch: Partial<WorkoutProgramScheduleInput>) =>
      updateScheduleEntry(id, entryId, patch),
    [],
  );
  const removeSchedule = useCallback(
    (id: string, entryId: string) => removeScheduleEntry(id, entryId),
    [],
  );
  const reorderSchedule = useCallback(
    (id: string, entryId: string, direction: -1 | 1) =>
      reorderScheduleEntries(id, entryId, direction),
    [],
  );
  const getTemplates = useCallback(() => getWorkoutTemplates(), []);
  const getScheduledTemplates = useCallback(
    (date: Date | string) => getScheduledTemplatesForDate(date),
    [],
  );

  return {
    getPrograms,
    getProgram: getProgramById,
    createProgram: create,
    updateProgram: update,
    deleteProgram: remove,
    duplicateProgram: duplicate,
    setProgramActive: setActive,
    addScheduleEntry: addSchedule,
    updateScheduleEntry: updateSchedule,
    removeScheduleEntry: removeSchedule,
    reorderScheduleEntries: reorderSchedule,
    getTemplates,
    getScheduledTemplates,
  };
}
