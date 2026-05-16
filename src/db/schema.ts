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

export const CREATE_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const CREATE_ROUTINE_GROUPS_TABLE = `
CREATE TABLE IF NOT EXISTS routine_groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  archived_at TEXT
);
`;

export const CREATE_ROUTINES_TABLE = `
CREATE TABLE IF NOT EXISTS routines (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL,
  title       TEXT NOT NULL,
  color       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  archived_at TEXT
);
`;

export const CREATE_ROUTINES_GROUP_INDEX = `
CREATE INDEX IF NOT EXISTS idx_routines_group ON routines(group_id);
`;

export const CREATE_ROUTINE_COMPLETIONS_TABLE = `
CREATE TABLE IF NOT EXISTS routine_completions (
  routine_id  TEXT NOT NULL,
  day         TEXT NOT NULL,
  done_at     TEXT NOT NULL,
  PRIMARY KEY (routine_id, day)
);
`;

export const CREATE_COMPLETIONS_DAY_INDEX = `
CREATE INDEX IF NOT EXISTS idx_completions_day ON routine_completions(day);
`;

export const ADD_ROUTINE_GROUPS_COLOR = `ALTER TABLE routine_groups ADD COLUMN color TEXT;`;
export const ADD_TASKS_ICON = `ALTER TABLE tasks ADD COLUMN icon TEXT;`;
export const ADD_ROUTINES_ICON = `ALTER TABLE routines ADD COLUMN icon TEXT;`;
