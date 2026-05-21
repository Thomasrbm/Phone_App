import { useCallback, useEffect, useState } from 'react';
import type { RoutineGroup } from '@/db/routines';
import { getSetting, setSetting } from '@/db/settings';

const ACTIVE_GROUP_KEY = 'routines_active_group';

// Track which routine group the user last picked, persist it in SQLite
// settings, and keep it valid as the group list changes.
//
// Returns [activeGroupId, select]:
//   • activeGroupId — null until both the stored value has loaded and
//     groups has at least one entry; then either the stored id (if it
//     still maps to an existing group) or the first group as fallback.
//   • select(id) — switch to a group and persist it. Caller passes a
//     group id that is known to exist in `groups`.
//
// Persistence is fire-and-forget; the SQLite write doesn't block the UI.
export function useActiveGroupId(
  groups: RoutineGroup[]
): [string | null, (groupId: string) => void] {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSetting(ACTIVE_GROUP_KEY).then((stored) => {
      if (cancelled) return;
      setActive((prev) => prev ?? stored ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fall back to the first group when the stored value is missing or
  // points at a group that has been deleted.
  useEffect(() => {
    if (groups.length === 0) return;
    if (active && groups.some((g) => g.id === active)) return;
    setActive(groups[0].id);
  }, [groups, active]);

  const select = useCallback((groupId: string) => {
    setActive(groupId);
    setSetting(ACTIVE_GROUP_KEY, groupId);
  }, []);

  return [active, select];
}
