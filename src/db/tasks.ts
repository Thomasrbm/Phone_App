import { getDatabase } from './index';
import { uuidv4 } from '@/lib/uuid';

export type Task = {
  id: string;
  day: string;
  title: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  done: boolean;
  doneAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskRow = {
  id: string;
  day: string;
  title: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  done: number;
  done_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    day: row.day,
    title: row.title,
    description: row.description,
    color: row.color,
    icon: row.icon,
    done: row.done === 1,
    doneAt: row.done_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type DayCounts = { total: number; done: number };

export async function getTaskCountsInRange(
  startDay: string,
  endDay: string
): Promise<Record<string, DayCounts>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ day: string; total: number; done: number }>(
    'SELECT day, COUNT(*) AS total, SUM(done) AS done FROM tasks WHERE day >= ? AND day <= ? AND deleted_at IS NULL GROUP BY day',
    startDay,
    endDay
  );
  const result: Record<string, DayCounts> = {};
  for (const r of rows) {
    result[r.day] = { total: r.total, done: r.done };
  }
  return result;
}

export async function listTasksByDay(day: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE day = ? AND deleted_at IS NULL ORDER BY created_at ASC',
    day
  );
  return rows.map(rowToTask);
}

export async function listDeletedTasksByDay(day: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE day = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC',
    day
  );
  return rows.map(rowToTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TaskRow>(
    'SELECT * FROM tasks WHERE id = ?',
    id
  );
  return row ? rowToTask(row) : null;
}

export async function searchTasks(
  query: string,
  options: { includeDeleted?: boolean; deletedOnly?: boolean } = {}
): Promise<Task[]> {
  const db = await getDatabase();
  const trimmed = query.trim();
  let deletedFilter = 'deleted_at IS NULL';
  if (options.deletedOnly) deletedFilter = 'deleted_at IS NOT NULL';
  else if (options.includeDeleted) deletedFilter = '1 = 1';

  if (trimmed.length === 0) {
    const rows = await db.getAllAsync<TaskRow>(
      `SELECT * FROM tasks WHERE ${deletedFilter} ORDER BY updated_at DESC LIMIT 50`
    );
    return rows.map(rowToTask);
  }

  const q = `%${trimmed}%`;
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks WHERE (title LIKE ? OR description LIKE ?) AND ${deletedFilter} ORDER BY updated_at DESC LIMIT 100`,
    q,
    q
  );
  return rows.map(rowToTask);
}

export async function createTask(params: {
  day: string;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}): Promise<Task> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();
  const description = params.description ?? null;
  const color = params.color ?? null;
  const icon = params.icon ?? null;
  await db.runAsync(
    'INSERT INTO tasks (id, day, title, description, color, icon, done, done_at, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)',
    id,
    params.day,
    params.title,
    description,
    color,
    icon,
    now,
    now
  );
  return {
    id,
    day: params.day,
    title: params.title,
    description,
    color,
    icon,
    done: false,
    doneAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTask(
  id: string,
  fields: {
    title?: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
  }
): Promise<void> {
  const sets: string[] = [];
  const vals: (string | null)[] = [];
  if (fields.title !== undefined) {
    sets.push('title = ?');
    vals.push(fields.title);
  }
  if (fields.description !== undefined) {
    sets.push('description = ?');
    vals.push(fields.description);
  }
  if (fields.color !== undefined) {
    sets.push('color = ?');
    vals.push(fields.color);
  }
  if (fields.icon !== undefined) {
    sets.push('icon = ?');
    vals.push(fields.icon);
  }
  if (sets.length === 0) return;
  const db = await getDatabase();
  const now = new Date().toISOString();
  sets.push('updated_at = ?');
  vals.push(now);
  vals.push(id);
  await db.runAsync(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, ...vals);
}

export async function toggleTaskDone(id: string, done: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE tasks SET done = ?, done_at = ?, updated_at = ? WHERE id = ?',
    done ? 1 : 0,
    done ? now : null,
    now,
    id
  );
}

export async function softDeleteTask(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id
  );
}

export async function restoreTask(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?',
    now,
    id
  );
}

export async function permanentlyDeleteTask(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}
