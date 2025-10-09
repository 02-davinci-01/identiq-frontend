// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import ThemePreview from "@/components/Dashboard/ThemePreview";
import Topbar from "@/components/Dashboard/Topbar";
import styles from "./styles/dashboard.module.css";
import TypewriterText from "@/components/TypewriterText";

type Theme = { id: string; label: string; img: string; color: string };
const STORAGE_KEY = "dashboardTheme";

const THEMES: Theme[] = [
  { id: "random", label: "Random", img: "/themeChange.webp", color: "" },
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
function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
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
  return rgbToHex(newR, newG, newB);
}
function randomMatteColor() {
  const h = Math.floor(Math.random() * 360);
  const s = 40 + Math.floor(Math.random() * 20); // muted
  const l = 34 + Math.floor(Math.random() * 20);
  const hslToRgb = (h: number, s: number, l: number) => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4)),
    };
  };
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export default function DashboardPage() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string>("light");
  const [persistedColor, setPersistedColor] = useState<string | null>(null);

  // fetch counts (unchanged)
  useEffect(() => {
    let mounted = true;
    async function fetchCount() {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE ?? "";
        const res = await fetch(`${base}/api/users/count`, {
          cache: "no-store",
        });
        if (!mounted) return;
        if (res.ok) {
          const j = await res.json();
          setTotalUsers(typeof j.count === "number" ? j.count : null);
        } else setTotalUsers(145);
      } catch {
        if (!mounted) return;
        setTotalUsers(145);
      }
    }
    fetchCount();
    return () => {
      mounted = false;
    };
  }, []);

  // apply CSS vars function (immediate)
  function applyThemeVars(baseHex: string) {
    if (!baseHex) return;
    const root = document.documentElement.style;
    const { r, g, b } = hexToRgb(baseHex);
    root.setProperty("--accent", baseHex);
    root.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
    root.setProperty("--accent-2", adjustLightness(baseHex, 0.14));
    const fg = luminance(r, g, b) > 0.45 ? "#111111" : "#ffffff";
    root.setProperty("--accent-foreground", fg);
    root.setProperty(
      "--header-bg",
      luminance(r, g, b) > 0.45 ? adjustLightness(baseHex, -0.12) : baseHex
    );
    root.setProperty("--top-left-bg", baseHex);
    root.setProperty("--top-left-bg-2", adjustLightness(baseHex, 0.08));
  }

  // on mount: load stored theme
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) {
          setSelectedThemeId(parsed.id);
          if (parsed.color) {
            setPersistedColor(parsed.color);
            applyThemeVars(parsed.color); // immediate paint
          }
        }
      }
    } catch (e) {
      /* ignore parse errors */
    }
  }, []);

  // whenever selected changes, ensure CSS vars are set. For random, prefer persistedColor.
  useEffect(() => {
    const selectedTheme =
      THEMES.find((t) => t.id === selectedThemeId) ?? THEMES[1];
    let baseHex = selectedTheme.color || "";
    if (selectedTheme.id === "random") {
      baseHex = persistedColor || randomMatteColor();
      // if we just generated a random and nothing persisted, persist it now
      if (!persistedColor) {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ id: "random", color: baseHex })
          );
        } catch {}
        setPersistedColor(baseHex);
        setSelectedThemeId("random");
      }
    }
    if (!baseHex) {
      const root = document.documentElement.style;
      root.removeProperty("--accent");
      root.removeProperty("--accent-rgb");
      root.removeProperty("--accent-2");
      root.removeProperty("--accent-foreground");
      root.removeProperty("--header-bg");
      root.removeProperty("--top-left-bg");
      root.removeProperty("--top-left-bg-2");
      return;
    }
    applyThemeVars(baseHex);
  }, [selectedThemeId, persistedColor]);

  // central handler used by ThemePreview
  function selectTheme(id: string) {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme) return;
    let baseHex = theme.color || "";
    if (theme.id === "random") {
      baseHex = persistedColor || randomMatteColor();
    }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: theme.id, color: baseHex })
      );
    } catch {}
    setPersistedColor(baseHex);
    setSelectedThemeId(theme.id);
    applyThemeVars(baseHex);
  }

  const name = "Vedant";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const selectedTheme =
    THEMES.find((t) => t.id === selectedThemeId) ?? THEMES[1];
  // PASS the resolved/persisted color to Topbar so header paints correctly for "random"
  const accentForTopbar = persistedColor || selectedTheme.color || undefined;

  return (
    <div className={styles.dmRoot}>
      <Topbar accentColor={accentForTopbar} />
      <div className={styles.contentContainer}>
        <div className={styles.infoRow}>
          <div className={`${styles.welcome}`}>
            <TypewriterText text={`welcome ${name}`} speed={80} />
          </div>
          <div className={`${styles.count}`}>{totalUsers ?? "--"}</div>
          <div className={`${styles.date}`}>{today}</div>
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
                onSelect={(id) => selectTheme(id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
