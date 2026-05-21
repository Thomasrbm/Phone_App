import {
  getTaskCountsInRange,
  listDeletedTasksByDay,
  listTasksByDay,
  type DayCounts,
  type Task,
} from '@/db/tasks';
import {
  getCompletionDaysForRoutine,
  getCompletionsForDay,
  getRoutineCountsInRange,
  getRoutineStats,
  listGroups,
  listRoutinesByGroup,
  type Routine,
  type RoutineDayCounts,
  type RoutineGroup,
  type RoutineStats,
} from '@/db/routines';
import {
  listObjectivesByHorizon,
  type ObjectivesByHorizon,
} from '@/db/objectives';
import { createKeyedView } from './subscribable';

// Module-level stable defaults. useSyncExternalStore needs a stable
// reference when the cache is empty — passing fresh literals would
// trigger render loops. Conceptually immutable; do not write to them.
export const EMPTY_TASKS: Task[] = [];
export const EMPTY_COUNTS: Record<string, DayCounts> = {};
export const EMPTY_COMPLETIONS: Set<string> = new Set();
export const EMPTY_ROUTINE_COUNTS: Record<string, RoutineDayCounts> = {};
export const EMPTY_STATS: RoutineStats = {
  streak: 0,
  completed30d: 0,
  ratio30d: 0,
};
export type RoutineStructure = {
  groups: RoutineGroup[];
  routinesByGroup: Record<string, Routine[]>;
};
export const EMPTY_STRUCTURE: RoutineStructure = {
  groups: [],
  routinesByGroup: {},
};
export const EMPTY_OBJECTIVES: ObjectivesByHorizon = {
  short: [],
  medium: [],
  long: [],
};

// --- Tasks ---

export const tasksByDayView = createKeyedView<string, Task[]>(
  (day) => listTasksByDay(day),
  (day) => day
);

export const deletedTasksByDayView = createKeyedView<string, Task[]>(
  (day) => listDeletedTasksByDay(day),
  (day) => day
);

export const taskCountsInRangeView = createKeyedView<
  { start: string; end: string },
  Record<string, DayCounts>
>(
  ({ start, end }) => getTaskCountsInRange(start, end),
  ({ start, end }) => `${start}/${end}`
);

// --- Routines ---

// Singleton view: one entry under the empty-string key. Avoids inventing
// a separate "non-keyed" primitive for the one place we need it.
export const routineStructureView = createKeyedView<'_', RoutineStructure>(
  async () => {
    const groups = await listGroups();
    const lists = await Promise.all(
      groups.map((g) => listRoutinesByGroup(g.id))
    );
    const routinesByGroup: Record<string, Routine[]> = {};
    groups.forEach((g, i) => {
      routinesByGroup[g.id] = lists[i];
    });
    return { groups, routinesByGroup };
  },
  () => '_'
);

export const completionsByDayView = createKeyedView<string, Set<string>>(
  (day) => getCompletionsForDay(day),
  (day) => day
);

export const routineStatsView = createKeyedView<
  { routineId: string; today: string },
  RoutineStats
>(
  ({ routineId, today }) => getRoutineStats(routineId, today),
  ({ routineId, today }) => `${routineId}/${today}`
);

export const routineCompletionsInRangeView = createKeyedView<
  { routineId: string; start: string; end: string },
  Set<string>
>(
  ({ routineId, start, end }) =>
    getCompletionDaysForRoutine(routineId, start, end),
  ({ routineId, start, end }) => `${routineId}/${start}/${end}`
);

export const routineCountsInRangeView = createKeyedView<
  { start: string; end: string },
  Record<string, RoutineDayCounts>
>(
  ({ start, end }) => getRoutineCountsInRange(start, end),
  ({ start, end }) => `${start}/${end}`
);

// --- Objectives ---

// Singleton view: a single map of horizon → Objective[]. Mutations
// invalidate the whole entry; the dataset is small (typically <50 rows)
// so re-fetching is cheap.
export const objectivesView = createKeyedView<'_', ObjectivesByHorizon>(
  () => listObjectivesByHorizon(),
  () => '_'
);

// --- Invalidation helpers ---
//
// Coarse-grained on purpose: every cache entry is small and few in
// number (≤ 30 days × a handful of views), so re-running a SQL aggregate
// for the subscribed range entries is cheaper than tracking precise
// dependencies.

// Tasks on a specific day changed (created / updated / toggled /
// deleted / restored). Re-fetch that day's list AND any range that
// might cover the day.
export function invalidateTasksOnDay(day: string): void {
  tasksByDayView.invalidate((k) => k === day);
  deletedTasksByDayView.invalidate((k) => k === day);
  taskCountsInRangeView.invalidate(
    ({ start, end }) => day >= start && day <= end
  );
}

// Used by bulk operations that span multiple days.
export function invalidateAllTasks(): void {
  tasksByDayView.invalidate();
  deletedTasksByDayView.invalidate();
  taskCountsInRangeView.invalidate();
}

// Group / routine create / rename / archive / delete: structure changed.
// Stats also need a refresh because the set of routines may have shifted.
export function invalidateRoutineStructure(): void {
  routineStructureView.invalidate();
  routineStatsView.invalidate();
  routineCountsInRangeView.invalidate();
}

// Any objective create / update / toggle / delete. Singleton scope.
export function invalidateObjectives(): void {
  objectivesView.invalidate();
}

// A routine completion was toggled on a specific day. Refresh that day's
// completion set, AND every stat / range view that might surface it.
export function invalidateRoutineCompletionsOnDay(day: string): void {
  completionsByDayView.invalidate((k) => k === day);
  // Stats are anchored on `today`; a completion toggled on any day can
  // affect streak / 30-day counts, so refresh all stat entries.
  routineStatsView.invalidate();
  routineCompletionsInRangeView.invalidate(
    ({ start, end }) => day >= start && day <= end
  );
  routineCountsInRangeView.invalidate(
    ({ start, end }) => day >= start && day <= end
  );
}
