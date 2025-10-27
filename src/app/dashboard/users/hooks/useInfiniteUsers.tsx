// src/app/dashboard/users/hooks/useInfiniteUsers.tsx
// Encapsulates fetch, pagination, intersection observer, and timer logic.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchUsers, deleteUserByEmail, BackendUser } from "../api/userApi";
import { THEMES } from "../utils/themeUtils";

export type UserView = {
  id: string;
  name: string;
  theme: { name: string; color: string };
  email?: string;
};

export function useInfiniteUsers(initialLimit = 6) {
  const [users, setUsers] = useState<UserView[]>([]);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(initialLimit);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Timer for auto-refresh (controlled in container)
  const TIMER_DEFAULT = 30;
  const [secondsLeft, setSecondsLeft] = useState(TIMER_DEFAULT);
  const intervalRef = useRef<number | null>(null);

  // map backend user shape to view model
  const mapBackend = useCallback((uu: BackendUser): UserView => {
    const id = String(
      uu.id ?? uu._id ?? uu.email ?? Math.random().toString().slice(2)
    );
    const name = String(uu.name ?? uu.email ?? "Unknown");
    const color = String(uu.colorHex ?? "#c96a2b");
    const themeLabel =
      THEMES.find((t) => t.color.toLowerCase() === (color || "").toLowerCase())
        ?.label ?? "Custom";
    return {
      id,
      name,
      theme: { name: themeLabel, color },
      email: typeof uu.email === "string" ? uu.email : undefined,
    };
  }, []);

  const fetchPage = useCallback(
    async (pageOffset: number, append = false) => {
      if (!append) setLoadingInitial(true);
      else setLoadingMore(true);

      try {
        const res = await fetchUsers(limit, pageOffset);
        if (res.status === 401) {
          window.location.href = "/auth/login";
          return;
        }

        if (Array.isArray(res.data)) {
          const mapped = res.data.map((d) => mapBackend(d as BackendUser));
          if (append) {
            setUsers((prev) => {
              const existing = new Set(prev.map((p) => p.id));
              const toAdd = mapped.filter((m) => !existing.has(m.id));
              return [...prev, ...toAdd];
            });
          } else {
            setUsers(mapped);
          }
          setHasMore(mapped.length >= limit);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error("fetchPage error", err);
        setHasMore(false);
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [limit, mapBackend]
  );

  // initial
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    void fetchPage(0, false);
  }, [fetchPage]);

  // intersection observer (load more)
  // intersection observer (load more)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const scrollParent = ((): Element | null => {
      let cur: Element | null = sentinel;
      while (cur) {
        const style = window.getComputedStyle(cur);
        const overflowY = style.overflowY;
        if (overflowY === "auto" || overflowY === "scroll") return cur;
        cur = cur.parentElement;
      }
      return null;
    })();

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            hasMore &&
            !loadingMore &&
            !loadingInitial &&
            users.length >= limit
          ) {
            const nextOffset = offset + limit;
            setOffset(nextOffset);
            void fetchPage(nextOffset, true);
          }
        });
      },
      { root: scrollParent, rootMargin: "0px 0px 200px 0px", threshold: 0.1 }
    );

    obs.observe(sentinel);
    observerRef.current = obs;
    return () => {
      obs.disconnect();
      observerRef.current = null;
    };
  }, [
    sentinelRef, // ✅ depend on the ref object, not sentinelRef.current
    hasMore,
    loadingMore,
    loadingInitial,
    offset,
    users.length,
    limit,
    fetchPage,
  ]);

  // timer auto refresh
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setOffset(0);
          setHasMore(true);
          void fetchPage(0, false);
          return TIMER_DEFAULT;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchPage]);

  // manual refresh helper
  const manualRefresh = useCallback(() => {
    setSecondsLeft(TIMER_DEFAULT);
    setOffset(0);
    setHasMore(true);
    void fetchPage(0, false);
  }, [fetchPage]);

  // deletion with optimistic update + rollback
  const deleteUser = useCallback(
    async (u: UserView) => {
      const prev = users;
      setUsers((p) => p.filter((x) => x.id !== u.id));

      try {
        const emailToDelete = u.email ?? u.id;
        if (!emailToDelete || !emailToDelete.includes("@")) {
          throw new Error("User email missing — cannot delete.");
        }
        const res = await deleteUserByEmail(emailToDelete);
        if (!(res.status >= 200 && res.status < 300)) {
          setUsers(prev);
          return {
            ok: false,
            message: res.data?.message ?? "Server deletion failed",
          };
        }
        return { ok: true };
      } catch (err) {
        setUsers(prev);
        return {
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        };
      }
    },
    [users]
  );

  const themeDistribution = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    users.forEach((u) => {
      const key = u.theme.name;
      if (!map.has(key)) map.set(key, { count: 0, color: u.theme.color });
      map.get(key)!.count += 1;
    });
    return Array.from(map.entries()).map(([name, obj]) => ({
      name,
      value: obj.count,
      color: obj.color,
    }));
  }, [users]);

  return {
    users,
    fetchPage,
    deleteUser,
    sentinelRef,
    loadingInitial,
    loadingMore,
    hasMore,
    secondsLeft,
    manualRefresh,
    setSecondsLeft,
    themeDistribution,
  } as const;
}
