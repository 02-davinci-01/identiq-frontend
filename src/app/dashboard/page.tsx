// page.tsx (client) — drop-in replacement
"use client";

import React, { useLayoutEffect, useState, useEffect } from "react";
import ThemePreview from "@/components/Dashboard/ThemePreview";
import Topbar from "@/components/Dashboard/Topbar";
import styles from "./styles/dashboard.module.css";
import TypewriterText from "@/components/TypewriterText";
import axios, { AxiosInstance } from "axios";
import { useRouter } from "next/navigation";

type Theme = { id: string; label: string; img: string; color: string };
const STORAGE_KEY = "dashboardTheme";

/* Themes */
const THEMES: Theme[] = [
  { id: "teal", label: "Teal", img: "/themeChange.webp", color: "#2f6f66" },
  { id: "light", label: "Light", img: "/themeChange.webp", color: "#c96a2b" },
  { id: "dark", label: "Dark", img: "/themeChange.webp", color: "#000000" },
];

/* Color helpers (unchanged) */
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

/* --------------------------------------------
   Network: axios instance (uses env)
-------------------------------------------- */
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";

const api: AxiosInstance = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 10_000,
  validateStatus: (s) => s >= 200 && s < 500, // we'll handle 401 explicitly
});

/* --------------------------------------------
   Main Component
-------------------------------------------- */
export default function DashboardPage() {
  const router = useRouter();

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [themeUpdating, setThemeUpdating] = useState<string | null>(null); // themeId being updated

  /* Apply theme BEFORE paint using useLayoutEffect */
  useLayoutEffect(() => {
    // Try to get from localStorage
    let storedId = null;
    try {
      storedId = localStorage.getItem(STORAGE_KEY);
    } catch {}

    // If missing, initialize to light theme
    if (!storedId) {
      storedId = "light";
      try {
        localStorage.setItem(STORAGE_KEY, storedId);
      } catch {}
    }

    // Find the matching theme and apply immediately
    const theme = THEMES.find((t) => t.id === storedId) ?? THEMES[1];
    applyThemeVars(theme.color);
    setSelectedThemeId(theme.id);
  }, []);

  /* Keep localStorage synced with every selection */
  useEffect(() => {
    if (!selectedThemeId) return;
    try {
      localStorage.setItem(STORAGE_KEY, selectedThemeId);
    } catch {}
  }, [selectedThemeId]);

  /* Attach request interceptor to read fresh token per request */
  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("access_token") || // login writes this
              localStorage.getItem("accessToken") ||
              localStorage.getItem("token") ||
              localStorage.getItem("jwt") ||
              localStorage.getItem("authToken")
            : null;

        config.headers = config.headers ?? {};
        if (token) config.headers["Authorization"] = `Bearer ${token}`;
        else delete config.headers["Authorization"];

        // cache bust
        config.params = { ...config.params, _t: Date.now() };
      } catch (e) {
        // ignore localStorage errors
      }
      return config;
    });

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, []);

  /* Fetch user name, user count and theme on every mount (fresh) */
  useEffect(() => {
    let mounted = true;

    async function loadFreshData() {
      setLoading(true);

      // quick check for token presence (client-side)
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token") ||
            localStorage.getItem("jwt") ||
            localStorage.getItem("authToken")
          : null;

      if (!token) {
        try {
          localStorage.removeItem("access_token");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("token");
          localStorage.removeItem("jwt");
          localStorage.removeItem("authToken");
        } catch (e) {}
        router.push("/auth/login");
        return;
      }

      try {
        // fetch me, count and theme in parallel
        const [meRes, countRes, themeRes] = await Promise.all([
          api.get("/users/me"),
          api.get("/users/count"),
          api.get("/themes/me"),
        ]);

        // handle unauthorized
        if (meRes.status === 401 || countRes.status === 401 || themeRes.status === 401) {
          try {
            localStorage.removeItem("access_token");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("token");
            localStorage.removeItem("jwt");
            localStorage.removeItem("authToken");
          } catch (e) {}
          if (mounted) router.push("/auth/login");
          return;
        }

        // process me response
        if (meRes.status >= 200 && meRes.status < 300) {
          const meData = meRes.data; // expect { name, email }
          if (mounted) setUserName(meData?.name ?? null);
        } else {
          if (mounted) setUserName(null);
        }

        // process count response
        if (countRes.status >= 200 && countRes.status < 300) {
          const countData = countRes.data;
          const parsed =
            typeof countData === "number"
              ? countData
              : Number(countData?.count ?? countData ?? 0);
          if (mounted) setTotalUsers(Number.isFinite(parsed) ? parsed : 0);
        } else {
          if (mounted) setTotalUsers(null);
        }

        // process theme response: if success apply server color and set selectedThemeId
        if (themeRes.status >= 200 && themeRes.status < 300) {
          const themeData = themeRes.data;
          // expect shape { email, themeId, label, img, colorHex } (or similar)
          const serverColor = themeData?.colorHex ?? themeData?.color ?? null;
          const serverThemeId = themeData?.themeId ?? themeData?.id ?? null;

          if (serverColor) {
            applyThemeVars(serverColor);
          }
          if (mounted && serverThemeId) {
            setSelectedThemeId(serverThemeId);
            try {
              localStorage.setItem(STORAGE_KEY, serverThemeId);
            } catch {}
          }
        } else {
          // no persisted theme — keep client default
        }
      } catch (err) {
        // network/unexpected -> clear token and redirect
        try {
          localStorage.removeItem("access_token");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("token");
          localStorage.removeItem("jwt");
          localStorage.removeItem("authToken");
        } catch (e) {}
        if (mounted) router.push("/auth/login");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadFreshData();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* Handle theme change: apply, then PATCH server; on failure revert */
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

    // optimistic apply
    applyThemeVars(theme.color);
    setSelectedThemeId(theme.id);
    try {
      localStorage.setItem(STORAGE_KEY, theme.id);
    } catch {}

    // mark updating (UI could map to a spinner if desired)
    setThemeUpdating(id);

    try {
      // call PATCH /themes with the selected themeId
      const res = await api.patch("/themes", { themeId: id });
      if (res.status >= 200 && res.status < 300) {
        // server returns canonical theme info: { ok:true, theme: { colorHex, themeId, ... } }
        const returned = res.data;
        const color = returned?.theme?.colorHex ?? returned?.colorHex ?? null;
        const serverThemeId = returned?.theme?.themeId ?? returned?.themeId ?? id;

        if (color) {
          applyThemeVars(color);
        }
        setSelectedThemeId(serverThemeId);
        try {
          localStorage.setItem(STORAGE_KEY, serverThemeId);
        } catch {}
      } else {
        // failed — revert
        console.warn("Failed to update theme on server", res.status, res.data);
        if (prevColor) applyThemeVars(prevColor);
        setSelectedThemeId(prevThemeId);
        try {
          if (prevThemeId) localStorage.setItem(STORAGE_KEY, prevThemeId);
        } catch {}
      }
    } catch (err) {
      console.warn("Network error updating theme", err);
      if (prevColor) applyThemeVars(prevColor);
      setSelectedThemeId(prevThemeId);
      try {
        if (prevThemeId) localStorage.setItem(STORAGE_KEY, prevThemeId);
      } catch {}
    } finally {
      setThemeUpdating(null);
    }
  }

  const name = userName ?? "Vedant";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className={styles.dmRoot}>
      <Topbar />
      <div className={styles.contentContainer}>
        <div className={styles.infoRow}>
          <div className={styles.welcome}>
            <TypewriterText text={`welcome ${name}`} speed={80} />
          </div>

          <div className={styles.count} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div>{totalUsers ?? "--"}</div>
            <div className={styles.countLabel}>total user</div>
          </div>

          <div className={styles.date}>{today}</div>
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
    </div>
  );
}
