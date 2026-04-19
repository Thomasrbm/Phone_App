import type { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TASKS_TABLE, CREATE_TASKS_DAY_INDEX } from './schema';

type Migration = (db: SQLiteDatabase) => Promise<void>;

const migrations: Migration[] = [
  async (db) => {
    await db.execAsync(CREATE_TASKS_TABLE);
    await db.execAsync(CREATE_TASKS_DAY_INDEX);
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
