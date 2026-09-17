import { useCallback } from 'react';
import {
  addTemplateExercise,
  addTemplateSet,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  duplicateWorkoutTemplate,
  getWorkoutTemplate,
  getWorkoutTemplates,
  moveTemplateExercise,
  removeTemplateExercise,
  removeTemplateSet,
  searchWorkoutTemplates,
  startWorkoutFromTemplate,
  toggleWorkoutTemplateFavorite,
  updateTemplateSet,
  updateWorkoutTemplate,
} from '@/services/workoutTemplates';
import type {
  CreateWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
  WorkoutTemplateExerciseInput,
  WorkoutTemplateSetInput,
} from '@/types/workout';

export function useWorkoutTemplates() {
  const getTemplates = useCallback(
    (query?: string) => (query?.trim() ? searchWorkoutTemplates(query) : getWorkoutTemplates()),
    [],
  );
  const getTemplate = useCallback((id: string) => getWorkoutTemplate(id), []);
  const createTemplate = useCallback(
    (input: CreateWorkoutTemplateInput) => createWorkoutTemplate(input),
    [],
  );
  const updateTemplate = useCallback(
    (id: string, patch: UpdateWorkoutTemplateInput) => updateWorkoutTemplate(id, patch),
    [],
  );
  const deleteTemplate = useCallback((id: string) => deleteWorkoutTemplate(id), []);
  const duplicateTemplate = useCallback((id: string) => duplicateWorkoutTemplate(id), []);
  const toggleTemplateFavorite = useCallback(
    (id: string) => toggleWorkoutTemplateFavorite(id),
    [],
  );
  const addExercise = useCallback(
    (id: string, input: WorkoutTemplateExerciseInput) => addTemplateExercise(id, input),
    [],
  );
  const moveExercise = useCallback(
    (id: string, exerciseId: string, direction: -1 | 1) =>
      moveTemplateExercise(id, exerciseId, direction),
    [],
  );
  const removeExercise = useCallback(
    (id: string, exerciseId: string) => removeTemplateExercise(id, exerciseId),
    [],
  );
  const addSet = useCallback(
    (id: string, exerciseId: string, input?: WorkoutTemplateSetInput) =>
      addTemplateSet(id, exerciseId, input),
    [],
  );
  const updateSet = useCallback(
    (id: string, exerciseId: string, setId: string, patch: WorkoutTemplateSetInput) =>
      updateTemplateSet(id, exerciseId, setId, patch),
    [],
  );
  const removeSet = useCallback(
    (id: string, exerciseId: string, setId: string) => removeTemplateSet(id, exerciseId, setId),
    [],
  );
  const startFromTemplate = useCallback((id: string) => startWorkoutFromTemplate(id), []);

  return {
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleTemplateFavorite,
    addExercise,
    moveExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    startFromTemplate,
  };
}
