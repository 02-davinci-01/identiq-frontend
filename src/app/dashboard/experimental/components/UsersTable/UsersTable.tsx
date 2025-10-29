// UsersTable.tsx
// Pure presentation of users list and "Delete" action.
// Handlers are passed by parent. This component will NOT show a Delete button
// for the currently logged-in user (identified by id OR email).

import React from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import type { UserView } from "../../hooks/useInfiniteExperimentalUsers";

type Props = {
  users: UserView[];
  onStartDelete: (id: string) => void;
  fetching: boolean;
  // removed: limit (unused)
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  deleting?: boolean; // optional visual state from parent
};

export function UsersTable({
  users,
  onStartDelete,
  fetching,
  currentUserId = null,
  currentUserEmail = null,
  deleting = false,
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
          {users.map((u) => {
            const isSelf =
              (currentUserId && currentUserId === u.id) ||
              (currentUserEmail &&
                u.email &&
                u.email.toLowerCase() === currentUserEmail.toLowerCase());

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
                        background: u.theme.color,
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    />
                    <div style={{ fontSize: 13 }}>{u.theme.color}</div>
                  </div>
                </td>
                <td style={{ padding: "12px 8px" }}>
                  {isSelf ? (
                    <button
                      className={styles.btnSmall}
                      title="This is your account"
                      aria-disabled
                      style={{
                        background: "#f0f0f0",
                        color: "#666",
                        boxShadow: "none",
                        cursor: "default",
                      }}
                      onClick={(e) => e.preventDefault()}
                    >
                      You
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartDelete(u.id)}
                      className={styles.btnSmall}
                      style={{
                        background: "#ad2f2f",
                        boxShadow: "none",
                        color: "#fff",
                      }}
                      disabled={deleting}
                      aria-label={`Delete user ${u.name}`}
                      title="Delete user"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}

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

export default UsersTable;
