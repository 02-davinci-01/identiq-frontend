// src/app/dashboard/users/components/UsersTable.tsx
import React from "react";
import type { UserView } from "../../hooks/useInfiniteUsers";
import styles from "@/app/dashboard/styles/dashboard.module.css";

/**
 * UsersTable: only render swatches (no theme label from the user entity).
 * Swatch color priority:
 *   user.theme.color -> user.theme.colorHex -> user.theme.hex -> fallback from name
 */

function normalizeHex(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const withHash = s.startsWith("#") ? s : `#${s}`;
  if (/^#([0-9A-F]{6})$/i.test(withHash)) return withHash.toUpperCase();
  return null;
}

/** deterministic color generator from a string (fallback when API gives no color) */
function colorFromString(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const hue = h % 360;
  return hslToHex(hue, 60, 55);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color);
  };
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

/** Return display color hex for a user.theme object */
function getThemeColor(theme: UserView["theme"]): string {
  if (!theme) return "#CCCCCC";
  const candidates = [theme.color];
  for (const c of candidates) {
    const normalized = normalizeHex(c);
    if (normalized) return normalized;
  }
  // fallback: deterministic color from user's id or name
  const seed = theme.name ?? "";
  if (seed) return colorFromString(String(seed));
  return "#CCCCCC";
}

export type Props = {
  users: UserView[];
  onOpenDelete: (id: string) => void;
  loadingInitial: boolean;
  loadingMore: boolean;
  pageLimit: number;
  isCurrentUser?: (u: UserView) => boolean;
};

export function UsersTable({
  users,
  onOpenDelete,
  loadingInitial,
  loadingMore,
  pageLimit,
  isCurrentUser,
}: Props) {
  return (
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
            {/* Theme column will only show swatch + hex */}
            <th style={{ padding: "12px 8px" }}>Swatch</th>
            <th style={{ padding: "12px 8px" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => {
            const themeColor = getThemeColor(u.theme);
            const themeHexDisplay = themeColor ?? "—";

            return (
              <tr
                key={u.id}
                style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}
              >
                <td style={{ padding: "12px 8px", fontWeight: 700 }}>
                  {u.name}
                </td>

                <td style={{ padding: "12px 8px" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 16,
                        borderRadius: 4,
                        background: themeColor,
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    />
                    <div style={{ fontSize: 13, fontFamily: "monospace" }}>
                      {themeHexDisplay}
                    </div>
                  </div>
                </td>

                <td style={{ padding: "12px 8px" }}>
                  {!isCurrentUser?.(u) ? (
                    <button
                      onClick={() => onOpenDelete(u.id)}
                      className={styles.btnSmall}
                      style={{
                        background: "#ad2f2f",
                        boxShadow: "none",
                        color: "#fff",
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}

          {loadingInitial && users.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: 12 }}>
                Loading...
              </td>
            </tr>
          )}

          {!loadingInitial && users.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: 12 }}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {loadingMore && users.length >= pageLimit && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 12,
          }}
        >
          <div className={styles.spinner} />
          <div style={{ marginTop: 8, color: "rgba(0,0,0,0.6)" }}>
            Loading more...
          </div>
        </div>
      )}
    </div>
  );
}
