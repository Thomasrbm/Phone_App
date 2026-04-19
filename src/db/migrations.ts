import type { SQLiteDatabase } from 'expo-sqlite';
import {
  ADD_TASKS_COLOR,
  ADD_TASKS_DELETED_AT,
  CREATE_TASKS_DAY_INDEX,
  CREATE_TASKS_TABLE,
} from './schema';

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
