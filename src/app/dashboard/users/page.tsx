"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { GenericModal } from "@/components/Modal/Modal";
import axios from "axios";

/* THEMES */
const THEMES = [
  { id: "teal", label: "Teal", img: "/themeChange.webp", color: "#2f6f66" },
  { id: "light", label: "Light", img: "/themeChange.webp", color: "#c96a2b" },
  { id: "dark", label: "Dark", img: "/themeChange.webp", color: "#000000" },
];

const STORAGE_KEY = "dashboardTheme";

function hexToRgbObj(hex: string) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function luminance(r: number, g: number, b: number) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function adjustLightness(hex: string, percent: number) {
  const { r, g, b } = hexToRgbObj(hex);
  const newR = Math.min(255, Math.max(0, Math.round(r + (255 - r) * percent)));
  const newG = Math.min(255, Math.max(0, Math.round(g + (255 - g) * percent)));
  const newB = Math.min(255, Math.max(0, Math.round(b + (255 - b) * percent)));
  return (
    "#" +
    [newR, newG, newB].map((n) => n.toString(16).padStart(2, "0")).join("")
  );
}
function applyThemeVars(baseHex: string) {
  if (!baseHex || typeof document === "undefined") return;
  const { r, g, b } = hexToRgbObj(baseHex);
  const root = document.documentElement.style;
  root.setProperty("--accent", baseHex);
  root.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  root.setProperty("--accent-2", adjustLightness(baseHex, 0.35));
  root.setProperty(
    "--accent-foreground",
    luminance(r, g, b) > 0.45 ? "#111111" : "#ffffff"
  );
  root.setProperty(
    "--header-bg",
    luminance(r, g, b) > 0.45 ? adjustLightness(baseHex, -0.12) : baseHex
  );
  root.setProperty("--top-left-bg", baseHex);
  root.setProperty("--top-left-bg-2", adjustLightness(baseHex, 0.08));
}

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
const api = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 10_000,
  validateStatus: (s) => s >= 200 && s < 500,
});

api.interceptors.request.use((config) => {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") ||
          localStorage.getItem("accessToken") ||
          localStorage.getItem("token") ||
          localStorage.getItem("jwt") ||
          null
        : null;
    config.headers = config.headers ?? {};
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    else delete config.headers["Authorization"];
  } catch {
    // ignore localStorage errors
  }
  return config;
});

/* ---------- Helpers ---------- */
function findScrollParent(el?: Element | null): Element | null {
  if (!el) return null;
  let cur: Element | null = el;
  while (cur) {
    const style = window.getComputedStyle(cur);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return cur;
    cur = cur.parentElement;
  }
  return null;
}

/* Try to determine logged-in user's id/email from localStorage (best-effort) */
function getCurrentUserIdentifiers() {
  if (typeof window === "undefined")
    return { id: null as string | null, email: null as string | null };

  const keysToTry = [
    "user",
    "currentUser",
    "me",
    "profile",
    "authUser",
    "user_profile",
    "user_email",
    "email",
    "user_id",
    "id",
    "uid",
  ];

  let id: string | null = null;
  let email: string | null = null;

  for (const key of keysToTry) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
        const parsed = JSON.parse(raw);
        if (!id && (parsed.id || parsed._id || parsed.userId || parsed.uid)) {
          id = String(parsed.id ?? parsed._id ?? parsed.userId ?? parsed.uid);
        }
        if (
          !email &&
          (parsed.email || parsed.emailAddress || parsed.userEmail)
        ) {
          email = String(
            parsed.email ?? parsed.emailAddress ?? parsed.userEmail
          );
        }
      } else {
        if (!email && raw.includes("@")) email = raw;
        else if (!id) id = raw;
      }
    } catch {
      // ignore parse errors
      continue;
    }
  }

  return { id, email };
}

/* ---------- Component ---------- */
export default function UsersPage() {
  type User = {
    id: string;
    name: string;
    theme: { name: string; color: string };
    email?: string;
  };

  // data + delete modal
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<{
    id: string;
    name: string;
    email?: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // infinite scroll / paging
  const PAGE_LIMIT = 6;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // timer + auto refetch
  const TIMER_DEFAULT = 30;
  const [secondsLeft, setSecondsLeft] = useState<number>(TIMER_DEFAULT);
  const intervalRef = useRef<number | null>(null);

  // logged-in user identifiers
  const currentUser = useRef<{ id: string | null; email: string | null }>(
    getCurrentUserIdentifiers()
  );

  // theme apply
  useEffect(() => {
    try {
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (!storedId) return;
      const mapping: Record<string, string> = {
        teal: "#2f6f66",
        light: "#c96a2b",
        dark: "#000000",
      };
      const color = mapping[storedId] ?? mapping["light"];
      applyThemeVars(color);
    } catch {
      // ignore
    }
  }, []);

  /* ---------- fetch page function ---------- */
  async function fetchPage(pageOffset: number, append = false) {
    if (!append) setLoadingInitial(true);
    else setLoadingMore(true);

    try {
      const res = await api.get("/users", {
        params: { limit: PAGE_LIMIT, offset: pageOffset },
      });

      if (res.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      if (Array.isArray(res.data)) {
        const mapped = res.data.map((u: unknown) => {
          const uu = (u ?? {}) as Record<string, unknown>;
          const id = String(
            uu.id ?? uu._id ?? uu.email ?? Math.random().toString().slice(2)
          );
          const name = String(uu.name ?? uu.email ?? "Unknown");
          const color = String(uu.colorHex ?? "#c96a2b");
          const themeLabel =
            THEMES.find(
              (t) => t.color.toLowerCase() === (color || "").toLowerCase()
            )?.label ?? "Custom";
          return {
            id,
            name,
            theme: { name: themeLabel, color },
            email:
              typeof uu.email === "string" ? (uu.email as string) : undefined,
          };
        });

        if (append) {
          setUsers((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const toAppend = mapped.filter((m) => !existingIds.has(m.id));
            return [...prev, ...toAppend];
          });
        } else {
          setUsers(mapped);
        }

        if (mapped.length < PAGE_LIMIT) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        setHasMore(false);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }

  // initial load (explicitly only first 6)
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchPage(0, false);
  }, []);

  /* ---------- IntersectionObserver for infinite scroll ----------
     Only trigger load-more when there are already at least PAGE_LIMIT items rendered.
     This prevents the observer from loading the second page immediately on first render.
  */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const scrollParent = findScrollParent(sentinel) || null;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            hasMore &&
            !loadingMore &&
            !loadingInitial &&
            users.length >= PAGE_LIMIT // <-- guard to avoid immediate second fetch
          ) {
            const nextOffset = offset + PAGE_LIMIT;
            setOffset(nextOffset);
            fetchPage(nextOffset, true);
          }
        });
      },
      {
        root: scrollParent,
        rootMargin: "0px 0px 200px 0px",
        threshold: 0.1,
      }
    );

    obs.observe(sentinel);
    observerRef.current = obs;

    return () => {
      obs.disconnect();
      observerRef.current = null;
    };
    // dependencies intentionally include values used inside effect
  }, [
    sentinelRef.current,
    hasMore,
    loadingMore,
    loadingInitial,
    offset,
    users.length,
  ]);

  /* ---------- Timer for auto-refetch ---------- */
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // reset to first page and fetch fresh
          setOffset(0);
          setHasMore(true);
          fetchPage(0, false);
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
  }, []);

  function handleManualRefresh() {
    setSecondsLeft(TIMER_DEFAULT);
    setOffset(0);
    setHasMore(true);
    fetchPage(0, false);
  }

  /* ---------- Delete flow (hide delete for current user - now blank) ---------- */
  function openDeleteModal(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    setPendingUser({ id: user.id, name: user.name, email: user.email });
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!pendingUser) return;
    setDeleting(true);
    const prev = users;
    setUsers((prevList) => prevList.filter((p) => p.id !== pendingUser.id));

    try {
      const emailToDelete = pendingUser.email ?? pendingUser.id;
      if (!emailToDelete || !emailToDelete.includes("@")) {
        throw new Error("User email missing — cannot delete.");
      }

      const res = await api.delete("/users", {
        data: { email: emailToDelete },
      });
      if (res.status >= 200 && res.status < 300) {
        setModalOpen(false);
        setPendingUser(null);
      } else {
        setUsers(prev);
        alert(
          (res.data && (res.data as Record<string, unknown>).message) ??
            "Failed to delete user on server. Rolling back."
        );
      }
    } catch (err: unknown) {
      setUsers(prev);
      const msg = err instanceof Error ? err.message : String(err ?? "");
      alert(msg || "Failed to delete user on server. Rolling back.");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------- Derived data (theme distribution) ---------- */
  const themeDistribution = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    users.forEach((u) => {
      const key = u.theme.name;
      if (!map.has(key)) {
        map.set(key, { count: 0, color: u.theme.color });
      }
      map.get(key)!.count += 1;
    });

    return Array.from(map.entries()).map(([name, obj]) => ({
      name,
      value: obj.count,
      color: obj.color,
    }));
  }, [users]);

  /* ---------- Helpers for rendering decisions ---------- */
  const isCurrentUser = (u: User) => {
    const idMatch =
      currentUser.current.id && u.id && currentUser.current.id === u.id;
    const emailMatch =
      currentUser.current.email &&
      u.email &&
      currentUser.current.email === u.email;
    return Boolean(idMatch || emailMatch);
  };

  /* ---------- Inline spinner styles ---------- */
  const spinnerStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "4px solid rgba(0,0,0,0.08)",
    borderTopColor: "var(--accent)",
    animation: "rotate 0.9s linear infinite",
    margin: "10px auto",
  };

  const spinnerKeyframes = `
    @keyframes rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <div className={styles.contentContainer2}>
      {/* inject keyframes */}
      <style>{spinnerKeyframes}</style>

      <div
        className={styles.infoRow}
        style={{ marginBottom: 18, alignItems: "center" }}
      >
        <div className={styles.welcome}>User Data</div>
        <div className={styles.count}>{users.length}</div>
        <div className={styles.date}>{new Date().toLocaleDateString()}</div>

        {/* Timer + Refresh */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.04)",
              fontWeight: 700,
            }}
            title="Auto refresh timer"
          >
            <span style={{ fontSize: 13 }}>Refresh in</span>
            <span
              style={{
                minWidth: 36,
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {secondsLeft}s
            </span>
          </div>

          <button
            onClick={handleManualRefresh}
            className={styles.btnSmall}
            style={{
              background: "var(--accent)",
              boxShadow: "none",
              color: "#fff",
            }}
            title="Refetch users now"
            disabled={loadingInitial || loadingMore}
          >
            {loadingInitial ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}
      >
        <section>
          <div className={styles.themesCard}>
            <h3 className={styles.themesCard_h3}>Users</h3>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <th style={{ padding: "12px 8px" }}>Name</th>
                  <th style={{ padding: "12px 8px" }}>Theme</th>
                  <th style={{ padding: "12px 8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}
                  >
                    <td style={{ padding: "12px 8px", fontWeight: 700 }}>
                      {u.name}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 16,
                            borderRadius: 4,
                            background: u.theme.color,
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        />
                        <div style={{ fontSize: 13 }}>{u.theme.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {/* hide the action entirely for the logged-in user */}
                      {!isCurrentUser(u) ? (
                        <button
                          onClick={() => openDeleteModal(u.id)}
                          className={styles.btnSmall}
                          style={{
                            background: "#ad2f2f",
                            boxShadow: "none",
                            color: "#fff",
                          }}
                        >
                          Delete
                        </button>
                      ) : (
                        <></>
                      )}
                    </td>
                  </tr>
                ))}

                {/* show when initial loading and no items yet */}
                {loadingInitial && users.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: 12 }}>
                      Loading...
                    </td>
                  </tr>
                )}

                {/* show when not loading and no users */}
                {!loadingInitial && users.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: 12 }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* sentinel for IntersectionObserver */}
            <div ref={sentinelRef} />

            {/* spinner shown when loading MORE and there are at least PAGE_LIMIT items already */}
            {loadingMore && users.length >= PAGE_LIMIT && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: 12,
                }}
              >
                <div style={spinnerStyle} aria-hidden="true" />
                <div style={{ marginTop: 8, color: "rgba(0,0,0,0.6)" }}>
                  Loading more...
                </div>
              </div>
            )}

            {/* fallback textual loading more when small list */}
            {loadingMore && users.length < PAGE_LIMIT && (
              <div
                style={{
                  padding: 12,
                  textAlign: "center",
                  color: "rgba(0,0,0,0.6)",
                }}
              >
                Loading...
              </div>
            )}

            {/* reached end */}
            {!hasMore && !loadingInitial && (
              <div
                style={{
                  padding: 12,
                  textAlign: "center",
                  color: "rgba(0,0,0,0.6)",
                }}
              >
                You&apos;ve reached the end.
              </div>
            )}
          </div>
        </section>

        <aside>
          <div
            className={styles.themesCard}
            style={{ height: 360, overflow: "hidden" }}
          >
            <h3 className={styles.themesCard_h3}>Theme distribution</h3>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={themeDistribution}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={64}
                    innerRadius={28}
                    paddingAngle={4}
                  >
                    {themeDistribution.map((entry, idx) => (
                      <Cell key={`c-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                marginTop: 8,
                maxHeight: 84,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {themeDistribution.map((t) => (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      background: t.color,
                      borderRadius: 3,
                    }}
                  />
                  <div style={{ fontSize: 13 }}>
                    {t.name} — {t.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <GenericModal
        open={modalOpen}
        title="Delete user"
        onClose={() => {
          if (!deleting) {
            setModalOpen(false);
            setPendingUser(null);
          }
        }}
      >
        <div style={{ padding: "6px 0" }}>
          <p style={{ margin: 0, fontSize: 15 }}>
            {pendingUser
              ? `Do you want to delete ${pendingUser.name} account?`
              : "Do you want to delete this account?"}
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 18,
            }}
          >
            <button
              className={styles.btnSmall}
              onClick={() => {
                if (!deleting) {
                  setModalOpen(false);
                  setPendingUser(null);
                }
              }}
              disabled={deleting}
              style={{
                background: "transparent",
                boxShadow: "none",
                color: "var(--fg)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              Cancel
            </button>

            <button
              className={styles.btnSmall}
              onClick={confirmDelete}
              disabled={deleting}
              style={{
                background: "#ad2f2f",
                boxShadow: "none",
                color: "#fff",
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </GenericModal>
    </div>
  );
}
