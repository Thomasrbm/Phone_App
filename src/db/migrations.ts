import type { SQLiteDatabase } from 'expo-sqlite';
import {
  ADD_ROUTINES_ICON,
  ADD_ROUTINE_GROUPS_COLOR,
  ADD_TASKS_COLOR,
  ADD_TASKS_DELETED_AT,
  ADD_TASKS_ICON,
  CREATE_COMPLETIONS_DAY_INDEX,
  CREATE_OBJECTIVES_HORIZON_INDEX,
  CREATE_OBJECTIVES_TABLE,
  CREATE_ROUTINE_COMPLETIONS_TABLE,
  CREATE_ROUTINE_GROUPS_TABLE,
  CREATE_ROUTINES_GROUP_INDEX,
  CREATE_ROUTINES_TABLE,
  CREATE_SETTINGS_TABLE,
  CREATE_TASKS_DAY_INDEX,
  CREATE_TASKS_TABLE,
} from './schema';
import { uuidv4 } from '@/lib/uuid';

type Migration = (db: SQLiteDatabase) => Promise<void>;

async function hasColumn(
  db: SQLiteDatabase,
  table: string,
  column: string
): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table});`
  );
  return cols.some((c) => c.name === column);
}

const migrations: Migration[] = [
  async (db) => {
    await db.execAsync(CREATE_TASKS_TABLE);
    await db.execAsync(CREATE_TASKS_DAY_INDEX);
  },
  async (db) => {
    if (!(await hasColumn(db, 'tasks', 'color'))) {
      await db.execAsync(ADD_TASKS_COLOR);
    }
  },
  async (db) => {
    if (!(await hasColumn(db, 'tasks', 'deleted_at'))) {
      await db.execAsync(ADD_TASKS_DELETED_AT);
    }
  },
  async (db) => {
    await db.execAsync(CREATE_SETTINGS_TABLE);
  },
  async (db) => {
    await db.execAsync(CREATE_ROUTINE_GROUPS_TABLE);
    await db.execAsync(CREATE_ROUTINES_TABLE);
    await db.execAsync(CREATE_ROUTINES_GROUP_INDEX);
    await db.execAsync(CREATE_ROUTINE_COMPLETIONS_TABLE);
    await db.execAsync(CREATE_COMPLETIONS_DAY_INDEX);
    const existing = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM routine_groups'
    );
    if (!existing || existing.n === 0) {
      await db.runAsync(
        'INSERT INTO routine_groups (id, name, position, created_at) VALUES (?, ?, 0, ?)',
        uuidv4(),
        'Mes routines',
        new Date().toISOString()
      );
    }
  },
  async (db) => {
    if (!(await hasColumn(db, 'routine_groups', 'color'))) {
      await db.execAsync(ADD_ROUTINE_GROUPS_COLOR);
    }
  },
  async (db) => {
    if (!(await hasColumn(db, 'tasks', 'icon'))) {
      await db.execAsync(ADD_TASKS_ICON);
    }
    if (!(await hasColumn(db, 'routines', 'icon'))) {
      await db.execAsync(ADD_ROUTINES_ICON);
    }
  },
  async (db) => {
    await db.execAsync(CREATE_OBJECTIVES_TABLE);
    await db.execAsync(CREATE_OBJECTIVES_HORIZON_INDEX);
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);'
  );
  const row = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM _migrations'
  );
  const currentVersion = row?.version ?? 0;
  for (let i = currentVersion; i < migrations.length; i++) {
    await migrations[i](db);
    await db.runAsync(
      'INSERT INTO _migrations (version, applied_at) VALUES (?, ?)',
      i + 1,
      new Date().toISOString()
    );
  }
}
