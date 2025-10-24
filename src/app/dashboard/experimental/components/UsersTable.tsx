// UsersTable.tsx
// Pure presentation of users list and "Delete" action.
// No inline functions in props — handlers passed by parent.

import React from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import type { UserView } from "../hooks/useInfiniteExperimentalUsers";

type Props = {
  users: UserView[];
  onStartDelete: (id: string) => void;
  fetching: boolean;
  limit: number;
};

export function UsersTable({ users, onStartDelete, fetching, limit }: Props) {
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
              <td style={{ padding: "12px 8px", fontWeight: 700 }}>{u.name}</td>
              <td style={{ padding: "12px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  onClick={() => onStartDelete(u.id)}
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
                  : `No users loaded yet. Scroll to trigger load.`}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* sentinel area is expected to be provided by parent (div ref) */}
      <div style={{ padding: 12, fontSize: 13, color: "#666" }}>
        {fetching ? (
          <div>Loading more...</div>
        ) : (
          <div>Scroll to load more users.</div>
        )}
      </div>
    </div>
  );
}
