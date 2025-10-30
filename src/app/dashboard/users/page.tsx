"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import { UsersTable } from "@/app/dashboard/users/components/UsersTable/UsersTable";
import ThemePanel from "@/app/dashboard/users/components/ThemePanel/ThemePanel";
import { RefreshTimer } from "./components/RefreshTimer/RefreshTimer";
import { DeleteModal } from "./components/DeleteModal/DeleteModal";
import { useInfiniteUsers, UserView } from "./hooks/useInfiniteUsers";
import { applyThemeVars } from "./utils/themeUtils";
import axios from "axios";

const STORAGE_KEY = "dashboardTheme";

/** Try to read JWT-like token from common localStorage keys for Authorization header */
function getAuthTokenFromStorage(): string | null {
  const keys = ["access_token", "accessToken", "token", "jwt", "authToken"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

/** If payload includes a hex anywhere (like "Mustard 1 #47AAD1"), extract and normalize it. */
function extractHexAnywhere(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw);
  const m = s.match(/#?([0-9A-F]{6})/i);
  if (!m) return null;
  return `#${m[1].toUpperCase()}`;
}

/* normalize a single hex candidate to #RRGGBB or null */
function normalizeHex(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^#?([0-9A-F]{6})$/i);
  if (!m) return null;
  return `#${m[1].toUpperCase()}`;
}

/* Read canonical cache written by dashboard/page.tsx — returns normalized colorHex if valid */
function readThemeCache(): {
  themeId?: string | null;
  colorHex: string;
  label?: string | null;
  updatedAt?: number;
} | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const hex = normalizeHex(parsed?.colorHex ?? parsed?.hex ?? null);
    if (!hex) return null;
    return {
      themeId: parsed?.themeId ?? null,
      colorHex: hex,
      label: parsed?.label ?? null,
      updatedAt: parsed?.updatedAt ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * SERVER fallback: Attempt to apply theme from the server (GET /themes/me).
 * This is used only when cache is absent/invalid.
 */
async function applyServerThemeFallback() {
  try {
    const token = getAuthTokenFromStorage();
    if (token) {
      try {
        const res = await axios.get("/themes/me", {
          headers: {
            Authorization: token.startsWith("Bearer")
              ? token
              : `Bearer ${token}`,
          },
          validateStatus: (s) => s >= 200 && s < 500,
        });
        if (res.status >= 200 && res.status < 300 && res.data) {
          const payload = res.data?.theme ?? res.data;
          const rawColor =
            payload?.colorHex ??
            payload?.color ??
            payload?.color_hex ??
            payload?.hex ??
            payload?.themeId ??
            null;

          const normalized = extractHexAnywhere(rawColor);
          if (normalized) {
            applyThemeVars(normalized);
            return true;
          }
        }
      } catch {
        // fall through to returning false below
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * CACHE-FIRST apply: prefer cached theme from localStorage (written by dashboard page).
 * Returns true if applied, false otherwise.
 */
function applyThemeFromCache(): boolean {
  try {
    const cached = readThemeCache();
    if (!cached) return false;
    applyThemeVars(cached.colorHex);
    return true;
  } catch {
    return false;
  }
}

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
    // themeDistribution removed because it was unused
  } = useInfiniteUsers(6);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<null | {
    id: string;
    name: string;
    email?: string;
  }>(null);
  const [deleting, setDeleting] = useState(false);

  const [userCount, setUserCount] = useState<number | null>(null);

  // NEW: themeLoading indicates we're applying theme from cache/server
  const [themeLoading, setThemeLoading] = useState<boolean>(true);

  const BACKEND_BASE =
    process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";

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
      } catch {
        console.error("Failed to fetch user count");
        setUserCount(null);
      }
    }

    fetchUserCount();
  }, [BACKEND_BASE]);

  // On mount: attempt cache-first application; if cache missing, fall back to server.
  useEffect(() => {
    let mounted = true;

    async function initTheme() {
      setThemeLoading(true);
      try {
        // 1) try cached theme
        const appliedFromCache = applyThemeFromCache();
        if (appliedFromCache) {
          // allow a tiny delay so users see a smooth transition (optional)
          if (!mounted) return;
          setThemeLoading(false);
          return;
        }

        // 2) cache missing — attempt server fallback and apply if possible
        const appliedFromServer = await applyServerThemeFallback();
        if (!mounted) return;
        setThemeLoading(false);
        return appliedFromServer;
      } catch {
        if (!mounted) return;
        setThemeLoading(false);
      }
    }

    initTheme();

    // Also listen to storage events so theme changes on the dashboard page update this page
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        // re-apply from cache when dashboard writes new value
        applyThemeFromCache();
      }
    }

    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // current user detection (unchanged)
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

    try {
      const resCount = await axios.get(`${BACKEND_BASE}/users/count`);
      if (resCount.data?.count !== undefined) setUserCount(resCount.data.count);
    } catch {
      /* silent */
    }
  }

  return (
    <div className={styles.contentContainer2} style={{ position: "relative" }}>
      {/* Theme loading spinner overlay */}
      {themeLoading && (
        <div
          aria-hidden={!themeLoading}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.6)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: "4px solid rgba(0,0,0,0.08)",
                borderTop: "4px solid rgba(0,0,0,0.6)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

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
            {/* ThemePanel now self-fetches distribution counts from /themes/distribution-counts */}
            <ThemePanel />
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
