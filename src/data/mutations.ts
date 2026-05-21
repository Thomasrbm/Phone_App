import {
  createTask as dbCreateTask,
  permanentlyDeleteTask as dbPermanentlyDeleteTask,
  restoreTask as dbRestoreTask,
  softDeleteTask as dbSoftDeleteTask,
  toggleTaskDone as dbToggleTaskDone,
  updateTask as dbUpdateTask,
  type Task,
} from '@/db/tasks';
import {
  archiveRoutine as dbArchiveRoutine,
  createGroup as dbCreateGroup,
  createRoutine as dbCreateRoutine,
  deleteGroup as dbDeleteGroup,
  setCompletion as dbSetCompletion,
  updateGroup as dbUpdateGroup,
  updateRoutine as dbUpdateRoutine,
  type DeleteGroupResult,
  type Routine,
  type RoutineGroup,
} from '@/db/routines';
import {
  createObjective as dbCreateObjective,
  softDeleteObjective as dbSoftDeleteObjective,
  toggleObjectiveDone as dbToggleObjectiveDone,
  updateObjective as dbUpdateObjective,
  type Objective,
  type ObjectiveHorizon,
} from '@/db/objectives';
import {
  completionsByDayView,
  invalidateAllTasks,
  invalidateObjectives,
  invalidateRoutineCompletionsOnDay,
  invalidateRoutineStructure,
  invalidateTasksOnDay,
  objectivesView,
  tasksByDayView,
} from './views';

// One seam for "DB write + cache invalidation". Screens stop knowing
// which views need to be refreshed — they call mutate*() and the
// subscribed views update themselves.
//
// Most wrappers take a `day` because invalidation is per-day. For tasks
// that are mutated by id only (updateTask, softDelete from /task/[id]),
// the screen passes the day explicitly so we can scope the invalidation.

// --- Tasks ---

export async function createTask(params: {
  day: string;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}): Promise<Task> {
  const task = await dbCreateTask(params);
  invalidateTasksOnDay(params.day);
  return task;
}

export async function toggleTaskDone(
  id: string,
  day: string,
  done: boolean
): Promise<void> {
  // Optimistic: flip done locally so the row check feels instant.
  // The invalidation below replaces the snapshot with the DB-canonical
  // version once the write resolves — should be a no-op render.
  const current = tasksByDayView.get(day);
  if (current) {
    const now = new Date().toISOString();
    tasksByDayView.setLocal(
      day,
      current.map((t) =>
        t.id === id ? { ...t, done, doneAt: done ? now : null } : t
      )
    );
  }
  await dbToggleTaskDone(id, done);
  invalidateTasksOnDay(day);
}

export async function updateTask(
  id: string,
  day: string,
  fields: {
    title?: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
  }
): Promise<void> {
  await dbUpdateTask(id, fields);
  invalidateTasksOnDay(day);
}

export async function softDeleteTask(id: string, day: string): Promise<void> {
  // Optimistic: pull the row out of the day's list immediately so the
  // swipe-delete + tap-delete affordances finish their animation against
  // a list that already excludes the row.
  const current = tasksByDayView.get(day);
  if (current) {
    tasksByDayView.setLocal(
      day,
      current.filter((t) => t.id !== id)
    );
  }
  await dbSoftDeleteTask(id);
  invalidateTasksOnDay(day);
}

export async function restoreTask(id: string, day: string): Promise<void> {
  await dbRestoreTask(id);
  invalidateTasksOnDay(day);
}

export async function permanentlyDeleteTask(
  id: string,
  day: string
): Promise<void> {
  await dbPermanentlyDeleteTask(id);
  invalidateTasksOnDay(day);
}

// Bulk operations that don't know the target days up front (e.g. multi-
// select across an arbitrary mix of days): use this to invalidate
// everything in one call.
export async function softDeleteTasksBulk(ids: string[]): Promise<void> {
  for (const id of ids) {
    await dbSoftDeleteTask(id);
  }
  invalidateAllTasks();
}

export async function restoreTasksBulk(ids: string[]): Promise<void> {
  for (const id of ids) {
    await dbRestoreTask(id);
  }
  invalidateAllTasks();
}

// --- Routines: structure ---

export async function createGroup(
  name: string,
  color: string | null = null
): Promise<RoutineGroup> {
  const group = await dbCreateGroup(name, color);
  invalidateRoutineStructure();
  return group;
}

export async function updateGroup(
  id: string,
  fields: { name?: string; color?: string | null }
): Promise<void> {
  await dbUpdateGroup(id, fields);
  invalidateRoutineStructure();
}

export async function deleteGroup(id: string): Promise<DeleteGroupResult> {
  const result = await dbDeleteGroup(id);
  if (result.ok) invalidateRoutineStructure();
  return result;
}

export async function createRoutine(params: {
  groupId: string;
  title: string;
  icon?: string | null;
}): Promise<Routine> {
  const routine = await dbCreateRoutine(params);
  invalidateRoutineStructure();
  return routine;
}

export async function updateRoutine(
  id: string,
  fields: { title?: string; icon?: string | null; groupId?: string }
): Promise<void> {
  await dbUpdateRoutine(id, fields);
  invalidateRoutineStructure();
}

export async function archiveRoutine(id: string): Promise<void> {
  await dbArchiveRoutine(id);
  invalidateRoutineStructure();
}

// --- Routines: completions ---

// --- Objectives ---

export async function createObjective(params: {
  title: string;
  horizon: ObjectiveHorizon;
  description?: string | null;
  deadline?: string | null;
}): Promise<Objective> {
  const obj = await dbCreateObjective(params);
  invalidateObjectives();
  return obj;
}

export async function toggleObjectiveDone(
  id: string,
  done: boolean
): Promise<void> {
  // Optimistic flip on the cached snapshot — same shape as toggleTaskDone.
  const current = objectivesView.get('_');
  if (current) {
    const now = new Date().toISOString();
    const next = {
      ...current,
      short: current.short.map((o) =>
        o.id === id ? { ...o, done, doneAt: done ? now : null } : o
      ),
      medium: current.medium.map((o) =>
        o.id === id ? { ...o, done, doneAt: done ? now : null } : o
      ),
      long: current.long.map((o) =>
        o.id === id ? { ...o, done, doneAt: done ? now : null } : o
      ),
    };
    objectivesView.setLocal('_', next);
  }
  await dbToggleObjectiveDone(id, done);
  invalidateObjectives();
}

export async function updateObjective(
  id: string,
  fields: {
    title?: string;
    description?: string | null;
    horizon?: ObjectiveHorizon;
    deadline?: string | null;
  }
): Promise<void> {
  await dbUpdateObjective(id, fields);
  invalidateObjectives();
}

export async function softDeleteObjective(id: string): Promise<void> {
  // Optimistic remove from the cached snapshot so the swipe-delete
  // animation finishes against a list that already excludes the row.
  const current = objectivesView.get('_');
  if (current) {
    objectivesView.setLocal('_', {
      short: current.short.filter((o) => o.id !== id),
      medium: current.medium.filter((o) => o.id !== id),
      long: current.long.filter((o) => o.id !== id),
    });
  }
  await dbSoftDeleteObjective(id);
  invalidateObjectives();
}

export async function setCompletion(
  routineId: string,
  day: string,
  done: boolean
): Promise<void> {
  // Optimistic: flip the day's completion set so the routine row's
  // check animation runs against the new state instead of waiting on
  // SQL.
  const current = completionsByDayView.get(day);
  if (current) {
    const next = new Set(current);
    if (done) next.add(routineId);
    else next.delete(routineId);
    completionsByDayView.setLocal(day, next);
  }
  await dbSetCompletion(routineId, day, done);
  invalidateRoutineCompletionsOnDay(day);
}
