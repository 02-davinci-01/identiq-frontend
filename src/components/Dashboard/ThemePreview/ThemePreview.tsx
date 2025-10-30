// app/dashboard/components/ThemePreview.tsx
import React from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";

type StaticTheme = { id: string; label: string; img: string; color: string };
type SelectPayload = { themeId?: string; colorHex?: string };

type Props = {
  id: string;
  label: string;
  selected?: boolean;
  onSelect?: (id?: string, payload?: SelectPayload) => void;
  applyLabel?: string;
  hex?: string; // if provided, use this hex (for custom themes)
  isCustom?: boolean;
  onDelete?: () => void;
};

const STATIC: StaticTheme[] = [
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
  hex,
  isCustom = false,
  onDelete,
}: Props) {
  // Determine primary color: prefer hex prop (custom), otherwise map static id
  const rawPrimary =
    (hex ?? STATIC.find((t) => t.id === id)?.color) ||
    generateColorsFromId(id)[0];
  const primary = rawPrimary.toUpperCase();

  const swatches =
    primary.toUpperCase() === "#000000"
      ? ["#4D4D4D", "#333333", "#1A1A1A"]
      : [shadeHex(primary, 12), shadeHex(primary, -6), shadeHex(primary, -18)];

  function textColorForBg(hexStr: string) {
    try {
      const h = hexStr.replace("#", "");
      const full =
        h.length === 3
          ? h
              .split("")
              .map((c) => c + c)
              .join("")
          : h;
      const num = parseInt(full, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      const lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
      return lum > 0.5 ? "#111" : "#fff";
    } catch {
      return "#fff";
    }
  }

  const applyTextColor = textColorForBg(primary);

  const handleApplyFromButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof onSelect === "function") {
      const payload = isCustom ? { colorHex: hex } : { themeId: id };
      onSelect(id, payload);
    }
  };

  const handleApplyFromCard = () => {
    if (typeof onSelect === "function") {
      const payload = isCustom ? { colorHex: hex } : { themeId: id };
      onSelect(id, payload);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select theme ${label}`}
      className={`${styles.themePreview} ${selected ? styles.selected : ""}`}
      onClick={handleApplyFromCard}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleApplyFromCard();
        }
      }}
      style={{ cursor: "pointer" }}
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
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                {primary.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.previewActions}>
        {/* show user-provided name (label) and hex as requested */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className={styles.labelStrong} style={{ marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {primary.toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleApplyFromButton}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "none",
              background: primary,
              color: applyTextColor,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: selected ? "0 6px 14px rgba(0,0,0,0.18)" : "none",
            }}
            title={selected ? "Selected" : `Apply ${label}`}
            aria-pressed={selected}
            disabled={selected}
          >
            {selected ? "Applied" : applyLabel}
          </button>

          {isCustom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onDelete === "function") onDelete();
              }}
              title="Delete custom theme"
              style={{
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.06)",
                background: "#fff",
                color: "#e11d48",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* helpers (unchanged) */
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
