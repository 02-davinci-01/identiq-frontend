// page.tsx (refactored container)
// Composes hooks + presentational components.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import { UsersTable } from "./components/UsersTable";
import { ThemeChart } from "./components/ThemeChart";
import { RetryLog } from "./components/RetryLog";
import { useInfiniteExperimentalUsers } from "./hooks/useInfiniteExperimentalUsers";
import { applyThemeVars, THEMES } from "./utils/themeUtils";
import { GenericModal } from "@/components/Modal/DashboardModal/DashboardModal";

/** Storage key used by page to read theme selection (keeps parity with your original code) */
const STORAGE_KEY = "dashboardTheme";

export default function ExperimentalPage() {
  const {
    users,
    sentinelRef,
    fetching,
    exhausted,
    triesCount,
    attemptLog,
    summary,
    requestDeleteUser,
    deleting,
  } = useInfiniteExperimentalUsers(4);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserName, setPendingUserName] = useState<string | null>(null);

  // apply saved theme on mount
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

  // start delete flow: open modal
  function handleStartDelete(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    setPendingUserId(id);
    setPendingUserName(user.name);
    setModalOpen(true);
  }

  // confirm delete: call hook's requestDeleteUser
  async function handleConfirmDelete() {
    if (!pendingUserId) return;
    const result = await requestDeleteUser(pendingUserId);
    if (!result.ok) {
      // use a toast utility in your app; fallback to alert for now
      alert(result.message ?? "Failed to delete user");
    } else {
      setModalOpen(false);
      setPendingUserId(null);
      setPendingUserName(null);
    }
  }

  // memoize count for display
  const userCount = useMemo(() => users.length, [users]);

  return (
    <div className={styles.contentContainer}>
      <div className={styles.infoRow} style={{ marginBottom: 18 }}>
        <div className={styles.welcome}>Experimental Users</div>
        <div className={styles.count}>{userCount}</div>
        <div className={styles.date}>{new Date().toLocaleDateString()}</div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}
      >
        <section>
          <UsersTable
            users={users}
            onStartDelete={handleStartDelete}
            fetching={fetching}
            limit={4}
          />
          {/* sentinel placeholder: the hook's sentinelRef should be attached to a DOM node visible here */}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {fetching && userCount >= 4 && (
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
                Loading page at offset ... (tries for this page:{" "}
                {triesCount ?? "—"})
              </div>
            ) : exhausted ? (
              <div>No more pages (exhausted).</div>
            ) : (
              <div>Scroll to load more users.</div>
            )}
          </div>
        </section>

        <aside>
          <div className={`${styles.themesCard} ${styles.expandableCard}`}>
            <ThemeChart users={users} />
            <RetryLog
              attemptLog={attemptLog}
              summary={summary}
              fetching={fetching}
              triesCount={triesCount}
            />
          </div>
        </aside>
      </div>

      <GenericModal
        open={modalOpen}
        title="Delete user"
        onClose={() => {
          if (!deleting) {
            setModalOpen(false);
            setPendingUserId(null);
            setPendingUserName(null);
          }
        }}
      >
        <div style={{ padding: "6px 0" }}>
          <p style={{ margin: 0, fontSize: 15 }}>
            {pendingUserName
              ? `Do you want to delete ${pendingUserName} account?`
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
                  setPendingUserId(null);
                  setPendingUserName(null);
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
              onClick={handleConfirmDelete}
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
