import { getDatabase } from './index';
import { uuidv4 } from '@/lib/uuid';

export type ObjectiveHorizon = 'short' | 'medium' | 'long';

export const OBJECTIVE_HORIZONS: ObjectiveHorizon[] = ['long', 'medium', 'short'];

export type Objective = {
  id: string;
  title: string;
  description: string | null;
  horizon: ObjectiveHorizon;
  position: number;
  done: boolean;
  doneAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ObjectiveRow = {
  id: string;
  title: string;
  description: string | null;
  horizon: ObjectiveHorizon;
  position: number;
  done: number;
  done_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToObjective(row: ObjectiveRow): Objective {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    horizon: row.horizon,
    position: row.position,
    done: row.done === 1,
    doneAt: row.done_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Active (non-deleted) objectives grouped by horizon. Ordered by
// position ASC then created_at ASC within each horizon — matches the
// pattern used for routines.
export type ObjectivesByHorizon = Record<ObjectiveHorizon, Objective[]>;

export async function listObjectivesByHorizon(): Promise<ObjectivesByHorizon> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ObjectiveRow>(
    'SELECT * FROM objectives WHERE deleted_at IS NULL ORDER BY position ASC, created_at ASC'
  );
  const out: ObjectivesByHorizon = { short: [], medium: [], long: [] };
  for (const r of rows) {
    out[r.horizon].push(rowToObjective(r));
  }
  return out;
}

export async function getObjectiveById(id: string): Promise<Objective | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ObjectiveRow>(
    'SELECT * FROM objectives WHERE id = ?',
    id
  );
  return row ? rowToObjective(row) : null;
}

export async function createObjective(params: {
  title: string;
  horizon: ObjectiveHorizon;
  description?: string | null;
}): Promise<Objective> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  const description = params.description ?? null;
  const max = await db.getFirstAsync<{ p: number | null }>(
    'SELECT MAX(position) AS p FROM objectives WHERE horizon = ? AND deleted_at IS NULL',
    params.horizon
  );
  const position = (max?.p ?? -1) + 1;
  await db.runAsync(
    'INSERT INTO objectives (id, title, description, horizon, position, done, done_at, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)',
    id,
    params.title,
    description,
    params.horizon,
    position,
    now,
    now
  );
  return {
    id,
    title: params.title,
    description,
    horizon: params.horizon,
    position,
    done: false,
    doneAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateObjective(
  id: string,
  fields: {
    title?: string;
    description?: string | null;
    horizon?: ObjectiveHorizon;
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
  if (fields.horizon !== undefined) {
    sets.push('horizon = ?');
    vals.push(fields.horizon);
  }
  if (sets.length === 0) return;
  const db = await getDatabase();
  const now = new Date().toISOString();
  sets.push('updated_at = ?');
  vals.push(now);
  vals.push(id);
  await db.runAsync(
    `UPDATE objectives SET ${sets.join(', ')} WHERE id = ?`,
    ...vals
  );
}

export async function toggleObjectiveDone(
  id: string,
  done: boolean
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE objectives SET done = ?, done_at = ?, updated_at = ? WHERE id = ?',
    done ? 1 : 0,
    done ? now : null,
    now,
    id
  );
}

export async function softDeleteObjective(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE objectives SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id
  );
}
