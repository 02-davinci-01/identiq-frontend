// ThemePanel.tsx
import React, { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import axios from "axios";

type DistRow = { name: string; value: number; color: string };

function normalizeHex(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const withHash = s.startsWith("#") ? s : `#${s}`;
  if (/^#([0-9A-F]{6})$/i.test(withHash)) return withHash.toUpperCase();
  return null;
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
  const noHash = id.replace(/^#/, "");
  if (/^[0-9A-F]{6}$/i.test(noHash)) return `#${noHash.toUpperCase()}`;
  return String(id)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getAuthHeader(): Record<string, string> {
  const keys = ["access_token", "accessToken", "token", "jwt", "authToken"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return { Authorization: v.startsWith("Bearer") ? v : `Bearer ${v}` };
  }
  return {};
}

function getBackendBase(): string {
  // prefer env var used elsewhere
  // in SSR this will be replaced by process.env; in client it will be available if NEXT_PUBLIC_API_URL is set
  const envBase =
    (process.env.NEXT_PUBLIC_API_URL as string) ||
    (window as any).__NEXT_PUBLIC_API_URL__;
  if (envBase && envBase.length > 0) return envBase.replace(/\/$/, "");
  // fallback to window.location.origin
  return window.location.origin;
}

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
      const tryUrls = tryPaths.map(
        (p) => `${base.replace(/\/$/, "")}${p.startsWith("/") ? "" : "/"}${p}`
      );

      const headers = getAuthHeader();

      for (const url of tryUrls) {
        try {
          const res = await axios.get(url, {
            headers,
            validateStatus: (s) => s >= 200 && s < 500,
            // timeout optional
            timeout: 8000,
          });

          if (!mounted) return;

          // debug - show the exact response so you can paste it if it looks wrong
          console.debug(
            "[ThemePanel] response from",
            url,
            res.status,
            res.data
          );

          if (res.status < 200 || res.status >= 300) {
            // server returned non-2xx, try next
            continue;
          }

          const payload = res.data;

          // canonical: { ok: true, counts: { label: number } }
          if (
            payload &&
            typeof payload === "object" &&
            payload.counts &&
            typeof payload.counts === "object"
          ) {
            const countsObj: Record<string, any> = payload.counts;
            const items = Object.entries(countsObj).map(([label, val]) => {
              const numeric = Number(val ?? 0);
              const name =
                label && label !== "null" ? label : humanLabelFromId(label);
              const color = colorFromString(name);
              return {
                name,
                value: Number.isFinite(numeric) ? numeric : 0,
                color,
              };
            });
            setData(items);
            setLoading(false);
            return;
          }

          // direct counts object (no ok wrapper)
          if (
            payload &&
            typeof payload === "object" &&
            !Array.isArray(payload)
          ) {
            const maybeCounts = payload as Record<string, any>;
            const allNumeric = Object.values(maybeCounts).every(
              (v) => typeof v === "number" || !isNaN(Number(v))
            );
            if (allNumeric && Object.keys(maybeCounts).length > 0) {
              const items = Object.entries(maybeCounts).map(([label, val]) => {
                const numeric = Number(val ?? 0);
                const name =
                  label && label !== "null" ? label : humanLabelFromId(label);
                const color = colorFromString(name);
                return {
                  name,
                  value: Number.isFinite(numeric) ? numeric : 0,
                  color,
                };
              });
              setData(items);
              setLoading(false);
              return;
            }
          }

          // fallback: { ok: true, items: [{ label, count, colorHex?, themeId? }] }
          if (payload && payload.ok && Array.isArray(payload.items)) {
            const items = payload.items.map((it: any) => {
              const label =
                it.label ??
                humanLabelFromId(it.themeId) ??
                String(it.themeId ?? it.hex ?? "Unknown");
              const count = Number(it.count ?? it.value ?? 0);
              const color =
                normalizeHex(it.colorHex ?? it.color ?? it.hex) ??
                colorFromString(label);
              return {
                name: label,
                value: Number.isFinite(count) ? count : 0,
                color,
              };
            });
            setData(items);
            setLoading(false);
            return;
          }

          // fallback: raw array
          if (Array.isArray(payload)) {
            const items = payload.map((it: any) => {
              const label =
                it.label ??
                humanLabelFromId(it.themeId) ??
                String(it.themeId ?? it.hex ?? "Unknown");
              const count = Number(it.count ?? it.value ?? 0);
              const color =
                normalizeHex(it.colorHex ?? it.color ?? it.hex) ??
                colorFromString(label);
              return {
                name: label,
                value: Number.isFinite(count) ? count : 0,
                color,
              };
            });
            setData(items);
            setLoading(false);
            return;
          }

          // Unexpected shape: log and try next url
          console.debug(
            "[ThemePanel] unexpected payload shape from",
            url,
            payload
          );
        } catch (err: any) {
          console.debug(
            "[ThemePanel] request to",
            url,
            "failed:",
            err?.message ?? err
          );
        }
      }

      if (!mounted) return;
      setError("Failed to fetch theme distribution (no usable response)");
      setLoading(false);
    }

    fetchCounts();

    return () => {
      mounted = false;
    };
  }, []);

  const sorted = [...data].sort((a, b) => b.value - a.value);

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
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={64}
                  innerRadius={28}
                  paddingAngle={4}
                  isAnimationActive={false}
                >
                  {data.map((entry, idx) => (
                    <Cell key={`c-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              marginTop: 10,
              maxHeight: 120,
              overflowY: "auto",
              paddingRight: 6,
            }}
          >
            {sorted.length === 0 ? (
              <div style={{ color: "#666", fontSize: 13 }}>
                No theme data yet.
              </div>
            ) : (
              sorted.map((t) => (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
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
                  <div style={{ fontSize: 13 }}>
                    <strong>{t.name}</strong> — {t.value}
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
