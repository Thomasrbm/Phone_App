// API client for Jarvis Sync Server
// L'URL du serveur — à changer si l'IP du VPS change
const BASE_URL = 'http://46.202.171.191';

export type Task = {
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

export type RoutineGroup = {
  id: string;
  name: string;
  position: number;
  color: string | null;
  created_at: string;
  archived_at: string | null;
};

export type Routine = {
  id: string;
  group_id: string;
  title: string;
  color: string | null;
  icon: string | null;
  position: number;
  created_at: string;
  archived_at: string | null;
};

export type RoutineCompletion = {
  routine_id: string;
  day: string;
  done_at: string;
};

export type Objective = {
  id: string;
  title: string;
  description: string | null;
  horizon: 'short' | 'medium' | 'long';
  position: number;
  done: number;
  done_at: string | null;
  deleted_at: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type Setting = {
  key: string;
  value: string;
};

export type SyncData = {
  tasks?: Task[];
  groups?: RoutineGroup[];
  routines?: Routine[];
  completions?: RoutineCompletion[];
  objectives?: Objective[];
  settings?: Setting[];
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Tasks ───

export async function getTasks(day: string): Promise<Task[]> {
  const data = await request<{ tasks: Task[] }>(`/api/tasks?day=${day}`);
  return data.tasks;
}

export async function createTask(params: {
  day: string;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}): Promise<Task> {
  const data = await request<{ task: Task }>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return data.task;
}

export async function toggleTaskDone(id: string, done: boolean): Promise<Task> {
  const data = await request<{ task: Task }>(`/api/tasks/${id}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ done }),
  });
  return data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await request(`/api/tasks/${id}`, { method: 'DELETE' });
}

// ─── Routines ───

export async function getRoutineStructure(): Promise<{
  groups: RoutineGroup[];
  routinesByGroup: Record<string, Routine[]>;
}> {
  return request('/api/routines/structure');
}

// ─── Completions ───

export async function getCompletions(day: string): Promise<string[]> {
  const data = await request<{ completedIds: string[] }>(
    `/api/completions?day=${day}`
  );
  return data.completedIds;
}

// ─── Objectives ───

export async function getObjectives(): Promise<{
  short: Objective[];
  medium: Objective[];
  long: Objective[];
}> {
  const data = await request<{ objectives: { short: Objective[]; medium: Objective[]; long: Objective[] } }>(
    '/api/objectives'
  );
  return data.objectives;
}

// ─── Sync (push/pull complet) ───

/**
 * Récupère toutes les données depuis le cloud
 */
export async function pullFullSync(): Promise<SyncData> {
  return request<SyncData>('/api/sync/full');
}

/**
 * Envoie toutes les données locales vers le cloud
 */
export async function pushFullSync(data: SyncData): Promise<void> {
  await request('/api/sync/push', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Health ───

export async function checkHealth(): Promise<boolean> {
  try {
    const data = await request<{ status: string }>('/health');
    return data.status === 'ok';
  } catch {
    return false;
  }
}
