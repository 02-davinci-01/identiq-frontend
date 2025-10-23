// app/dashboard/page.tsx
"use client";

import React, { useLayoutEffect, useEffect, useState } from "react";
import ThemePreview from "@/components/Dashboard/ThemePreview";
import Topbar from "@/components/Dashboard/Topbar";
import styles from "./styles/dashboard.module.css";
import TypewriterText from "@/components/TypewriterText";
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

/* Small dev debug panel that shows query states (only when NODE_ENV !== 'production') */
function DebugPanel({ data }: { data: Record<string, any> }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <aside
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
        background: "rgba(0,0,0,0.7)",
        color: "#fff",
        padding: 10,
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.2,
        maxWidth: 320,
        boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        react-query (dashboard)
      </div>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.9 }}>{k}</div>
          <div style={{ fontFamily: "monospace", fontSize: 11 }}>
            L:{String(v.isLoading)} F:{String(v.isFetching)} S:
            {String(v.isSuccess)} E:{String(v.isError)}
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              marginTop: 3,
              opacity: 0.85,
            }}
          >
            data:{" "}
            {v.data
              ? typeof v.data === "string"
                ? v.data
                : JSON.stringify(v.data).slice(0, 80) +
                  (JSON.stringify(v.data).length > 80 ? "…" : "")
              : "—"}
          </div>
        </div>
      ))}
    </aside>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [themeUpdating, setThemeUpdating] = useState<string | null>(null);

  /* spinnerVisible: starts true (to prevent snap), hides after all queries settled */
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(true);

  /* Apply theme BEFORE paint using useLayoutEffect */
  useLayoutEffect(() => {
    let storedId: string | null = null;
    try {
      storedId = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (!storedId) {
      storedId = "light";
      try {
        localStorage.setItem(STORAGE_KEY, storedId);
      } catch {}
    }
    const theme = THEMES.find((t) => t.id === storedId) ?? THEMES[1];
    applyThemeVars(theme.color);
    setSelectedThemeId(theme.id);
  }, []);

  useEffect(() => {
    if (!selectedThemeId) return;
    try {
      localStorage.setItem(STORAGE_KEY, selectedThemeId);
    } catch {}
  }, [selectedThemeId]);

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      try {
        const token = getToken();
        config.headers = config.headers ?? {};
        if (token) config.headers["Authorization"] = `Bearer ${token}`;
        else delete config.headers["Authorization"];
        config.params = { ...config.params, _t: Date.now() };
      } catch (e) {}
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, []);

  /* Use react-query to fetch me, count and theme in parallel */
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
        staleTime: 1000 * 30, // 30s
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
      },
    ],
  });

  const meQuery = results[0];
  const countQuery = results[1];
  const themeQuery = results[2];

  // If no token, immediately clear and redirect
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

  // handle auth failure from meQuery (redirect on 401)
  useEffect(() => {
    if (meQuery.isError) {
      const errAny: any = (meQuery as any).error;
      const status = errAny?.response?.status ?? errAny?.status ?? null;
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
  }, [meQuery.isError, (meQuery as any).error, router]);

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

  // apply theme from server when available
  useEffect(() => {
    if (themeQuery.isSuccess && themeQuery.data) {
      const serverColor =
        themeQuery.data?.colorHex ?? themeQuery.data?.color ?? null;
      const serverThemeId =
        themeQuery.data?.themeId ?? themeQuery.data?.id ?? null;
      if (serverColor) applyThemeVars(serverColor);
      if (serverThemeId) {
        setSelectedThemeId(serverThemeId);
        try {
          localStorage.setItem(STORAGE_KEY, serverThemeId);
        } catch {}
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
      // delay a tiny bit so UX doesn't flicker
      tid = window.setTimeout(() => setSpinnerVisible(false), 120);
    } else {
      setSpinnerVisible(true);
    }
    return () => {
      if (tid) clearTimeout(tid);
    };
  }, [allSettled]);

  /* Debug info object for the dev panel */
  const debugInfo = {
    me: {
      isLoading: meQuery.isLoading,
      isFetching: meQuery.isFetching,
      isSuccess: meQuery.isSuccess,
      isError: meQuery.isError,
      data: meQuery.data,
    },
    count: {
      isLoading: countQuery.isLoading,
      isFetching: countQuery.isFetching,
      isSuccess: countQuery.isSuccess,
      isError: countQuery.isError,
      data: countQuery.data,
    },
    theme: {
      isLoading: themeQuery.isLoading,
      isFetching: themeQuery.isFetching,
      isSuccess: themeQuery.isSuccess,
      isError: themeQuery.isError,
      data: themeQuery.data,
    },
  };

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

    // optimistic
    applyThemeVars(theme.color);
    setSelectedThemeId(theme.id);
    try {
      localStorage.setItem(STORAGE_KEY, theme.id);
    } catch {}

    setThemeUpdating(id);
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
        if (prevColor) applyThemeVars(prevColor);
        setSelectedThemeId(prevThemeId);
        try {
          if (prevThemeId) localStorage.setItem(STORAGE_KEY, prevThemeId);
        } catch {}
      }
    } catch (err) {
      if (prevColor) applyThemeVars(prevColor);
      setSelectedThemeId(prevThemeId);
      try {
        if (prevThemeId) localStorage.setItem(STORAGE_KEY, prevThemeId);
      } catch {}
    } finally {
      setThemeUpdating(null);
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

      <Topbar />
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
                img={t.img}
                selected={t.id === selectedThemeId}
                onSelect={handleThemeSelect}
              />
            ))}
          </div>
        </section>
      </div>

      <DebugPanel data={debugInfo} />
    </div>
  );
}
