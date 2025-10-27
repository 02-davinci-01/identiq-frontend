// src/app/dashboard/users/components/UsersTable.tsx
// Pure presentation for the users list.

import React from "react";
import type { UserView } from "../../hooks/useInfiniteUsers";
import styles from "@/app/dashboard/styles/dashboard.module.css";

type Props = {
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
          ))}

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
