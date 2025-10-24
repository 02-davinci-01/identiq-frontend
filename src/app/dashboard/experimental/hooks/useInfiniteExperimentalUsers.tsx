// useInfiniteExperimentalUsers.tsx
// Encapsulates pagination, retries, intersection observer sentinel, and deletion logic.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { THEMES } from "../utils/themeUtils";
import {
  BackendUser,
  fetchExperimentalUsers,
  deleteUserByEmail,
} from "../api/experimentalApi";

export type UserView = {
  id: string;
  name: string;
  theme: { name: string; color: string };
  email?: string;
};

export type AttemptLogEntry = {
  attempt: number;
  status: "failed" | "passed" | "error";
  message: string;
  ts: string;
};

type FetchWithRetriesOptions = {
  waitMs?: number;
  maxAttempts?: number;
  jitterMs?: number;
  onAttempt?: (entry: AttemptLogEntry) => void;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Small in-hook retry helper. Returns data or null and attempts count. */
async function fetchWithRetries<T>(
  fetchFn: () => Promise<T>,
  shouldStop: (result: T) => boolean,
  options?: FetchWithRetriesOptions
): Promise<{ data: T | null; attempts: number }> {
  const waitMs = options?.waitMs ?? 600;
  const jitterMs = options?.jitterMs ?? 300;
  const maxAttempts = options?.maxAttempts ?? 50;

  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const result = await fetchFn();
      const ok = shouldStop(result);

      const entry: AttemptLogEntry = {
        attempt: attempts,
        status: ok ? "passed" : "failed",
        message: ok ? "received non-empty response" : "empty / not ready",
        ts: new Date().toISOString(),
      };
      options?.onAttempt?.(entry);
      if (ok) return { data: result, attempts };
      const extra = Math.floor(Math.random() * jitterMs);
      await delay(waitMs + extra);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : String(err ?? "unknown error");
      const entry: AttemptLogEntry = {
        attempt: attempts,
        status: "error",
        message: msg,
        ts: new Date().toISOString(),
      };
      options?.onAttempt?.(entry);
      const extra = Math.floor(Math.random() * jitterMs);
      await delay(waitMs + extra);
    }
  }

  return { data: null, attempts: maxAttempts };
}

export function useInfiniteExperimentalUsers(initialLimit = 4) {
  const [users, setUsers] = useState<UserView[]>([]);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(initialLimit);
  const [fetching, setFetching] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [triesCount, setTriesCount] = useState<number | null>(null);
  const [attemptLog, setAttemptLog] = useState<AttemptLogEntry[]>([]);
  const [deleting, setDeleting] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadNextPage = useCallback(async () => {
    if (fetching || exhausted) return;
    setFetching(true);
    setTriesCount(null);

    const pageOffset = offset;
    const pageLimit = limit;

    const { data, attempts } = await fetchWithRetries<BackendUser[]>(
      async () => {
        return await fetchExperimentalUsers(pageLimit, pageOffset);
      },
      (result) => Array.isArray(result) && result.length > 0,
      {
        waitMs: 600,
        maxAttempts: 50,
        jitterMs: 400,
        onAttempt: (entry) => setAttemptLog((p) => [...p, entry]),
      }
    );

    setTriesCount(attempts);

    if (Array.isArray(data) && data.length > 0) {
      const mapped = data.map((u) => {
        const id = u.id ?? u._id ?? u.email ?? String(Math.random()).slice(2);
        const name = u.name ?? u.email ?? "Unknown";
        const color = u.colorHex ?? "#c96a2b";
        const themeLabel =
          THEMES.find((t) => t.color.toLowerCase() === color.toLowerCase())
            ?.label ?? "Custom";
        return {
          id,
          name,
          theme: { name: themeLabel, color },
          email: u.email,
        } as UserView;
      });

      setUsers((prev) => [...prev, ...mapped]);
      setOffset((prev) => prev + mapped.length);

      if (mapped.length < pageLimit) setExhausted(true);
    } else {
      setExhausted(true);
    }

    setFetching(false);
  }, [fetching, exhausted, offset, limit]);

  // intersection observer set up (observes sentinelRef)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void loadNextPage();
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.25 }
    );

    observerRef.current.observe(sentinel);
    return () => {
      if (observerRef.current && sentinel)
        observerRef.current.unobserve(sentinel);
      observerRef.current = null;
    };
  }, [loadNextPage]);

  // memoized summary object for the UI
  const summary = useMemo(() => {
    const s = { total: attemptLog.length, passed: 0, failed: 0, error: 0 };
    attemptLog.forEach((a) => {
      if (a.status === "passed") s.passed += 1;
      else if (a.status === "failed") s.failed += 1;
      else s.error += 1;
    });
    return s;
  }, [attemptLog]);

  // deletion with optimistic update and rollback
  const requestDeleteUser = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return { ok: false, message: "User not found" };
      if (!user.email || !user.email.includes("@"))
        return { ok: false, message: "User email missing — cannot delete." };

      setDeleting(true);
      const prev = users;
      setUsers((prevList) => prevList.filter((p) => p.id !== userId));

      try {
        const res = await deleteUserByEmail(user.email);
        if (res.status >= 200 && res.status < 300) {
          return { ok: true };
        } else {
          setUsers(prev);
          return {
            ok: false,
            message: res.data?.message ?? "Failed to delete on server",
          };
        }
      } catch (err: unknown) {
        setUsers(prev);
        const msg = err instanceof Error ? err.message : String(err ?? "");
        return { ok: false, message: msg || "Failed to delete on server" };
      } finally {
        setDeleting(false);
      }
    },
    [users]
  );

  return {
    users,
    sentinelRef,
    fetching,
    exhausted,
    triesCount,
    attemptLog,
    summary,
    loadNextPage,
    requestDeleteUser,
    deleting,
  };
}
