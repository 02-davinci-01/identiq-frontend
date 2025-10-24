// app/dashboard/components/ThemePreview.tsx
import React from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";

type Theme = { id: string; label: string; img: string; color: string };

/**
 * Reference themes array (replaces previous color/data).
 */
const THEMES: Theme[] = [
  { id: "teal", label: "Teal", img: "/themeChange.webp", color: "#2F6F66" },
  { id: "light", label: "Light", img: "/themeChange.webp", color: "#C96A2B" },
  { id: "dark", label: "Dark", img: "/themeChange.webp", color: "#000000" },
];

export default function ThemePreview({
  id,
  label,
  selected = false,
  onSelect,
  applyLabel = "Apply",
}: {
  id: string;
  label: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  applyLabel?: string;
}) {
  const handleClick = () => {
    if (typeof onSelect === "function") onSelect(id);
  };

  // Find theme hex from reference array
  const theme = THEMES.find((t) => t.id === id);
  const primary = theme?.color ?? generateColorsFromId(id)[0];

  // Special handling for dark theme: first swatch lighter grey, then darker, then darkest.
  const swatches =
    primary.toUpperCase() === "#000000"
      ? ["#4D4D4D", "#333333", "#1A1A1A"] // light -> darker -> darkest
      : [shadeHex(primary, 12), shadeHex(primary, -6), shadeHex(primary, -18)];

  return (
    <div
      role="button"
      aria-pressed={selected}
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className={`${styles.themePreview} ${selected ? styles.selected : ""}`}
    >
      <div
        className={styles.previewBox}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
        }}
      >
        {/* Palette card */}
        <div
          aria-hidden="true"
          style={{
            width: "100%",
            maxWidth: 320,
            borderRadius: 12,
            background: "#fff",
            boxShadow: selected
              ? "0 6px 18px rgba(0,0,0,0.18)"
              : "0 4px 10px rgba(0,0,0,0.12)",
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {/* Large swatch */}
          <div
            style={{
              background: primary,
              height: 120,
              borderRadius: "12px 12px 0 0",
            }}
          />

          <div
            style={{
              padding: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* small palette squares */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 20px)",
                gap: 6,
              }}
            >
              {swatches.map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 3,
                    background: c,
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                />
              ))}
            </div>

            {/* bold "HEX" then hex code */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: "1.1",
                  color: "#222",
                }}
              >
                <strong>HEX</strong>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#666",
                  marginTop: 4,
                }}
              >
                {primary.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.previewActions}>
        <div className={styles.labelStrong}>{label}</div>
        <button
          className={styles.btnSmall}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          disabled={selected}
          aria-disabled={selected}
          title={selected ? "Selected" : `Apply ${label}`}
        >
          {selected ? "Applied" : applyLabel}
        </button>
      </div>
    </div>
  );
}

/* -------------------------
   Helper functions
   ------------------------- */

/**
 * Deterministically generate an array of hex colors from an id (fallback).
 */
function generateColorsFromId(seed: string): string[] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const baseHue = h % 360;
  const colors = [
    baseHue,
    (baseHue + 24) % 360,
    (baseHue + 48) % 360,
    (baseHue + 72) % 360,
  ].map((hh, idx) =>
    hslToHex((hh + idx * 6) % 360, 72 - idx * 6, 62 - idx * 4)
  );
  return colors;
}

/**
 * Convert HSL to hex (inputs: h 0-360, s/l 0-100)
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(
      255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))
    );
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

/**
 * Shade a hex color lighter or darker by a percentage.
 */
function shadeHex(hex: string, percent: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;

  const amt = Math.round((percent / 100) * 255);
  r = clamp(r + amt, 0, 255);
  g = clamp(g + amt, 0, 255);
  b = clamp(b + amt, 0, 255);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, Math.round(v)));
}
