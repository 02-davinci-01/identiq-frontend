"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { GenericModal } from "@/components/Modal/Modal";
import axios from "axios";

/* Same THEMES array for reference */
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

export default function UsersPage() {
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
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let mounted = true;
    async function loadUsers() {
      setLoading(true);
      try {
        const res = await api.get("/users");
        if (res.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        if (res.status >= 200 && res.status < 300) {
          const payload = res.data;
          if (Array.isArray(payload)) {
            const mapped = payload.map((u: any) => {
              const id =
                u.id ?? u._id ?? u.email ?? String(Math.random()).slice(2);
              const name = u.name ?? u.email ?? "Unknown";
              const color = u.colorHex ?? "#c96a2b";

              // Determine theme label from color
              const themeLabel =
                THEMES.find(
                  (t) => t.color.toLowerCase() === color.toLowerCase()
                )?.label ?? "Custom";

              return {
                id,
                name,
                theme: { name: themeLabel, color },
                email: u.email,
              };
            });
            if (mounted) setUsers(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

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
        <div className={styles.welcome}>User Data</div>
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
                {loading && users.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: 12 }}>
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: 12 }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
