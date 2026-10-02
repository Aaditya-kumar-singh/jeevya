import { HC_EXERCISE_TYPE_BY_ACTIVITY, mapHCExerciseType } from '@/services/health/types';

describe('Health Connect activity mapping', () => {
  it('maps core exercise types', () => {
    expect(mapHCExerciseType(HC_EXERCISE_TYPE_BY_ACTIVITY.running)).toBe('running');
    expect(mapHCExerciseType(HC_EXERCISE_TYPE_BY_ACTIVITY.cycling)).toBe('cycling');
    expect(mapHCExerciseType(HC_EXERCISE_TYPE_BY_ACTIVITY.walking)).toBe('walking');
    expect(mapHCExerciseType(999999)).toBe('other');
  });
});
