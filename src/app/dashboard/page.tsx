"use client";

import React, { useEffect, useState } from "react";
import ThemePreview from "@/components/Dashboard/ThemePreview/ThemePreview";
import styles from "./styles/dashboard.module.css";
import TypewriterText from "@/components/UI/TypewriterText/TypewriterText";
import { useQueries } from "@tanstack/react-query";
import { api, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

type ThemeStatic = { id: string; label: string; img: string; color: string };
type CustomThemeItem = {
  themeId: string;
  label: string;
  hex: string;
  createdAt?: string;
  updatedAt?: string;
};

const STORAGE_KEY = "dashboardTheme";

/* Static default themes (unchanged) */
const THEMES: ThemeStatic[] = [
  { id: "teal", label: "Teal", img: "/themeChange.webp", color: "#2f6f66" },
  { id: "light", label: "Light", img: "/themeChange.webp", color: "#c96a2b" },
  { id: "dark", label: "Dark", img: "/themeChange.webp", color: "#000000" },
];

const STATIC_THEME_IDS = ["teal", "light", "dark"];

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

export default function DashboardPage() {
  const router = useRouter();

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState<string | null>(null); // TRACK currently applied color
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(true);

  // custom themes from server
  const [customThemes, setCustomThemes] = useState<CustomThemeItem[]>([]);
  const [customLoading, setCustomLoading] = useState(false);

  // modal state for adding a hex
  const [hexModalOpen, setHexModalOpen] = useState(false);
  const [hexInput, setHexInput] = useState("#4287f5");
  const [hexError, setHexError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  // helper that applies CSS vars and tracks applied color + selected id
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

  // wrapper to apply and set local tracking states
  function applyAndSetTheme(hex: string, selectedId: string | null = null) {
    applyThemeVars(hex);
    setCurrentColor(hex.toUpperCase());
    setSelectedThemeId(selectedId);
    try {
      if (selectedId) localStorage.setItem(STORAGE_KEY, selectedId);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

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

  /* fetch me, count and theme in parallel */
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
        staleTime: 0,
        refetchOnMount: "always",
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
      const serverColor = (themeQuery.data?.colorHex ??
        themeQuery.data?.color ??
        null) as string | null;
      const serverThemeId = (themeQuery.data?.themeId ??
        themeQuery.data?.id ??
        null) as string | null;

      // apply server color (if present). If absent, keep currentColor.
      if (serverColor) applyAndSetTheme(serverColor, serverThemeId ?? null);

      // populate custom themes list from server response
      const serverCustoms: CustomThemeItem[] =
        (themeQuery.data?.customThemes as CustomThemeItem[]) ?? [];
      setCustomThemes(serverCustoms);
    }
  }, [themeQuery.isSuccess, themeQuery.data]);

  /* consider a query settled when it is success OR error */
  const meSettled = meQuery.isSuccess || meQuery.isError;
  const countSettled = countQuery.isSuccess || countQuery.isError;
  const themeSettled = themeQuery.isSuccess || themeQuery.isError;

  const allSettled = meSettled && countSettled && themeSettled;

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

  // ---------- handle static theme select ----------
  // (paste the whole file content) - truncated header omitted for brevity in this message
  // ... keep the rest of your imports and helpers unchanged ...

  // ---------- handle static theme select (FIXED) ----------
  // Accept an optional payload for sending to backend
  async function handleThemeSelect(
    id?: string,
    payload?: { themeId?: string; colorHex?: string }
  ) {
    if (!id && !payload) return;

    // compute optimistic color + selected id
    // if payload provides colorHex, use that; otherwise, find static theme color
    const payloadColor =
      payload?.colorHex ?? THEMES.find((t) => t.id === id)?.color;
    const selectedIdForUI = payload?.themeId ?? id ?? null;

    const prevThemeId = selectedThemeId;
    const prevColor = currentColor;

    if (payloadColor) applyAndSetTheme(payloadColor, selectedIdForUI);
    else if (selectedIdForUI) setSelectedThemeId(selectedIdForUI);

    try {
      // send exactly what server expects:
      // - for static theme -> { themeId }
      // - for custom -> { colorHex }
      const body: any = {};
      if (payload?.themeId) body.themeId = payload.themeId;
      if (payload?.colorHex) body.colorHex = payload.colorHex;

      // If neither provided (rare), fall back to sending themeId if id matches a static theme
      if (!body.themeId && !body.colorHex && id) {
        if (STATIC_THEME_IDS.includes(id)) body.themeId = id;
      }

      const res = await api.patch("/themes", body);
      if (res.status >= 200 && res.status < 300) {
        const returned = res.data ?? {};
        const serverThemeId =
          returned?.theme?.themeId ?? returned?.themeId ?? selectedIdForUI;
        const serverColor =
          returned?.theme?.colorHex ?? returned?.colorHex ?? null;

        // Accept server color only if it intentionally changed the themeId,
        // otherwise keep the optimistic color (prevents stale default overwrite)
        if (serverThemeId && serverThemeId !== (payload?.themeId ?? id)) {
          if (serverColor) applyAndSetTheme(serverColor, serverThemeId);
          else setSelectedThemeId(serverThemeId);
        } else {
          // Keep optimistic state; but update selectedThemeId from server if present
          if (serverThemeId) setSelectedThemeId(serverThemeId);
        }
      } else {
        // rollback
        if (prevColor) applyAndSetTheme(prevColor, prevThemeId);
        else setSelectedThemeId(prevThemeId);
      }
    } catch (err) {
      // rollback on network error
      if (prevColor) applyAndSetTheme(prevColor, prevThemeId);
      else setSelectedThemeId(prevThemeId);
    }
  }

  // ---------- modal helpers ----------
  const openHexModal = () => {
    setHexError(null);
    setHexInput("#4287f5");
    setHexModalOpen(true);
    setLocalMessage(null);
  };
  const closeHexModal = () => {
    if (posting) return;
    setHexModalOpen(false);
  };

  function isValidHexCandidate(v: string) {
    return /^#?[0-9A-F]{6}$/i.test(v.trim());
  }

  async function submitHex() {
    setHexError(null);
    setLocalMessage(null);

    const raw = hexInput.trim();
    if (!isValidHexCandidate(raw)) {
      setHexError("Enter a 6-digit hex, e.g. #4287f5");
      return;
    }
    const normalized = raw.startsWith("#")
      ? raw.toUpperCase()
      : ("#" + raw).toUpperCase();

    setPosting(true);
    try {
      setCustomLoading(true);
      // POST to backend to create custom theme
      const res = await api.post(
        "/themes/custom",
        { hex: normalized },
        {
          headers: {
            Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
            "Content-Type": "application/json",
          },
        }
      );

      const created = res?.data?.item ?? res?.data?.data ?? res?.data;
      const newItem: CustomThemeItem =
        created && created.hex
          ? {
              themeId: created.themeId || "ntcjs",
              label: created.label || created.name || created.hex,
              hex: created.hex,
            }
          : { themeId: "ntcjs", label: normalized, hex: normalized };

      // optimistic add — newest first
      setCustomThemes((prev) => [newItem, ...prev]);
      setLocalMessage("Custom theme added.");
      setHexModalOpen(false);

      // apply immediately and mark selected as the custom hex (so UI reflects selection)
      applyAndSetTheme(newItem.hex, newItem.hex);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to submit";
      setHexError(msg);
    } finally {
      setPosting(false);
      setCustomLoading(false);
    }
  }

  // delete handler for custom themes
  async function handleDeleteCustom(hex: string) {
    const normalized = hex.startsWith("#")
      ? hex.toUpperCase()
      : ("#" + hex).toUpperCase();
    const prev = customThemes;
    setCustomThemes((s) => s.filter((c) => c.hex.toUpperCase() !== normalized));

    try {
      const res = await api.delete(
        `/themes/custom/${encodeURIComponent(normalized)}`,
        {
          headers: {
            Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
          },
        }
      );

      // if the deleted theme was currently applied, revert to light theme both locally and on server
      if (currentColor && currentColor.toUpperCase() === normalized) {
        const LIGHT_HEX = "#C96A2B";
        // apply locally
        applyAndSetTheme(LIGHT_HEX, "light");
        // inform server: make 'light' the selected theme for this user
        try {
          await api.patch(
            "/themes",
            { themeId: "light", colorHex: LIGHT_HEX },
            {
              headers: {
                Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
              },
            }
          );
        } catch (err) {
          // log and continue; UI already reverted to light
          console.error(
            "failed to patch server to light after deleting current custom theme",
            err
          );
        }
      }
      // success deletion done
    } catch (err) {
      // revert on error
      setCustomThemes(prev);
      console.error("failed to delete custom theme", err);
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
      {/* spinner overlay while initial queries are pending */}
      {spinnerVisible && (
        <div aria-hidden={!spinnerVisible}>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(255,255,255,0.5)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        </div>
      )}

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

          {/* date button opens the modal to add custom hex */}
          <button
            className={styles.date}
            onClick={() => setHexModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={hexModalOpen}
            title="Click to add custom theme hex"
            style={{ cursor: "pointer", textAlign: "center" }}
          >
            {today}
            <br />
            {currYear}
          </button>
        </div>

        {localMessage && (
          <div
            role="status"
            style={{
              marginBottom: 12,
              background: "rgba(0,0,0,0.04)",
              padding: "8px 12px",
              borderRadius: 8,
              color: "var(--fg)",
              fontSize: 13,
            }}
          >
            {localMessage}
          </div>
        )}

        <section className={styles.themesCard}>
          <h3 className={styles.themesCard_h3}>Themes</h3>

          <div className={styles.themesGrid}>
            {/* Render static themes first */}
            {THEMES.map((t) => (
              <ThemePreview
                key={t.id}
                id={t.id}
                label={t.label}
                selected={t.id === selectedThemeId}
                onSelect={handleThemeSelect}
              />
            ))}

            {/* Render custom themes from server */}
            {customThemes.map((c) => (
              <ThemePreview
                key={c.hex}
                id={c.hex}
                label={c.label}
                selected={
                  c.hex.toUpperCase() ===
                    (selectedThemeId ?? "").toUpperCase() ||
                  c.hex.toUpperCase() === (currentColor ?? "").toUpperCase()
                }
                hex={c.hex}
                isCustom={true}
                onDelete={() => handleDeleteCustom(c.hex)}
                // important: use the generic handler so it will PATCH with { colorHex }
                onSelect={handleThemeSelect}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Hex modal */}
      {hexModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hex-modal-title"
        >
          <div className={styles.modalDialog}>
            <h3 id="hex-modal-title" style={{ margin: 0, marginBottom: 8 }}>
              Add custom theme hex
            </h3>
            <p
              style={{
                marginTop: 0,
                marginBottom: 12,
                color: "rgba(0,0,0,0.6)",
              }}
            >
              Enter a 6-digit hex (e.g. <code>#4287f5</code>) to create a custom
              theme.
            </p>

            <label style={{ display: "block", marginBottom: 8 }}>
              <input
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                className="input"
                placeholder="#4287f5"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
                aria-invalid={!!hexError}
              />
            </label>
            {hexError && (
              <div style={{ color: "#b91c1c", marginBottom: 8, fontSize: 13 }}>
                {hexError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                className={styles.btnSmall}
                onClick={submitHex}
                disabled={posting}
                aria-disabled={posting}
              >
                {posting ? "Submitting…" : "Submit"}
              </button>
              <button
                onClick={closeHexModal}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid rgba(0,0,0,0.06)",
                  cursor: posting ? "not-allowed" : "pointer",
                }}
                disabled={posting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
