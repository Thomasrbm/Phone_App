import type { SQLiteDatabase } from 'expo-sqlite';
import {
  ADD_TASKS_COLOR,
  CREATE_TASKS_DAY_INDEX,
  CREATE_TASKS_TABLE,
} from './schema';

type Migration = (db: SQLiteDatabase) => Promise<void>;

const migrations: Migration[] = [
  async (db) => {
    await db.execAsync(CREATE_TASKS_TABLE);
    await db.execAsync(CREATE_TASKS_DAY_INDEX);
  },
  async (db) => {
    const cols = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(tasks);`
    );
    if (!cols.some((c) => c.name === 'color')) {
      await db.execAsync(ADD_TASKS_COLOR);
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
