// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import ThemePreview from "@/components/Dashboard/ThemePreview/ThemePreview";
import styles from "./styles/dashboard.module.css";
import TypewriterText from "@/components/UI/TypewriterText/TypewriterText";
import { useQueries } from "@tanstack/react-query";
import { api, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

type Theme = { id: string; label: string; img: string; color: string };
const STORAGE_KEY = "dashboardTheme";

/* Themes */
const THEMES: Theme[] = [
  { id: "teal", label: "Teal", img: "/themeChange.webp", color: "#2f6f66" },
  { id: "light", label: "Light", img: "/themeChange.webp", color: "#c96a2b" },
  { id: "dark", label: "Dark", img: "/themeChange.webp", color: "#000000" },
];

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const bigint = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
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
  const { r, g, b } = hexToRgb(hex);
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
  const root = document.documentElement.style;
  const { r, g, b } = hexToRgb(baseHex);
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

/* SpinnerOverlay - minimal (thin black spinner + 'loading') */
function SpinnerOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden={!visible}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(255, 255, 255, 0.5)",
        backdropFilter: "blur(2px)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        color: "#111",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "2px solid rgba(0,0,0,0.1)",
          borderTop: "2px solid #000",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span
        style={{ marginTop: 12, fontSize: "0.9rem", letterSpacing: "0.5px" }}
      >
        loading
      </span>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  /* We now treat the DB as the single source of truth for theme.
     selectedThemeId starts null and is set by the server response. */
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(true);

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      try {
        const token = getToken();
        config.headers = config.headers ?? {};
        if (token) config.headers["Authorization"] = `Bearer ${token}`;
        else delete config.headers["Authorization"];
        config.params = { ...config.params, _t: Date.now() };
      } catch {
        // intentionally ignore errors reading token
      }
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, []);

  /* fetch me, count and theme in parallel
     THEME QUERY: no cache, always refetch on mount so DB is authoritative */
  const results = useQueries({
    queries: [
      {
        queryKey: ["me"],
        queryFn: async () => {
          const res = await api.get("/users/me", {
            headers: {
              Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
            },
          });
          return res.data?.data ?? res.data;
        },
        staleTime: 1000 * 30,
      },
      {
        queryKey: ["users", "count"],
        queryFn: async () => {
          const res = await api.get("/users/count", {
            headers: {
              Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
            },
          });
          return res.data?.count ?? res.data;
        },
      },
      {
        queryKey: ["theme", "me"],
        queryFn: async () => {
          const res = await api.get("/themes/me", {
            headers: {
              Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
            },
          });
          return res.data ?? res.data?.data;
        },
        // FORCE fresh fetch on every mount/return. No caching.
        staleTime: 0,

        refetchOnMount: "always",
        // optionally set to true if you want refetch on window focus as well
        refetchOnWindowFocus: false,
      },
    ],
  });

  const meQuery = results[0];
  const countQuery = results[1];
  const themeQuery = results[2];

  // If no token, clear and redirect
  useEffect(() => {
    const token = getToken();
    if (!token) {
      try {
        localStorage.removeItem("access_token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("jwt");
        localStorage.removeItem("authToken");
      } catch {}
      router.push("/auth/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redirect on 401 from meQuery
  const meIsError = meQuery.isError;
  const meError = meQuery.error;
  useEffect(() => {
    if (meIsError) {
      const errObj =
        (meError as
          | { response?: { status?: number }; status?: number }
          | undefined) ?? undefined;
      const status = errObj?.response?.status ?? errObj?.status ?? null;
      if (status === 401) {
        try {
          localStorage.removeItem("access_token");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("token");
          localStorage.removeItem("jwt");
          localStorage.removeItem("authToken");
        } catch {}
        router.push("/auth/login");
        return;
      }
    }
  }, [meIsError, meError, router]);

  // when count query completes, sync local state
  useEffect(() => {
    if (countQuery.isSuccess) {
      const parsed =
        typeof countQuery.data === "number"
          ? countQuery.data
          : Number(countQuery.data ?? 0);
      setTotalUsers(Number.isFinite(parsed) ? parsed : 0);
    }
  }, [countQuery.isSuccess, countQuery.data]);

  // apply theme from server when available — DB is the source of truth
  useEffect(() => {
    if (themeQuery.isSuccess && themeQuery.data) {
      const serverColor =
        themeQuery.data?.colorHex ?? themeQuery.data?.color ?? null;
      const serverThemeId =
        themeQuery.data?.themeId ?? themeQuery.data?.id ?? null;

      if (serverColor) applyThemeVars(serverColor);

      // set local selected state from server and persist (for refresh)
      if (serverThemeId) {
        setSelectedThemeId(serverThemeId);
        try {
          localStorage.setItem(STORAGE_KEY, serverThemeId);
        } catch {}
      } else {
        // If server didn't send an id but did send a color, clear selection id
        setSelectedThemeId(null);
      }
    }
  }, [themeQuery.isSuccess, themeQuery.data]);

  /* ---- consider a query settled when it is success OR error ---- */
  const meSettled = meQuery.isSuccess || meQuery.isError;
  const countSettled = countQuery.isSuccess || countQuery.isError;
  const themeSettled = themeQuery.isSuccess || themeQuery.isError;

  // overall loading: true until all queries have settled
  const allSettled = meSettled && countSettled && themeSettled;

  // hide spinner shortly after allSettled becomes true
  useEffect(() => {
    let tid: number | undefined;
    if (allSettled) {
      tid = window.setTimeout(() => setSpinnerVisible(false), 120);
    } else {
      setSpinnerVisible(true);
    }
    return () => {
      if (tid) clearTimeout(tid);
    };
  }, [allSettled]);

  async function handleThemeSelect(id: string) {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme) return;

    const prevThemeId = selectedThemeId;
    const prevColor = (() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const found = THEMES.find((t) => t.id === stored);
        return found?.color ?? null;
      } catch {
        return null;
      }
    })();

    // optimistic - apply immediately for snappy UX
    applyThemeVars(theme.color);
    setSelectedThemeId(theme.id);
    try {
      localStorage.setItem(STORAGE_KEY, theme.id);
    } catch {}

    try {
      const res = await api.patch("/themes", { themeId: id });
      if (res.status >= 200 && res.status < 300) {
        const returned = res.data;
        const color = returned?.theme?.colorHex ?? returned?.colorHex ?? null;
        const serverThemeId =
          returned?.theme?.themeId ?? returned?.themeId ?? id;
        if (color) applyThemeVars(color);
        setSelectedThemeId(serverThemeId);
        try {
          localStorage.setItem(STORAGE_KEY, serverThemeId);
        } catch {}
      } else {
        // revert to previous if server responded non-2xx
        if (prevColor) applyThemeVars(prevColor);
        setSelectedThemeId(prevThemeId);
        try {
          if (prevThemeId) localStorage.setItem(STORAGE_KEY, prevThemeId);
        } catch {}
      }
    } catch {
      // revert on network/error
      if (prevColor) applyThemeVars(prevColor);
      setSelectedThemeId(prevThemeId);
      try {
        if (prevThemeId) localStorage.setItem(STORAGE_KEY, prevThemeId);
      } catch {}
    } finally {
      // After changing theme we want the next mount to re-read from DB (DB is source of truth).
      // We set no-query-cache for theme above (cacheTime:0), so re-mount/refetch will hit DB.
    }
  }

  const name = meQuery.data?.name ?? "Vedant";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const currYear = new Date().toLocaleDateString(undefined, {
    year: "numeric",
  });

  const userTotal = (totalUsers ?? 0) > 1 ? "total users" : "total user";

  return (
    <div className={styles.dmRoot}>
      <SpinnerOverlay visible={spinnerVisible} />

      <div className={styles.contentContainer}>
        <div className={styles.infoRow}>
          <div className={styles.welcome}>
            <TypewriterText text={`welcome ${name}`} speed={80} />
          </div>

          <div
            className={styles.count}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div>{totalUsers ?? "--"}</div>
            <div className={styles.countLabel}>{userTotal}</div>
          </div>

          <div className={styles.date}>
            {today}
            <br />
            {currYear}
          </div>
        </div>

        <section className={styles.themesCard}>
          <h3 className={styles.themesCard_h3}>Themes</h3>
          <div className={styles.themesGrid}>
            {THEMES.map((t) => (
              <ThemePreview
                key={t.id}
                id={t.id}
                label={t.label}
                selected={t.id === selectedThemeId}
                onSelect={handleThemeSelect}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
