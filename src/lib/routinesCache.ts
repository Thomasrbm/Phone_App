import type { Routine, RoutineGroup } from '@/db/routines';

// Module-level cache so the day and routines screens render instantly on
// re-entry. Reload still runs in useFocusEffect to refresh stale data,
// but the user sees the previous state immediately instead of a flash of
// empty placeholders while ~15-30 SQLite queries finish.
type Cache = {
  groups: RoutineGroup[];
  activeGroupId: string | null;
  routinesByGroup: Record<string, Routine[]>;
};

export const routinesCache: Cache = {
  groups: [],
  activeGroupId: null,
  routinesByGroup: {},
};
