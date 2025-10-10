"use client";

import React, { useLayoutEffect, useState, useEffect } from "react";
import ThemePreview from "@/components/Dashboard/ThemePreview";
import Topbar from "@/components/Dashboard/Topbar";
import styles from "./styles/dashboard.module.css";
import TypewriterText from "@/components/TypewriterText";

type Theme = { id: string; label: string; img: string; color: string };
const STORAGE_KEY = "dashboardTheme";

/* Themes */
const THEMES: Theme[] = [
  { id: "teal", label: "Teal", img: "/themeChange.webp", color: "#2f6f66" },
  { id: "light", label: "Light", img: "/themeChange.webp", color: "#c96a2b" },
  { id: "dark", label: "Dark", img: "/themeChange.webp", color: "#000000" },
];

/* Color helpers */
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
   Main Component
-------------------------------------------- */
export default function DashboardPage() {
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

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

  /* Fetch user count (unrelated logic) */
  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch(`/api/users/count`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setTotalUsers(data.count || 145);
        } else setTotalUsers(145);
      } catch {
        setTotalUsers(145);
      }
    }
    fetchCount();
  }, []);

  /* Handle theme change */
  function handleThemeSelect(id: string) {
    const theme = THEMES.find((t) => t.id === id);
    if (theme) {
      applyThemeVars(theme.color);
      setSelectedThemeId(theme.id);
      try {
        localStorage.setItem(STORAGE_KEY, theme.id);
      } catch {}
    }
  }

  const name = "Vedant";
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
          <div className={styles.count}>{totalUsers ?? "--"}</div>
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
