export const CREATE_TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  day          TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  color        TEXT,
  done         INTEGER NOT NULL DEFAULT 0,
  done_at      TEXT,
  deleted_at   TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
`;

export const CREATE_TASKS_DAY_INDEX = `
CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(day);
`;

export const ADD_TASKS_COLOR = `ALTER TABLE tasks ADD COLUMN color TEXT;`;
export const ADD_TASKS_DELETED_AT = `ALTER TABLE tasks ADD COLUMN deleted_at TEXT;`;
