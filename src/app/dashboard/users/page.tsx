"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { GenericModal } from "@/components/Modal/Modal";

/**
 * Users page (final)
 *
 * Important notes:
 * - **DO NOT** wrap this component in `.dmRoot` or re-render Topbar/Sidebar.
 *   The dashboard layout (layout.tsx) already provides those. This file should render
 *   only the page content (contentContainer).
 *
 * - Theme changes are controlled from the Dashboard page only. This page will **read**
 *   the stored theme (`dashboardTheme`) and **apply the same CSS vars** on mount so the
 *   look remains consistent on reload, but it **does not** allow changing the theme here.
 *
 * - Delete button opens the shared GenericModal and performs an optimistic delete.
 */

/* LocalStorage key used by Dashboard page to persist theme selection */
const STORAGE_KEY = "dashboardTheme";

const DEMO_USERS = [
  {
    id: "u_1001",
    name: "Alice Johnson",
    theme: { name: "Sunset", color: "#c96a2b" },
  },
  {
    id: "u_1002",
    name: "Bruno Lee",
    theme: { name: "Ocean", color: "#2b9fc9" },
  },
  {
    id: "u_1003",
    name: "Camila R.",
    theme: { name: "Midnight", color: "#111827" },
  },
  {
    id: "u_1004",
    name: "Diego M.",
    theme: { name: "Sunset", color: "#c96a2b" },
  },
  { id: "u_1005", name: "Eve K.", theme: { name: "Ocean", color: "#2b9fc9" } },
];

/* Theme utilities copied from dashboard page so behavior is identical */
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

export default function UsersPage() {
  const [users, setUsers] = useState(DEMO_USERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* Read the theme selected on Dashboard and apply identical vars here.
     This keeps the user page visually consistent on reload but doesn't expose
     a theme picker (dashboard remains the single source of change). */
  useEffect(() => {
    try {
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (!storedId) return;

      // Map same IDs -> colors as the dashboard THEMES array.
      // Keep this mapping in sync if you change THEMES on dashboard.
      const mapping: Record<string, string> = {
        teal: "#2f6f66",
        light: "#c96a2b",
        dark: "#000000",
      };
      const color = mapping[storedId] ?? mapping["light"];
      applyThemeVars(color);
    } catch (e) {
      // ignore localStorage errors gracefully
      console.warn("UsersPage: could not read dashboard theme", e);
    }
  }, []);

  const themeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => {
      const key = `${u.theme.name}|${u.theme.color}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([k, v]) => {
      const [name, color] = k.split("|");
      return { name, value: v, color };
    });
  }, [users]);

  function openDeleteModal(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    setPendingUser({ id: user.id, name: user.name });
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!pendingUser) return;
    setDeleting(true);

    // optimistic UI deletion
    setUsers((prev) => prev.filter((p) => p.id !== pendingUser.id));

    try {
      // TODO: wire real API call:
      // await fetch(`/api/users/${pendingUser.id}`, { method: "DELETE" });
      setModalOpen(false);
      setPendingUser(null);
    } catch (e) {
      // rollback would be implemented here
      alert("Failed to delete user on server. Rolling back.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    // NOTE: do NOT use .dmRoot here; layout.tsx provides that wrapper.
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
                        aria-label={`Delete ${u.name}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
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
                  {/* smaller donut so slices/legend stay inside the card */}
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

          {/* No accent-color picker here: theme must be changed from Dashboard only. */}
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
