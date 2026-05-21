// All keys are 'YYYY-MM-DD' in the phone's local timezone. Never UTC.

export function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDayKey(new Date());
}

// Parse a day key back to a Date at local midnight. Use for safe day
// arithmetic with setDate(); avoids the UTC pitfall of `new Date(key)`.
export function parseDayKey(key: string): Date {
  return new Date(key + 'T00:00:00');
}

// Inclusive on both ends. Cheap for ranges up to a few months.
export function enumerateDays(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  const cursor = parseDayKey(startKey);
  const end = parseDayKey(endKey);
  while (cursor <= end) {
    out.push(toDayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
