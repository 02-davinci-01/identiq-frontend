"use client";

import React, { useEffect, useState } from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import { UsersTable } from "./components/UsersTable/UsersTable";
import { ThemeChart } from "./components/ThemeChart/ThemeChart";
import { RetryLog } from "./components/RetryLog/RetryLog";
import { useInfiniteExperimentalUsers } from "./hooks/useInfiniteExperimentalUsers";
import { applyThemeVars } from "./utils/themeUtils";
import axios from "axios";
import { GenericModal } from "@/components/Modal/DashboardModal/DashboardModal";

/** Storage key used by page to read theme selection (keeps parity with your original code) */
const STORAGE_KEY = "dashboardTheme";
const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";

/**
 * Attempt to apply a persisted theme object (JSON saved by Dashboard).
 * If not present or invalid, fall back to previous behavior:
 *  - if stored value is "#RRGGBB" apply directly
 *  - otherwise treat as static id -> map to canonical hex
 */
function applyPersistedOrFallbackTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    // Try JSON first (dashboard persists { type, themeId?, colorHex, label })
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.colorHex) {
        const hex = String(parsed.colorHex).trim().toUpperCase();
        if (/^#([0-9A-F]{6})$/.test(hex)) {
          applyThemeVars(hex);
          return;
        }
      }
    } catch {
      // not JSON — continue to fallback parsing
    }

    // Fallback: old string formats
    const maybe = raw.trim();
    if (/^#([0-9A-F]{6})$/i.test(maybe)) {
      applyThemeVars(maybe.toUpperCase());
      return;
    }

    // treat as static id (teal/light/dark)
    const mapping: Record<string, string> = {
      teal: "#2f6f66",
      light: "#c96a2b",
      dark: "#000000",
    };
    const key = maybe.toLowerCase();
    applyThemeVars(mapping[key] ?? mapping.light);
  } catch (err) {
    // swallow errors — don't crash the page for theme issues
    // console.warn("apply theme failed", err);
  }
}

export default function ExperimentalPage() {
  // server-reported total number of users (optional, may be null while loading)
  const [userCount, setUserCount] = useState<number | null>(null);

  // fetch total user count (so hook can stop when we've loaded them all)
  useEffect(() => {
    let mounted = true;
    async function fetchUserCount() {
      try {
        const res = await axios.get(`${BACKEND_BASE}/users/count`, {
          validateStatus: (s) => s >= 200 && s < 500,
        });
        if (
          mounted &&
          res.status >= 200 &&
          res.status < 300 &&
          res.data?.count !== undefined
        ) {
          setUserCount(Number(res.data.count));
        } else if (mounted) {
          console.warn("Unexpected response from /users/count:", res.data);
          setUserCount(null);
        }
      } catch (err) {
        console.error("Failed to fetch user count:", err);
        if (mounted) setUserCount(null);
      }
    }

    fetchUserCount();
    return () => {
      mounted = false;
    };
  }, []);

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
  } = useInfiniteExperimentalUsers(4, userCount);

  // runtime-detected current user identifiers
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // modal state for delete confirmation:
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserName, setPendingUserName] = useState<string | null>(null);

  // apply persisted theme on mount and listen for changes via storage event
  useEffect(() => {
    applyPersistedOrFallbackTheme();

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        applyPersistedOrFallbackTheme();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Try to locate a candidate current-user identifier from several runtime sources.
  useEffect(() => {
    const keysToTry = [
      "currentUserId",
      "currentUserEmail",
      "userEmail",
      "email",
      "user",
    ];
    let foundId: string | null = null;
    let foundEmail: string | null = null;

    try {
      for (const k of keysToTry) {
        const val = localStorage.getItem(k);
        if (!val) continue;
        if (val.trim().startsWith("{")) {
          try {
            const obj = JSON.parse(val);
            if (obj?.id) foundId = String(obj.id);
            if (obj?.email) foundEmail = String(obj.email);
          } catch {
            // ignore parse errors
          }
        } else {
          if (val.includes("@")) foundEmail = val;
          else foundId = val;
        }
        if (foundId || foundEmail) break;
      }

      // try window global (some apps attach current user here)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (!foundId && !foundEmail && w?.__CURRENT_USER__) {
        const cu = w.__CURRENT_USER__;
        if (cu?.id) foundId = String(cu.id);
        if (cu?.email) foundEmail = String(cu.email);
      }
    } catch {
      // ignore
    }

    // Try to resolve found identifiers against loaded users
    if (users && users.length > 0) {
      if (foundEmail) {
        const match = users.find(
          (u) =>
            !!u.email && u.email.toLowerCase() === foundEmail!.toLowerCase()
        );
        if (match) {
          setCurrentUserId(match.id);
          setCurrentUserEmail(match.email ?? foundEmail);
          return;
        }
      }
      if (foundId) {
        const match = users.find((u) => u.id === foundId);
        if (match) {
          setCurrentUserId(match.id);
          setCurrentUserEmail(match.email ?? null);
          return;
        }
      }
    }

    setCurrentUserId(foundId);
    setCurrentUserEmail(foundEmail);
  }, [users]);

  // start delete flow: open modal (defensive guard prevents self-delete)
  function handleStartDelete(id: string) {
    if (currentUserId && currentUserId === id) {
      console.warn("Blocked delete flow for current user (by id).");
      return;
    }
    const candidate = users.find((u) => u.id === id);
    if (candidate && currentUserEmail && candidate.email) {
      if (candidate.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        console.warn("Blocked delete flow for current user (by email).");
        return;
      }
    }
    if (!candidate) return;
    setPendingUserId(id);
    setPendingUserName(candidate.name);
    setModalOpen(true);
  }

  // confirm delete: call hook's requestDeleteUser
  async function handleConfirmDelete() {
    if (!pendingUserId) return;
    const result = await requestDeleteUser(pendingUserId);
    if (!result.ok) {
      alert(result.message ?? "Failed to delete user");
    } else {
      setModalOpen(false);
      setPendingUserId(null);
      setPendingUserName(null);
    }
  }

  return (
    <div className={styles.contentContainer}>
      <div className={styles.infoRow} style={{ marginBottom: 18 }}>
        <div className={styles.welcome}>Experimental Users</div>
        <div className={styles.count}>{userCount ?? 0}</div>
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
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
            deleting={deleting}
          />

          {/* sentinel placeholder: attach hook's sentinelRef here */}
          <div ref={sentinelRef} style={{ height: 1 }} />

          {fetching && (
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
