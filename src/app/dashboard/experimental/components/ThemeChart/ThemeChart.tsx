// ThemeChart.tsx
import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import axios from "axios";
import type { UserView } from "../../hooks/useInfiniteExperimentalUsers";

type DistItem = { label: string; count: number; colorHex: string };
type Row = { name: string; value: number; color: string; hexUsed: string };

type Props = {
  users?: UserView[]; // optional — prefer server distribution, fallback to users prop
};

function normalizeHex(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^#([0-9A-F]{6})$/i.test(s)) return s.toUpperCase();
  if (/^[0-9A-F]{6}$/i.test(s)) return `#${s.toUpperCase()}`;
  return null;
}

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
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return { Authorization: v.startsWith("Bearer") ? v : `Bearer ${v}` };
  }
  return {};
}

function getBackendBase(): string {
  const envBase =
    (process.env.NEXT_PUBLIC_API_URL as string) ||
    (window as any).__NEXT_PUBLIC_API_URL__;
  if (envBase && envBase.length > 0) return envBase.replace(/\/$/, "");
  return window.location.origin;
}

export default function ThemeChart({ users }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchDistribution() {
      setLoading(true);
      setError(null);

      const base = getBackendBase();
      const url = `${base}/themes/distribution-counts`;
      const headers = getAuthHeader();

      try {
        const res = await axios.get(url, {
          headers,
          validateStatus: (s) => s >= 200 && s < 500,
          timeout: 8000,
        });

        if (!mounted) return;
        if (res.status < 200 || res.status >= 300) {
          setError("Failed to fetch distribution (non-2xx)");
          setLoading(false);
          return;
        }

        const payload = res.data;

        // Preferred: payload.items array (canonical)
        if (payload && Array.isArray(payload.items)) {
          const items: DistItem[] = payload.items.map((it: any) => ({
            label: String(it.label ?? "Unknown"),
            count: Number(it.count ?? 0),
            colorHex: normalizeHex(it.colorHex ?? it.hex ?? it.color) ?? "",
          }));

          const parsed = items
            .map((it) => {
              const name = humanLabelFromId(it.label);
              const explicit =
                it.colorHex || extractHexAnywhere(it.label) || null;
              const hexUsed = explicit ?? colorFromString(name);
              return {
                name,
                value: Number.isFinite(it.count) ? it.count : 0,
                color: hexUsed,
                hexUsed,
              } as Row;
            })
            .filter((r) => r.name);

          setRows(parsed);
          setLoading(false);
          return;
        }

        // Backward compatibility: payload.counts object (label -> number)
        if (payload && payload.counts && typeof payload.counts === "object") {
          const countsObj: Record<string, any> = payload.counts;
          const parsed = Object.entries(countsObj).map(([label, val]) => {
            const name = humanLabelFromId(label);
            // try to extract hex from label itself, else generate
            const explicit = extractHexAnywhere(label) ?? null;
            const hexUsed = explicit ?? colorFromString(name);
            return {
              name,
              value: Number(val ?? 0),
              color: hexUsed,
              hexUsed,
            } as Row;
          });
          setRows(parsed);
          setLoading(false);
          return;
        }

        // Fallback: if service returned items nested or an unexpected shape, try to salvage
        if (payload && Array.isArray(payload)) {
          const parsed = payload
            .map((it: any) => {
              const label = it.label ?? it.themeId ?? it.name ?? String(it);
              const name = humanLabelFromId(label);
              const val = Number(it.count ?? it.value ?? 0);
              const explicit =
                normalizeHex(it.colorHex ?? it.color ?? it.hex) ??
                extractHexAnywhere(label) ??
                null;
              const hexUsed = explicit ?? colorFromString(name);
              return {
                name,
                value: Number.isFinite(val) ? val : 0,
                color: hexUsed,
                hexUsed,
              } as Row;
            })
            .filter((r) => r.name);
          setRows(parsed);
          setLoading(false);
          return;
        }

        // If nothing matched, set error but still try to render users-derived distribution if provided
        if (users && users.length > 0) {
          // fall back to client-side aggregation from users prop
          const map = new Map<
            string,
            { count: number; hexCandidates: string[] }
          >();
          users.forEach((u) => {
            // cast theme to any here so TS doesn't complain about missing props
            const themeAny: any = (u as any).theme ?? {};
            const label =
              (themeAny.label ?? themeAny.name ?? themeAny.themeId ?? "Unknown")
                .toString()
                .trim() || "Unknown";

            const candidates = [
              normalizeHex(
                themeAny.colorHex ??
                  themeAny.color ??
                  themeAny.hex ??
                  themeAny.hexCode
              ) ?? null,
            ].filter(Boolean) as string[];

            const existing = map.get(label);
            if (existing) {
              existing.count += 1;
              existing.hexCandidates.push(...candidates);
            } else {
              map.set(label, { count: 1, hexCandidates: candidates });
            }
          });
          const parsed = Array.from(map.entries()).map(([label, info]) => {
            const freq = new Map<string, number>();
            for (const h of info.hexCandidates)
              freq.set(h, (freq.get(h) ?? 0) + 1);
            let chosen = "";
            let best = -1;
            for (const [h, f] of freq.entries()) {
              if (f > best) {
                best = f;
                chosen = h;
              }
            }
            const color = chosen || colorFromString(label);
            return {
              name: humanLabelFromId(label),
              value: info.count,
              color,
              hexUsed: color,
            } as Row;
          });
          setRows(parsed);
          setLoading(false);
          return;
        }

        setError("Malformed distribution response");
        setRows([]);
        setLoading(false);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? "Failed to fetch distribution");
        setLoading(false);
      }
    }

    fetchDistribution();

    return () => {
      mounted = false;
    };
  }, [users]);

  // sort descending
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.value - a.value),
    [rows]
  );
  const total = sorted.reduce((s, it) => s + it.value, 0) || 1;

  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    if (!active || !payload || !Array.isArray(payload) || payload.length === 0)
      return null;
    const d = payload[0].payload as Row;
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
    <div className="themes-card expandable">
      <h3>Theme distribution</h3>

      {loading ? (
        <div style={{ padding: 12, textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "4px solid rgba(0,0,0,0.08)",
              borderTop: "4px solid rgba(0,0,0,0.6)",
              margin: "0 auto",
              animation: "spin .8s linear infinite",
            }}
          />
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : error ? (
        <div style={{ padding: 12, color: "#b91c1c" }}>{error}</div>
      ) : (
        <>
          <div style={{ width: "100%", height: 240 }}>
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
                <Tooltip content={renderTooltip as any} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              marginTop: 8,
              maxHeight: 120,
              overflowY: "auto",
              paddingRight: 6,
            }}
          >
            {sorted.length === 0 ? (
              <div style={{ padding: 12, color: "#666" }}>No data yet.</div>
            ) : (
              sorted.map((t) => (
                <div
                  key={`${t.name}-${t.hexUsed}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
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
                    <strong>{t.name}</strong> —{" "}
                    <span style={{ color: "#666" }}>{t.value}</span>
                    <span style={{ color: "#666", marginLeft: 8 }}>
                      {t.hexUsed}
                    </span>
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
