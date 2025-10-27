"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import { UsersTable } from "@/app/dashboard/users/components/UsersTable/UsersTable";
import { ThemePanel } from "@/app/dashboard/users/components/ThemePanel/ThemePanel";
import { RefreshTimer } from "./components/RefreshTimer/RefreshTimer";
import { DeleteModal } from "./components/DeleteModal/DeleteModal";
import { useInfiniteUsers, UserView } from "./hooks/useInfiniteUsers";
import { applyThemeVars } from "./utils/themeUtils";
import axios from "axios";
// removed unused import: getCurrentUserIdentifiers

const STORAGE_KEY = "dashboardTheme";

export default function UsersPageContainer() {
  const {
    users,
    sentinelRef,
    loadingInitial,
    loadingMore,
    hasMore,
    secondsLeft,
    manualRefresh,
    deleteUser,
    themeDistribution,
  } = useInfiniteUsers(6);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<null | {
    id: string;
    name: string;
    email?: string;
  }>(null);
  const [deleting, setDeleting] = useState(false);

  // added userCount state and fetch logic
  const [userCount, setUserCount] = useState<number | null>(null);

  const BACKEND_BASE =
    process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";

  // Fetch user count from /users/count
  useEffect(() => {
    async function fetchUserCount() {
      try {
        const res = await axios.get(`${BACKEND_BASE}/users/count`, {
          validateStatus: (s) => s >= 200 && s < 500,
        });
        if (
          res.status >= 200 &&
          res.status < 300 &&
          res.data?.count !== undefined
        ) {
          setUserCount(res.data.count);
        } else {
          console.warn("Unexpected response from /users/count:", res.data);
          setUserCount(null);
        }
      } catch (err) {
        console.error("Failed to fetch user count:", err);
        setUserCount(null);
      }
    }

    fetchUserCount();
  }, [BACKEND_BASE]);

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
      applyThemeVars(mapping[storedId] ?? mapping.light);
    } catch {
      /* ignore */
    }
  }, []);

  // current user detection
  const currentUser = useRef<{
    id: string | null;
    email: string | null;
  } | null>(null);
  useEffect(() => {
    try {
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
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
            const parsed = JSON.parse(raw);
            id =
              id ??
              String(
                parsed.id ?? parsed._id ?? parsed.userId ?? parsed.uid ?? null
              );
            email =
              email ??
              String(
                parsed.email ?? parsed.emailAddress ?? parsed.userEmail ?? null
              );
          } else {
            if (!email && raw.includes("@")) email = raw;
            else if (!id) id = raw;
          }
        } catch {
          continue;
        }
      }
      currentUser.current = { id, email };
    } catch {
      currentUser.current = { id: null, email: null };
    }
  }, []);

  function isCurrentUser(u: { id: string; email?: string }) {
    const idMatch = !!(
      currentUser.current?.id &&
      u.id &&
      currentUser.current.id === u.id
    );
    const emailMatch = !!(
      currentUser.current?.email &&
      u.email &&
      currentUser.current.email === u.email
    );
    return idMatch || emailMatch;
  }

  function openDeleteModal(id: string) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    setPendingUser({ id: u.id, name: u.name, email: u.email });
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!pendingUser) return;
    setDeleting(true);

    // Prefer to pass a real UserView to deleteUser. If we can find the user in the loaded list,
    // pass that object. Otherwise construct a minimal UserView fallback.
    const targetUser: UserView =
      users.find((u) => u.id === pendingUser.id) ??
      ({
        id: pendingUser.id,
        name: pendingUser.name,
        email: pendingUser.email,
        theme: { name: "Custom", color: "#c96a2b" },
      } as UserView);

    const res = await deleteUser(targetUser);
    setDeleting(false);
    setModalOpen(false);
    setPendingUser(null);

    if (!res.ok) alert(res.message ?? "Failed to delete user");

    // refresh count after deletion
    try {
      const resCount = await axios.get(`${BACKEND_BASE}/users/count`);
      if (resCount.data?.count !== undefined) setUserCount(resCount.data.count);
    } catch {
      /* silent */
    }
  }

  return (
    <div className={styles.contentContainer2}>
      <div
        className={styles.infoRow}
        style={{ marginBottom: 18, alignItems: "center" }}
      >
        <div className={styles.welcome}>User Data</div>
        <div className={styles.count}>
          {userCount !== null ? userCount : "—"}

          <p>&nbsp;{(userCount ?? 0) > 1 ? "users" : "user"}</p>
        </div>
        <div className={styles.date}>{new Date().toLocaleDateString()}</div>

        <RefreshTimer
          secondsLeft={secondsLeft}
          onManualRefresh={manualRefresh}
          disabled={loadingInitial || loadingMore}
        />
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}
      >
        <section>
          <UsersTable
            users={users}
            onOpenDelete={openDeleteModal}
            loadingInitial={loadingInitial}
            loadingMore={loadingMore}
            pageLimit={6}
            isCurrentUser={isCurrentUser}
          />
          <div ref={sentinelRef} />
          {!hasMore && !loadingInitial && (
            <div
              style={{
                padding: 12,
                textAlign: "center",
                color: "rgba(0,0,0,0.6)",
              }}
            >
              You have reached the end.
            </div>
          )}
        </section>

        <aside>
          <div className={styles.themesCard}>
            <ThemePanel data={themeDistribution} />
          </div>
        </aside>
      </div>

      <DeleteModal
        open={modalOpen}
        userName={pendingUser?.name ?? null}
        onClose={() => {
          if (!deleting) {
            setModalOpen(false);
            setPendingUser(null);
          }
        }}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}
