// ThemePanel.tsx
import React, { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import axios from "axios";

type DistRow = { name: string; value: number; color: string; hexUsed: string };

/** Normalize a full-string hex like "#AABBCC" (case-insensitive) */
function normalizeHexFull(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^#([0-9A-F]{6})$/i.test(s)) return s.toUpperCase();
  return null;
}

/**
 * Extract the first 6-digit hex anywhere in the input (with or without leading #),
 * then normalize to uppercase with leading '#'.
 */
function extractHexAnywhere(raw?: string | null): string | null {
  if (!raw) return null;
  const m = String(raw).match(/#?([0-9A-F]{6})/i);
  if (!m) return null;
  return `#${m[1].toUpperCase()}`;
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color);
  };
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

function colorFromString(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const hue = h % 360;
  return hslToHex(hue, 60, 55);
}

function humanLabelFromId(id?: string | null) {
  if (!id) return "Unknown";
  const noHash = String(id).replace(/^#/, "");
  if (/^[0-9A-F]{6}$/i.test(noHash)) return `#${noHash.toUpperCase()}`;
  return String(id)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getAuthHeader(): Record<string, string> {
  const keys = ["access_token", "accessToken", "token", "jwt", "authToken"];
  try {
    for (const k of keys) {
      const v = typeof window !== "undefined" ? localStorage.getItem(k) : null;
      if (v)
        return { Authorization: v.startsWith("Bearer") ? v : `Bearer ${v}` };
    }
  } catch {
    // ignore localStorage read errors
  }
  return {};
}

function getBackendBase(): string {
  const envBase =
    (process.env.NEXT_PUBLIC_API_URL as string | undefined) ??
    // safely get window-injected var if available
    (typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>).__NEXT_PUBLIC_API_URL__
      : undefined);
  if (typeof envBase === "string" && envBase.length > 0)
    return envBase.replace(/\/$/, "");
  return typeof window !== "undefined" ? window.location.origin : "";
}

/* safe error extractor for catch (err: unknown) */
function extractErrorMessage(err: unknown): string {
  if (err === null || err === undefined) return "Unknown error";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const resp = e.response as Record<string, unknown> | undefined;
    if (resp && resp.data) {
      const data = resp.data as Record<string, unknown>;
      if (typeof data.message === "string") return data.message;
      try {
        return JSON.stringify(data);
      } catch {
        // fallthrough
      }
    }
    if (typeof e.message === "string") return e.message;
    try {
      return JSON.stringify(e);
    } catch {
      return "Unknown error";
    }
  }
  return String(err);
}

/**
 * ThemePanel
 * - Prefer new service shape: { ok: true, items: [{ label, count, colorHex }] }
 * - Backwards compatible with older shapes (counts object / arrays).
 * - Ensures each category uses a single colorHex (normalized) if available, otherwise generates one.
 */
export default function ThemePanel() {
  const [data, setData] = useState<DistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchCounts() {
      setLoading(true);
      setError(null);

      const base = getBackendBase();
      const tryPaths = [
        "/themes/distribution-counts",
        "/themes/distribution-counts/",
        "/themes/distribution-meta",
        "/themes/distribution",
      ];
      const tryUrls = tryPaths.map((p) => `${base}${p}`);

      const headers = getAuthHeader();

      for (const url of tryUrls) {
        try {
          const res = await axios.get<unknown>(url, {
            headers,
            validateStatus: (s) => s >= 200 && s < 500,
            timeout: 8000,
          });

          if (!mounted) return;
          if (res.status < 200 || res.status >= 300) continue;

          const payload = res.data as unknown;
          // debug left intentionally to help in case of unexpected shapes

          console.debug("[ThemePanel] response from", url, res.status, payload);

          // --- 1) NEW canonical shape: { ok: true, items: [{ label, count, colorHex }] } ---
          if (
            payload &&
            typeof payload === "object" &&
            (payload as Record<string, unknown>).ok === true &&
            Array.isArray((payload as Record<string, unknown>).items)
          ) {
            const itemsRaw = (payload as Record<string, unknown>)
              .items as unknown[];
            const items = itemsRaw.map((it) => {
              const obj = (it ?? {}) as Record<string, unknown>;
              const rawLabel = obj.label ?? obj.themeId ?? "Unknown";
              const name = humanLabelFromId(String(rawLabel));
              const count = Number(obj.count ?? obj.value ?? 0);
              const explicitHex =
                extractHexAnywhere(
                  (obj.colorHex ?? obj.color ?? obj.hex) as string | null
                ) ??
                normalizeHexFull(
                  (obj.colorHex ?? obj.color ?? obj.hex) as string | null
                );
              const hexUsed = explicitHex ?? colorFromString(name);
              return {
                name,
                value: Number.isFinite(count) ? count : 0,
                color: hexUsed,
                hexUsed,
              } as DistRow;
            });
            setData(items);
            setLoading(false);
            return;
          }

          // --- 2) Backwards: payload.counts object (label -> number) ---
          if (
            payload &&
            typeof payload === "object" &&
            "counts" in (payload as Record<string, unknown>) &&
            typeof (payload as Record<string, unknown>).counts === "object"
          ) {
            const countsObj = (payload as Record<string, unknown>)
              .counts as Record<string, unknown>;
            const items = Object.entries(countsObj).map(([label, val]) => {
              const numeric = Number(val ?? 0);
              const normalizedHex =
                extractHexAnywhere(label) ?? normalizeHexFull(label);
              const name =
                label && label !== "null" ? humanLabelFromId(label) : "Unknown";
              const hexUsed = normalizedHex ?? colorFromString(name);
              return {
                name,
                value: Number.isFinite(numeric) ? numeric : 0,
                color: hexUsed,
                hexUsed,
              } as DistRow;
            });
            setData(items);
            setLoading(false);
            return;
          }

          // --- 3) Backwards: direct counts object (label->number) ---
          if (
            payload &&
            typeof payload === "object" &&
            !Array.isArray(payload)
          ) {
            const maybeCounts = payload as Record<string, unknown>;
            const values = Object.values(maybeCounts);
            const allNumeric =
              values.length > 0 &&
              values.every((v) => typeof v === "number" || !isNaN(Number(v)));
            if (allNumeric && Object.keys(maybeCounts).length > 0) {
              const items = Object.entries(maybeCounts).map(([label, val]) => {
                const numeric = Number(val ?? 0);
                const normalizedHex =
                  extractHexAnywhere(label) ?? normalizeHexFull(label);
                const name =
                  label && label !== "null"
                    ? humanLabelFromId(label)
                    : "Unknown";
                const hexUsed = normalizedHex ?? colorFromString(name);
                return {
                  name,
                  value: Number.isFinite(numeric) ? numeric : 0,
                  color: hexUsed,
                  hexUsed,
                } as DistRow;
              });
              setData(items);
              setLoading(false);
              return;
            }
          }

          // --- 4) Fallback: raw array of rows (older APIs) ---
          if (Array.isArray(payload)) {
            const arr = payload as unknown[];
            const items = arr.map((it) => {
              const obj = (it ?? {}) as Record<string, unknown>;
              const rawLabel =
                obj.label ?? obj.themeId ?? obj.hex ?? String(obj);
              const name = humanLabelFromId(String(rawLabel));
              const count = Number(obj.count ?? obj.value ?? 0);
              const explicit =
                extractHexAnywhere(
                  (obj.colorHex ?? obj.color ?? obj.hex) as string | null
                ) ??
                normalizeHexFull(
                  (obj.colorHex ?? obj.color ?? obj.hex) as string | null
                );
              const fromLabel =
                extractHexAnywhere(String(rawLabel)) ??
                normalizeHexFull(String(rawLabel));
              const hexCandidate = explicit ?? fromLabel ?? null;
              const hexUsed = hexCandidate ?? colorFromString(name);
              return {
                name,
                value: Number.isFinite(count) ? count : 0,
                color: hexUsed,
                hexUsed,
              } as DistRow;
            });
            setData(items);
            setLoading(false);
            return;
          }

          // if we reach here, try next url

          console.debug(
            "[ThemePanel] unexpected payload shape from",
            url,
            payload
          );
        } catch (err: unknown) {
          // safe logging for unknown error

          console.debug(
            "[ThemePanel] request to",
            url,
            "failed:",
            extractErrorMessage(err)
          );
        }
      } // end for urls

      if (!mounted) return;
      setError("Failed to fetch theme distribution (no usable response)");
      setLoading(false);
    }

    fetchCounts();

    return () => {
      mounted = false;
    };
  }, []);

  // sort descending for legend
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, it) => s + it.value, 0) || 1;

  // custom tooltip to show count + percent
  type TooltipProps = { active?: boolean; payload?: unknown[] };
  const renderTooltip = (props: TooltipProps) => {
    const { active, payload } = props;
    if (!active || !payload || !Array.isArray(payload) || payload.length === 0)
      return null;
    const first = payload[0] as Record<string, unknown>;
    const d = first.payload as unknown as DistRow | undefined;
    if (!d) return null;
    const percent = ((d.value / total) * 100).toFixed(1);
    return (
      <div
        style={{
          background: "#fff",
          padding: 8,
          borderRadius: 6,
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 700 }}>{d.name}</div>
        <div>
          {d.value} — {percent}%{" "}
          <span style={{ color: d.color, marginLeft: 8 }}>{d.hexUsed}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Theme distribution</h3>

      {loading && <div style={{ fontSize: 13, color: "#666" }}>Loading...</div>}
      {error && (
        <div style={{ color: "#b91c1c", marginBottom: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={sorted}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={64}
                  innerRadius={28}
                  paddingAngle={4}
                  isAnimationActive={false}
                >
                  {sorted.map((entry, idx) => (
                    <Cell key={`c-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={renderTooltip as unknown as React.ReactElement}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              marginTop: 10,
              maxHeight: 160,
              overflowY: "auto",
              paddingRight: 6,
              minWidth: 240,
            }}
          >
            {sorted.length === 0 ? (
              <div style={{ color: "#666", fontSize: 13 }}>
                No theme data yet.
              </div>
            ) : (
              sorted.map((t) => (
                <div
                  key={`${t.name}-${t.hexUsed}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    padding: "6px 2px",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      background: t.color,
                      borderRadius: 3,
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 13,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{t.name}</strong>
                    </div>
                    <div style={{ color: "#666" }}>{t.value}</div>
                    <div style={{ color: "#666", marginLeft: 6 }}>
                      {t.hexUsed}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
