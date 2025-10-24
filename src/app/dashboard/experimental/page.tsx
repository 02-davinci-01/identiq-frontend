"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { GenericModal } from "@/components/Modal/Modal";
import axios from "axios";

/* THEMES (kept the same) */
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
  } catch (e) {}
  return config;
});

// Types
type AttemptStatus = "failed" | "passed" | "error";
type AttemptLogEntry = {
  attempt: number;
  status: AttemptStatus;
  message: string;
  ts: string;
};

export default function ExperimentalPage() {
  const [users, setUsers] = useState<
    {
      id: string;
      name: string;
      theme: { name: string; color: string };
      email?: string;
    }[]
  >([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<{
    id: string;
    name: string;
    email?: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // pagination & sentinel control
  const [limit] = useState<number>(4); // page size
  const [offset, setOffset] = useState<number>(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // retry / attempt UI
  const [fetching, setFetching] = useState(false);
  const [triesCount, setTriesCount] = useState<number | null>(null);
  const [attemptLog, setAttemptLog] = useState<AttemptLogEntry[]>([]);
  const [exhausted, setExhausted] = useState(false); // no more pages

  // apply saved theme on mount so theme changes affect this page
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
    } catch (e) {}
  }, []);

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchWithRetries<T>(
    fetchFn: () => Promise<T>,
    shouldStop: (result: T) => boolean,
    options?: {
      waitMs?: number;
      maxAttempts?: number;
      jitterMs?: number;
      onAttempt?: (entry: AttemptLogEntry) => void;
    }
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
      } catch (err: any) {
        const entry: AttemptLogEntry = {
          attempt: attempts,
          status: "error",
          message: err?.message ?? "unknown error",
          ts: new Date().toISOString(),
        };
        options?.onAttempt?.(entry);

        console.error("[fetchWithRetries] attempt failed:", attempts, err);
        const extra = Math.floor(Math.random() * jitterMs);
        await delay(waitMs + extra);
      }
    }

    return { data: null, attempts: attempts };
  }

  async function loadNextPage() {
    if (fetching || exhausted) return;
    setFetching(true);
    setTriesCount(null);

    const pageOffset = offset;
    const pageLimit = limit;

    const endpoint = `/users/experimental?limit=${pageLimit}&offset=${pageOffset}`;

    const { data, attempts } = await fetchWithRetries<any[]>(
      async () => {
        const res = await api.get(endpoint);
        return res.data;
      },
      (result) => Array.isArray(result) && result.length > 0,
      {
        waitMs: 600,
        maxAttempts: 50,
        jitterMs: 400,
        onAttempt: (entry) => {
          setAttemptLog((prev) => [...prev, entry]);
        },
      }
    );

    setTriesCount(attempts);

    if (Array.isArray(data) && data.length > 0) {
      const mapped = data.map((u: any) => {
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
        };
      });

      setUsers((prev) => [...prev, ...mapped]);
      setOffset((prev) => prev + mapped.length);

      if (mapped.length < pageLimit) {
        setExhausted(true);
      }
    } else {
      console.warn(
        `[Experimental] No data for page offset ${pageOffset} after ${attempts} attempts`
      );
      setExhausted(true);
    }

    setFetching(false);
  }

  // IntersectionObserver set up
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadNextPage().catch((e) => console.error("loadNextPage error", e));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, offset, fetching, exhausted]);

  const summary = useMemo(() => {
    const s = { total: attemptLog.length, passed: 0, failed: 0, error: 0 };
    attemptLog.forEach((a) => {
      if (a.status === "passed") s.passed += 1;
      else if (a.status === "failed") s.failed += 1;
      else if (a.status === "error") s.error += 1;
    });
    return s;
  }, [attemptLog]);

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
          res.data?.message ?? "Failed to delete user on server. Rolling back."
        );
      }
    } catch (e) {
      setUsers(prev);
      alert(
        (e as any)?.message ?? "Failed to delete user on server. Rolling back."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.contentContainer}>
      <div className={styles.infoRow} style={{ marginBottom: 18 }}>
        <div className={styles.welcome}>Experimental Users</div>
        <div className={styles.count}>{users.length}</div>
        <div className={styles.date}>{new Date().toLocaleDateString()}</div>
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
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: 12 }}>
                      {fetching
                        ? "Waiting for experimental data..."
                        : "No users loaded yet. Scroll to trigger load."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* sentinel */}
            <div ref={sentinelRef} style={{ height: 1 }} />

            {/* spinner for loading more */}
            {fetching && users.length >= limit && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: 12,
                }}
              >
                <div className={styles.spinner} aria-hidden="true" />
                <div style={{ marginTop: 8, color: "rgba(0,0,0,0.6)" }}>
                  Loading more...
                </div>
              </div>
            )}

            <div style={{ padding: 12, fontSize: 13, color: "#666" }}>
              {fetching ? (
                <div>
                  Loading page at offset {offset}... (tries for this page:{" "}
                  {triesCount ?? "—"})
                </div>
              ) : exhausted ? (
                <div>No more pages (exhausted).</div>
              ) : (
                <div>Scroll to load more users.</div>
              )}
            </div>
          </div>
        </section>

        <aside>
          <div className={`${styles.themesCard} ${styles.expandableCard}`}>
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
                maxHeight: 88,
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

            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                padding: "8px 6px",
                borderTop: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 600 }}>Experimental fetch</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {fetching ? "Running..." : exhausted ? "Stopped" : "Idle"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 12 }}>
                  Total attempts: <strong>{summary.total}</strong>
                </div>
                <div style={{ fontSize: 12, color: "green" }}>
                  Passed: <strong>{summary.passed}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#b85a2a" }}>
                  Failed: <strong>{summary.failed}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#c0392b" }}>
                  Error: <strong>{summary.error}</strong>
                </div>
              </div>

              <div
                style={{ maxHeight: 240, overflowY: "auto", paddingRight: 6 }}
              >
                {attemptLog.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#666" }}>
                    No attempts yet.
                  </div>
                ) : (
                  attemptLog.map((a) => (
                    <div
                      key={`${a.attempt}-${a.ts}`}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          minWidth: 36,
                          textAlign: "center",
                          padding: "4px 6px",
                          borderRadius: 6,
                          background:
                            a.status === "passed"
                              ? "rgba(0,128,0,0.08)"
                              : a.status === "failed"
                              ? "rgba(184,90,42,0.06)"
                              : "rgba(192,57,43,0.06)",
                          color:
                            a.status === "passed"
                              ? "green"
                              : a.status === "failed"
                              ? "#b85a2a"
                              : "#c0392b",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >{`#${a.attempt}`}</div>
                      <div style={{ fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>
                          {a.status.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, color: "#555" }}>
                          {a.message} • {new Date(a.ts).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                {fetching
                  ? `Tries so far for page: ${triesCount ?? summary.total}`
                  : triesCount != null
                  ? `Last page satisfied after ${triesCount} ${
                      triesCount === 1 ? "try" : "tries"
                    }.`
                  : "No page loaded yet."}
              </div>
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
