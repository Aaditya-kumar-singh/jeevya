// ─── Nutrition Hook (Phase 1A + 1D + 1F + 1G + 1H + 1I + 1J) ────────────────
// Mirrors the Journal/Books hooks: requestId/stale-response protection, busy
// guard on refresh, immutable state updates, errors rethrown for screens to
// surface. Local/offline only. Phase 1D adds food log management.
// Phase 1F adds recipe management and recipe-aware daily totals.
// Phase 1G adds body profile and nutrition targets.
// Phase 1H adds energy activities and daily energy balance.
// Phase 1I adds activity tracking with type, intensity, and calorie estimation.
// Phase 1J adds health provider integration (read-only sync).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ActivityEstimateInput,
  BodyProfile,
  BodyProfileInput,
  CreateEnergyActivityInput,
  DailyEnergySummary,
  EnergyActivity,
  FoodItem,
  FoodLogEntry,
  MealType,
  CreateFoodInput,
  CreateFoodLogInput,
  CreateRecipeInput,
  DailyNutritionSummary,
  NutritionAnalyticsPeriod,
  NutritionAnalyticsResult,
  NutritionInsight,
  NutritionTargets,
  Recipe,
  UpdateEnergyActivityInput,
  UpdateFoodInput,
  UpdateFoodLogInput,
  UpdateRecipeInput,
} from '@/types/nutrition';
import {
  getFoods,
  getFoodById as getFoodByIdService,
  createFood,
  updateFood,
  deleteFood,
  seedSystemFoods,
  getFoodLogs,
  getFoodLogById,
  getFoodLogsForDate as getFoodLogsForDateService,
  getFoodLogsForMeal as getFoodLogsForMealService,
  createFoodLog,
  updateFoodLog,
  deleteFoodLog,
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  calculateDailyNutrition,
  getBodyProfile as getBodyProfileService,
  saveBodyProfile as saveBodyProfileService,
  updateBodyProfile as updateBodyProfileService,
  clearBodyProfile as clearBodyProfileService,
  calculateNutritionTargets,
  getEnergyActivities as getEnergyActivitiesService,
  getEnergyActivitiesByDate as getEnergyActivitiesByDateService,
  createEnergyActivity as createEnergyActivityService,
  updateEnergyActivity as updateEnergyActivityService,
  deleteEnergyActivity as deleteEnergyActivityService,
  estimateActivityCalories as estimateActivityCaloriesService,
  calculateDailyEnergy,
  calculateNutritionAnalytics,
  generateNutritionInsights,
  resolveNutritionAnalyticsRange,
} from '@/services/nutrition';
import {
  getHealthSyncState as getHealthSyncStateService,
  syncHealthActivities as syncHealthActivitiesService,
} from '@/services/health';
import type { HealthSyncState } from '@/types/health';

export function useNutrition() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile | null>(null);
  const [energyActivities, setEnergyActivities] = useState<EnergyActivity[]>([]);
  const [healthSyncStatus, setHealthSyncStatus] = useState<HealthSyncState>({
    provider: 'health_connect',
    status: 'unavailable',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadFoods = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      try {
        await seedSystemFoods();
      } catch {
        // Intentionally ignored — getFoods() below reports store problems.
      }
      const foodsData = await getFoods();

      if (requestId !== requestIdRef.current) return;

      setFoods(foodsData);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load foods');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const loadFoodLogs = useCallback(async () => {
    try {
      const logs = await getFoodLogs();
      setFoodLogs(logs);
    } catch {
      // Food log load failures don't block the food library.
    }
  }, []);

  const loadRecipes = useCallback(async () => {
    try {
      const data = await getRecipes();
      setRecipes(data);
    } catch {
      // Recipe load failures don't block the food library.
    }
  }, []);

  const loadBodyProfile = useCallback(async () => {
    try {
      const profile = await getBodyProfileService();
      setBodyProfile(profile);
    } catch {
      // Body profile load failures don't block the food library.
    }
  }, []);

  const loadEnergyActivities = useCallback(async () => {
    try {
      const activities = await getEnergyActivitiesService();
      setEnergyActivities(activities);
    } catch {
      // Energy activity load failures don't block the food library.
    }
  }, []);

  const loadHealthSyncStatus = useCallback(async () => {
    try {
      const state = await getHealthSyncStateService();
      setHealthSyncStatus(state);
    } catch {
      // Health sync status load failures don't block the food library.
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadFoods();
    void loadFoodLogs();
    void loadRecipes();
    void loadBodyProfile();
    void loadEnergyActivities();
    void loadHealthSyncStatus();
  }, [loadFoods, loadFoodLogs, loadRecipes, loadBodyProfile, loadEnergyActivities, loadHealthSyncStatus]);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    await loadFoods();
    await loadFoodLogs();
    await loadRecipes();
    await loadBodyProfile();
    await loadEnergyActivities();
    await loadHealthSyncStatus();
    busyRef.current = false;
  }, [loadFoods, loadFoodLogs, loadRecipes, loadBodyProfile, loadEnergyActivities, loadHealthSyncStatus]);

  // ─── Food CRUD ────────────────────────────────────────────────────────────

  const addFood = useCallback(async (input: CreateFoodInput): Promise<FoodItem> => {
    const requestId = ++requestIdRef.current;
    const newFood = await createFood(input);
    if (requestId === requestIdRef.current) {
      setFoods((prev) =>
        [...prev, newFood].sort(
          (a, b) => a.name.localeCompare(b.name) || b.createdAt.localeCompare(a.createdAt),
        ),
      );
    }
    return newFood;
  }, []);

  const editFood = useCallback(async (id: string, input: UpdateFoodInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateFood(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Food not found');
      setFoods((prev) =>
        prev
          .map((f) => (f.id === id ? updated : f))
          .sort(
            (a, b) => a.name.localeCompare(b.name) || b.createdAt.localeCompare(a.createdAt),
          ),
      );
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeFood = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteFood(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setFoods((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const getFoodById = useCallback(
    async (id: string): Promise<FoodItem | null> => {
      const local = foods.find((f) => f.id === id);
      if (local) return local;
      return getFoodByIdService(id);
    },
    [foods],
  );

  // ─── Food Log CRUD (Phase 1D) ─────────────────────────────────────────────

  const addFoodLog = useCallback(async (input: CreateFoodLogInput): Promise<FoodLogEntry> => {
    const requestId = ++requestIdRef.current;
    const newLog = await createFoodLog(input);
    if (requestId === requestIdRef.current) {
      setFoodLogs((prev) =>
        [newLog, ...prev].sort(
          (a, b) =>
            b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
        ),
      );
    }
    return newLog;
  }, []);

  const editFoodLog = useCallback(async (id: string, input: UpdateFoodLogInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateFoodLog(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Food log not found');
      setFoodLogs((prev) =>
        prev
          .map((l) => (l.id === id ? updated : l))
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
          ),
      );
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeFoodLog = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteFoodLog(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setFoodLogs((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const getFoodLogsForDate = useCallback(async (date: string): Promise<FoodLogEntry[]> => {
    return getFoodLogsForDateService(date);
  }, []);

  const getFoodLogsForMeal = useCallback(
    async (date: string, mealType: MealType): Promise<FoodLogEntry[]> => {
      return getFoodLogsForMealService(date, mealType);
    },
    [],
  );

  // ─── Recipe CRUD (Phase 1F) ───────────────────────────────────────────────

  const addRecipe = useCallback(async (input: CreateRecipeInput): Promise<Recipe> => {
    const requestId = ++requestIdRef.current;
    const newRecipe = await createRecipe(input);
    if (requestId === requestIdRef.current) {
      setRecipes((prev) =>
        [...prev, newRecipe].sort(
          (a, b) => a.name.localeCompare(b.name) || b.createdAt.localeCompare(a.createdAt),
        ),
      );
    }
    return newRecipe;
  }, []);

  const editRecipe = useCallback(async (id: string, input: UpdateRecipeInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateRecipe(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Recipe not found');
      setRecipes((prev) =>
        prev
          .map((r) => (r.id === id ? updated : r))
          .sort(
            (a, b) => a.name.localeCompare(b.name) || b.createdAt.localeCompare(a.createdAt),
          ),
      );
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeRecipe = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteRecipe(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setRecipes((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  // ─── Body Profile & Targets (Phase 1G) ──────────────────────────────────────

  const addBodyProfile = useCallback(async (input: BodyProfileInput): Promise<BodyProfile> => {
    const requestId = ++requestIdRef.current;
    const profile = await saveBodyProfileService(input);
    if (requestId === requestIdRef.current) {
      setBodyProfile(profile);
    }
    return profile;
  }, []);

  const editBodyProfile = useCallback(async (input: Partial<BodyProfileInput>) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateBodyProfileService(input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('No body profile exists to update');
      setBodyProfile(updated);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeBodyProfile = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await clearBodyProfileService();
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setBodyProfile(null);
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const targets: NutritionTargets | null = useMemo(() => {
    if (!bodyProfile) return null;
    return calculateNutritionTargets(bodyProfile);
  }, [bodyProfile]);

  // ─── Energy Activities (Phase 1H + 1I) ──────────────────────────────────────

  const loadActivities = useCallback(async () => {
    try {
      const activities = await getEnergyActivitiesService();
      setEnergyActivities(activities);
    } catch {
      // Energy activity load failures don't block the food library.
    }
  }, []);

  const addEnergyActivity = useCallback(async (input: CreateEnergyActivityInput): Promise<EnergyActivity> => {
    const requestId = ++requestIdRef.current;
    const activity = await createEnergyActivityService(input);
    if (requestId === requestIdRef.current) {
      setEnergyActivities((prev) =>
        [activity, ...prev].sort(
          (a, b) =>
            b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
        ),
      );
    }
    return activity;
  }, []);

  const editEnergyActivity = useCallback(async (id: string, input: UpdateEnergyActivityInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateEnergyActivityService(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Activity not found');
      setEnergyActivities((prev) =>
        prev
          .map((a) => (a.id === id ? updated : a))
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
          ),
      );
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeEnergyActivity = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteEnergyActivityService(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setEnergyActivities((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const getActivitiesByDate = useCallback(async (date: string): Promise<EnergyActivity[]> => {
    return getEnergyActivitiesByDateService(date);
  }, []);

  const estimateActivityCalories = useCallback(
    (input: ActivityEstimateInput): number | null => {
      if (!bodyProfile) return null;
      try {
        return estimateActivityCaloriesService({
          ...input,
          weightKg: bodyProfile.weightKg,
        });
      } catch {
        return null;
      }
    },
    [bodyProfile],
  );

  const getEnergySummary = useCallback(
    (date: string): DailyEnergySummary => {
      return calculateDailyEnergy(date, foodLogs, foods, recipes, bodyProfile, energyActivities);
    },
    [foodLogs, foods, recipes, bodyProfile, energyActivities],
  );

  // ─── Nutrition & Energy Analytics (Phase 1K) ──────────────────────────────

  const getNutritionAnalyticsRange = useCallback(
    (startDate: string, endDate: string): NutritionAnalyticsResult => {
      return calculateNutritionAnalytics(
        startDate,
        endDate,
        foodLogs,
        foods,
        recipes,
        bodyProfile,
        energyActivities,
      );
    },
    [foodLogs, foods, recipes, bodyProfile, energyActivities],
  );

  const getNutritionAnalytics = useCallback(
    (period: NutritionAnalyticsPeriod): NutritionAnalyticsResult => {
      const { startDate, endDate } = resolveNutritionAnalyticsRange(
        period,
        foodLogs,
        energyActivities,
      );
      return calculateNutritionAnalytics(
        startDate,
        endDate,
        foodLogs,
        foods,
        recipes,
        bodyProfile,
        energyActivities,
      );
    },
    [foodLogs, foods, recipes, bodyProfile, energyActivities],
  );

  const getNutritionInsightsRange = useCallback(
    (startDate: string, endDate: string): NutritionInsight[] => {
      const analytics = calculateNutritionAnalytics(
        startDate,
        endDate,
        foodLogs,
        foods,
        recipes,
        bodyProfile,
        energyActivities,
      );
      return generateNutritionInsights(
        analytics,
        bodyProfile,
        targets,
        foodLogs,
        foods,
        recipes,
      );
    },
    [foodLogs, foods, recipes, bodyProfile, energyActivities, targets],
  );

  const getNutritionInsights = useCallback(
    (period: NutritionAnalyticsPeriod): NutritionInsight[] => {
      const { startDate, endDate } = resolveNutritionAnalyticsRange(
        period,
        foodLogs,
        energyActivities,
      );
      return getNutritionInsightsRange(startDate, endDate);
    },
    [foodLogs, energyActivities, getNutritionInsightsRange],
  );

  // ─── Health Integration (Phase 1J) ──────────────────────────────────────────

  const requestHealthPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { getAvailableAdapter } = await import('@/services/health');
      const adapter = await getAvailableAdapter();
      if (!adapter) return false;
      const granted = await adapter.requestPermissions();
      if (granted) {
        const state = await getHealthSyncStateService();
        setHealthSyncStatus(state);
      }
      return granted;
    } catch {
      return false;
    }
  }, []);

  const syncHealthActivities = useCallback(
    async (startDate: string, endDate: string): Promise<HealthSyncState> => {
      const requestId = ++requestIdRef.current;
      try {
        const state = await syncHealthActivitiesService(startDate, endDate);
        if (requestId !== requestIdRef.current) return state;
        setHealthSyncStatus(state);
        // Refresh activities after sync
        await loadEnergyActivities();
        return state;
      } catch (e) {
        const errorState: HealthSyncState = {
          provider: 'health_connect',
          status: 'error',
          error: e instanceof Error ? e.message : 'Sync failed',
        };
        if (requestId === requestIdRef.current) {
          setHealthSyncStatus(errorState);
        }
        return errorState;
      }
    },
    [loadEnergyActivities],
  );

  return {
    foods,
    foodLogs,
    recipes,
    bodyProfile,
    targets,
    energyActivities,
    loading,
    refreshing,
    error,
    refresh,
    addFood,
    editFood,
    removeFood,
    getFoodById,
    addFoodLog,
    editFoodLog,
    removeFoodLog,
    getFoodLogsForDate,
    getFoodLogsForMeal,
    addRecipe,
    editRecipe,
    removeRecipe,
    addBodyProfile,
    editBodyProfile,
    removeBodyProfile,
    loadActivities,
    addEnergyActivity,
    editEnergyActivity,
    removeEnergyActivity,
    getActivitiesByDate,
    estimateActivityCalories,
    getEnergySummary,
    getNutritionAnalytics,
    getNutritionAnalyticsRange,
    getNutritionInsights,
    getNutritionInsightsRange,
    healthSyncStatus,
    loadHealthSyncStatus,
    requestHealthPermissions,
    syncHealthActivities,
    getDailySummary: (date: string): DailyNutritionSummary => {
      return calculateDailyNutrition(date, foodLogs, foods, recipes);
    },
  };
}
