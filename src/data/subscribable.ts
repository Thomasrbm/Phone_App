import { useCallback, useEffect, useSyncExternalStore } from 'react';

// Keyed view primitive: a single seam owning the cache + load + subscribe
// + invalidation rules for one kind of derived data. Consumers don't see
// the cache; they call `useView(key, defaultValue)` and get a live value
// that re-renders when invalidation fires.
//
// What lives behind the seam:
//   • A per-key value cache, populated by the loader.
//   • A per-key listener set, used by useSyncExternalStore.
//   • An in-flight promise dedupe map so concurrent callers share a fetch.
//   • A "keys ever seen" map so invalidate() can re-fetch with the
//     original (typed) key, not just its string form.
//
// What's intentionally out of scope:
//   • TTL / stale-while-revalidate. Invalidation is explicit; callers
//     decide when to mark stale.
//   • Cross-view invalidation. If a mutation affects two views, the
//     caller invalidates both. Coordination lives in mutations.ts.

type Listener = () => void;

export type KeyedView<TKey, TValue> = {
  // Trigger a load (deduped if one is in flight for this key). Subscribers
  // get notified when it resolves.
  load: (key: TKey) => Promise<void>;
  // Synchronous read of the current cached value. Returns undefined if
  // never loaded.
  get: (key: TKey) => TValue | undefined;
  // Set the cached value without going through the loader. Used for
  // optimistic updates from mutations.ts.
  setLocal: (key: TKey, value: TValue) => void;
  // Drop the cached value for `key`. Subscribers will see the default
  // until a load completes.
  clear: (key: TKey) => void;
  // Re-fetch all keys that pass `filter`. Subscribed keys are reloaded;
  // unsubscribed keys are just evicted. If `filter` is omitted, applies
  // to every key the view has ever seen.
  invalidate: (filter?: (key: TKey) => boolean) => void;
  // React hook that subscribes to `key`, kicks off a load if not yet
  // cached, and returns the current value (or `defaultValue` until the
  // first load resolves). `defaultValue` MUST be a stable reference
  // across renders — pass a module-level constant, not an inline literal.
  useView: (key: TKey, defaultValue: TValue) => TValue;
};

export function createKeyedView<TKey, TValue>(
  loader: (key: TKey) => Promise<TValue>,
  keyToString: (k: TKey) => string = (k) => String(k)
): KeyedView<TKey, TValue> {
  const values = new Map<string, TValue>();
  const listeners = new Map<string, Set<Listener>>();
  const inflight = new Map<string, Promise<void>>();
  const keys = new Map<string, TKey>();

  function notify(k: string) {
    listeners.get(k)?.forEach((l) => l());
  }

  function load(key: TKey): Promise<void> {
    const k = keyToString(key);
    const existing = inflight.get(k);
    if (existing) return existing;
    keys.set(k, key);
    const p = loader(key).then((v) => {
      values.set(k, v);
      inflight.delete(k);
      notify(k);
    });
    inflight.set(k, p);
    return p;
  }

  function get(key: TKey): TValue | undefined {
    return values.get(keyToString(key));
  }

  function setLocal(key: TKey, value: TValue): void {
    const k = keyToString(key);
    keys.set(k, key);
    values.set(k, value);
    notify(k);
  }

  function clear(key: TKey): void {
    const k = keyToString(key);
    values.delete(k);
    notify(k);
  }

  function subscribe(key: TKey, listener: Listener): () => void {
    const k = keyToString(key);
    let set = listeners.get(k);
    if (!set) {
      set = new Set();
      listeners.set(k, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) listeners.delete(k);
    };
  }

  function invalidate(filter?: (key: TKey) => boolean): void {
    const test = filter ?? (() => true);
    for (const [k, originalKey] of Array.from(keys.entries())) {
      if (!test(originalKey)) continue;
      if (listeners.has(k)) {
        load(originalKey);
      } else {
        values.delete(k);
        keys.delete(k);
      }
    }
  }

  function useView(key: TKey, defaultValue: TValue): TValue {
    const k = keyToString(key);
    const snapshot = useCallback(() => {
      const v = values.get(k);
      return v === undefined ? defaultValue : v;
    }, [k, defaultValue]);
    const sub = useCallback(
      (listener: Listener) => subscribe(key, listener),
      // keyToString is stable; depending on `k` (string) is enough — `key`
      // identity may change across renders even when the logical key
      // hasn't (e.g. range objects rebuilt every render).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [k]
    );
    const value = useSyncExternalStore(sub, snapshot);
    useEffect(() => {
      if (!values.has(k)) load(key);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [k]);
    return value;
  }

  return { load, get, setLocal, clear, invalidate, useView };
}
