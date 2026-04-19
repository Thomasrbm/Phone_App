import { getDatabase } from './index';
import { uuidv4 } from '@/lib/uuid';

export type Task = {
  id: string;
  day: string;
  title: string;
  description: string | null;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskRow = {
  id: string;
  day: string;
  title: string;
  description: string | null;
  done: number;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    day: row.day,
    title: row.title,
    description: row.description,
    done: row.done === 1,
    doneAt: row.done_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTasksByDay(day: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE day = ? ORDER BY created_at ASC',
    day
  );
  return rows.map(rowToTask);
}

export async function createTask(params: {
  day: string;
  title: string;
  description?: string | null;
}): Promise<Task> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = uuidv4();
  const description = params.description ?? null;
  await db.runAsync(
    'INSERT INTO tasks (id, day, title, description, done, done_at, created_at, updated_at) VALUES (?, ?, ?, ?, 0, NULL, ?, ?)',
    id,
    params.day,
    params.title,
    description,
    now,
    now
  );
  return {
    id,
    day: params.day,
    title: params.title,
    description,
    done: false,
    doneAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTask(
  id: string,
  fields: { title?: string; description?: string | null }
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

export async function deleteTask(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}
