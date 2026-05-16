import { getDatabase } from './index';
import { uuidv4 } from '@/lib/uuid';

export type RoutineGroup = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  createdAt: string;
  archivedAt: string | null;
};

export type Routine = {
  id: string;
  groupId: string;
  title: string;
  color: string | null;
  icon: string | null;
  position: number;
  createdAt: string;
  archivedAt: string | null;
};

type GroupRow = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  created_at: string;
  archived_at: string | null;
};

type RoutineRow = {
  id: string;
  group_id: string;
  title: string;
  color: string | null;
  icon: string | null;
  position: number;
  created_at: string;
  archived_at: string | null;
};

function rowToGroup(r: GroupRow): RoutineGroup {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    position: r.position,
    createdAt: r.created_at,
    archivedAt: r.archived_at,
  };
}

function rowToRoutine(r: RoutineRow): Routine {
  return {
    id: r.id,
    groupId: r.group_id,
    title: r.title,
    color: r.color,
    icon: r.icon,
    position: r.position,
    createdAt: r.created_at,
    archivedAt: r.archived_at,
  };
}

// --- Groups ---

export async function listGroups(): Promise<RoutineGroup[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GroupRow>(
    'SELECT * FROM routine_groups WHERE archived_at IS NULL ORDER BY position ASC, created_at ASC'
  );
  return rows.map(rowToGroup);
}

export async function createGroup(
  name: string,
  color: string | null = null
): Promise<RoutineGroup> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  const max = await db.getFirstAsync<{ p: number | null }>(
    'SELECT MAX(position) AS p FROM routine_groups WHERE archived_at IS NULL'
  );
  const position = (max?.p ?? -1) + 1;
  await db.runAsync(
    'INSERT INTO routine_groups (id, name, color, position, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    name,
    color,
    position,
    now
  );
  return { id, name, color, position, createdAt: now, archivedAt: null };
}

export async function updateGroup(
  id: string,
  fields: { name?: string; color?: string | null }
): Promise<void> {
  const sets: string[] = [];
  const vals: (string | null)[] = [];
  if (fields.name !== undefined) {
    sets.push('name = ?');
    vals.push(fields.name);
  }
  if (fields.color !== undefined) {
    sets.push('color = ?');
    vals.push(fields.color);
  }
  if (sets.length === 0) return;
  const db = await getDatabase();
  vals.push(id);
  await db.runAsync(
    `UPDATE routine_groups SET ${sets.join(', ')} WHERE id = ?`,
    ...vals
  );
}

// Legacy alias — kept so existing callers don't break. Prefer updateGroup.
export async function renameGroup(id: string, name: string): Promise<void> {
  await updateGroup(id, { name });
}

export type DeleteGroupResult =
  | { ok: true }
  | { ok: false; reason: 'not_empty'; routineCount: number }
  | { ok: false; reason: 'last_group' };

export async function deleteGroup(id: string): Promise<DeleteGroupResult> {
  const db = await getDatabase();
  const remaining = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM routine_groups WHERE archived_at IS NULL AND id != ?',
    id
  );
  if (!remaining || remaining.n === 0) {
    return { ok: false, reason: 'last_group' };
  }
  const routines = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM routines WHERE group_id = ? AND archived_at IS NULL',
    id
  );
  if (routines && routines.n > 0) {
    return { ok: false, reason: 'not_empty', routineCount: routines.n };
  }
  await db.runAsync('DELETE FROM routine_groups WHERE id = ?', id);
  return { ok: true };
}

// --- Routines ---

export async function listRoutinesByGroup(groupId: string): Promise<Routine[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RoutineRow>(
    'SELECT * FROM routines WHERE group_id = ? AND archived_at IS NULL ORDER BY position ASC, created_at ASC',
    groupId
  );
  return rows.map(rowToRoutine);
}

export async function listAllRoutines(): Promise<Routine[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RoutineRow>(
    'SELECT * FROM routines WHERE archived_at IS NULL ORDER BY position ASC, created_at ASC'
  );
  return rows.map(rowToRoutine);
}

export async function getRoutineById(id: string): Promise<Routine | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<RoutineRow>(
    'SELECT * FROM routines WHERE id = ?',
    id
  );
  return row ? rowToRoutine(row) : null;
}

export async function createRoutine(params: {
  groupId: string;
  title: string;
  icon?: string | null;
}): Promise<Routine> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  const icon = params.icon ?? null;
  const max = await db.getFirstAsync<{ p: number | null }>(
    'SELECT MAX(position) AS p FROM routines WHERE group_id = ?',
    params.groupId
  );
  const position = (max?.p ?? -1) + 1;
  await db.runAsync(
    'INSERT INTO routines (id, group_id, title, icon, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    params.groupId,
    params.title,
    icon,
    position,
    now
  );
  return {
    id,
    groupId: params.groupId,
    title: params.title,
    color: null,
    icon,
    position,
    createdAt: now,
    archivedAt: null,
  };
}

export async function updateRoutine(
  id: string,
  fields: { title?: string; icon?: string | null; groupId?: string }
): Promise<void> {
  const sets: string[] = [];
  const vals: (string | null)[] = [];
  if (fields.title !== undefined) {
    sets.push('title = ?');
    vals.push(fields.title);
  }
  if (fields.icon !== undefined) {
    sets.push('icon = ?');
    vals.push(fields.icon);
  }
  if (fields.groupId !== undefined) {
    sets.push('group_id = ?');
    vals.push(fields.groupId);
  }
  if (sets.length === 0) return;
  const db = await getDatabase();
  vals.push(id);
  await db.runAsync(`UPDATE routines SET ${sets.join(', ')} WHERE id = ?`, ...vals);
}

export async function archiveRoutine(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE routines SET archived_at = ? WHERE id = ?',
    now,
    id
  );
}

// --- Completions ---

export async function getCompletionsForDay(day: string): Promise<Set<string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ routine_id: string }>(
    'SELECT routine_id FROM routine_completions WHERE day = ?',
    day
  );
  return new Set(rows.map((r) => r.routine_id));
}

export async function setCompletion(
  routineId: string,
  day: string,
  done: boolean
): Promise<void> {
  const db = await getDatabase();
  if (done) {
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO routine_completions (routine_id, day, done_at) VALUES (?, ?, ?) ON CONFLICT(routine_id, day) DO NOTHING',
      routineId,
      day,
      now
    );
  } else {
    await db.runAsync(
      'DELETE FROM routine_completions WHERE routine_id = ? AND day = ?',
      routineId,
      day
    );
  }
}

export async function getCompletionDaysForRoutine(
  routineId: string,
  startDay: string,
  endDay: string
): Promise<Set<string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ day: string }>(
    'SELECT day FROM routine_completions WHERE routine_id = ? AND day >= ? AND day <= ?',
    routineId,
    startDay,
    endDay
  );
  return new Set(rows.map((r) => r.day));
}

export type RoutineStats = {
  streak: number;
  completed30d: number;
  ratio30d: number;
};

// Streak = number of consecutive days ending today (or yesterday if today
// not done yet) where the routine was completed. Today not completed but
// yesterday completed → streak continues; today not completed AND
// yesterday not completed → streak = 0.
export async function getRoutineStats(
  routineId: string,
  today: string
): Promise<RoutineStats> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ day: string }>(
    'SELECT day FROM routine_completions WHERE routine_id = ? ORDER BY day DESC LIMIT 365',
    routineId
  );
  const days = rows.map((r) => r.day);
  const set = new Set(days);

  let streak = 0;
  const cursor = new Date(today + 'T00:00:00');
  if (!set.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const key = toLocalKey(cursor);
    if (set.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  const start = new Date(today + 'T00:00:00');
  start.setDate(start.getDate() - 29);
  const startKey = toLocalKey(start);
  let completed30d = 0;
  for (const d of days) {
    if (d >= startKey && d <= today) completed30d += 1;
  }
  return { streak, completed30d, ratio30d: completed30d / 30 };
}

export type RoutineDayCounts = { total: number; done: number };

// For each day in [startDay, endDay], how many routines existed and how
// many were completed. A routine "existed" on day D if it was created
// on/before D and not yet archived on D. We compute in JS rather than SQL
// because SQLite has no easy day-range generator. Range is expected to
// stay small (one month max) so this is cheap.
export async function getRoutineCountsInRange(
  startDay: string,
  endDay: string
): Promise<Record<string, RoutineDayCounts>> {
  const db = await getDatabase();
  const routines = await db.getAllAsync<{
    id: string;
    created_at: string;
    archived_at: string | null;
  }>('SELECT id, created_at, archived_at FROM routines');
  const completions = await db.getAllAsync<{ day: string; routine_id: string }>(
    'SELECT day, routine_id FROM routine_completions WHERE day >= ? AND day <= ?',
    startDay,
    endDay
  );

  const result: Record<string, RoutineDayCounts> = {};
  const days = enumerateDays(startDay, endDay);
  for (const day of days) {
    let total = 0;
    for (const r of routines) {
      const createdDay = r.created_at.slice(0, 10);
      if (createdDay > day) continue;
      if (r.archived_at) {
        const archivedDay = r.archived_at.slice(0, 10);
        if (archivedDay <= day) continue;
      }
      total += 1;
    }
    if (total > 0) {
      result[day] = { total, done: 0 };
    }
  }
  for (const c of completions) {
    if (!result[c.day]) {
      // Edge case: a completion exists but the routine isn't counted (e.g.
      // archived before the day). Skip so done <= total invariant holds.
      continue;
    }
    result[c.day].done += 1;
  }
  return result;
}

function enumerateDays(startDay: string, endDay: string): string[] {
  const out: string[] = [];
  const cursor = new Date(startDay + 'T00:00:00');
  const end = new Date(endDay + 'T00:00:00');
  while (cursor <= end) {
    out.push(toLocalKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function toLocalKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
