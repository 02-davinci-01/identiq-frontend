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

const THEMES: ThemeStatic[] = [
  { id: "teal", label: "Teal", img: "/themeChange.webp", color: "#2f6f66" },
  { id: "light", label: "Light", img: "/themeChange.webp", color: "#c96a2b" },
  { id: "dark", label: "Dark", img: "/themeChange.webp", color: "#000000" },
];

const STATIC_THEME_IDS = THEMES.map((t) => t.id);

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
  const [currentColor, setCurrentColor] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(true);

  // custom themes from server
  const [customThemes, setCustomThemes] = useState<CustomThemeItem[]>([]);
  const [customLoading, setCustomLoading] = useState(false);

  // modal state for adding a theme (now only asks for name)
  const [hexModalOpen, setHexModalOpen] = useState(false);
  const [hexInput, setHexInput] = useState("#4287F5");
  const [hexColorInput, setHexColorInput] = useState("#4287F5");
  const [hexError, setHexError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  // REQUIRED: user-provided name (label); themeId will be derived from this
  const [hexName, setHexName] = useState<string>("");

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

  function applyAndSetTheme(hex: string, selectedId: string | null = null) {
    const normalized = hex.toUpperCase().startsWith("#")
      ? hex.toUpperCase()
      : "#" + hex.toUpperCase();
    applyThemeVars(normalized);
    setCurrentColor(normalized);
    setSelectedThemeId(selectedId);
  }

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      try {
        const token = getToken();
        config.headers = config.headers ?? {};
        if (token) config.headers["Authorization"] = `Bearer ${token}`;
        else delete config.headers["Authorization"];
        config.params = { ...config.params, _t: Date.now() };
      } catch {}
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, []);

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
      {
        queryKey: ["theme", "custom"],
        queryFn: async () => {
          const res = await api.get("/themes/custom", {
            headers: {
              Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
            },
          });
          return res.data?.items ?? res.data;
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
  const customQuery = results[3];

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

  useEffect(() => {
    if (themeQuery.isSuccess && themeQuery.data) {
      const serverColor = (themeQuery.data?.theme?.colorHex ??
        themeQuery.data?.colorHex ??
        themeQuery.data?.color ??
        null) as string | null;
      const serverThemeId = (themeQuery.data?.theme?.themeId ??
        themeQuery.data?.themeId ??
        themeQuery.data?.id ??
        null) as string | null;

      if (serverColor) {
        const normalized = serverColor.toUpperCase().startsWith("#")
          ? serverColor.toUpperCase()
          : "#" + serverColor.toUpperCase();
        if (normalized !== currentColor) {
          applyAndSetTheme(normalized, serverThemeId ?? null);
        }
      }

      const serverCustomsFromRow: CustomThemeItem[] =
        (themeQuery.data?.theme?.customThemes as CustomThemeItem[]) ??
        (themeQuery.data?.customThemes as CustomThemeItem[]) ??
        [];
      if (
        Array.isArray(serverCustomsFromRow) &&
        (!customQuery.isSuccess || (customQuery.data as any[]).length === 0)
      ) {
        setCustomThemes(serverCustomsFromRow);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeQuery.isSuccess, themeQuery.data]);

  useEffect(() => {
    if (customQuery && customQuery.isSuccess) {
      const items = (customQuery.data ?? []) as CustomThemeItem[];
      if (Array.isArray(items) && items.length > 0) {
        setCustomThemes(items);
      } else {
        setCustomThemes([]);
      }
    }
  }, [customQuery?.isSuccess, customQuery?.data]);

  useEffect(() => {
    if (countQuery.isSuccess) {
      const parsed =
        typeof countQuery.data === "number"
          ? countQuery.data
          : Number(countQuery.data ?? 0);
      setTotalUsers(Number.isFinite(parsed) ? parsed : 0);
    }
  }, [countQuery.isSuccess, countQuery.data]);

  const meSettled = meQuery.isSuccess || meQuery.isError;
  const countSettled = countQuery.isSuccess || countQuery.isError;
  const themeSettled = themeQuery.isSuccess || themeQuery.isError;
  const customSettled = customQuery.isSuccess || customQuery.isError;
  const allSettled = meSettled && countSettled && themeSettled && customSettled;

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

  // ---------- handle static / custom theme select ----------
  async function handleThemeSelect(
    id?: string,
    payload?: { themeId?: string; colorHex?: string }
  ) {
    if (!id && !payload) return;

    const payloadColor =
      payload?.colorHex ?? THEMES.find((t) => t.id === id)?.color;
    const selectedIdForUI = payload?.themeId ?? id ?? null;

    const prevThemeId = selectedThemeId;
    const prevColor = currentColor;

    if (payloadColor) applyAndSetTheme(payloadColor, selectedIdForUI);
    else if (selectedIdForUI) setSelectedThemeId(selectedIdForUI);

    /* --- BUILD PATCH BODY ACCORDING TO UPDATED DTO --- */
    // New payload will include:
    // - themeId (when available)
    // - label (when available for custom themes)
    // - colorHex (the hex being applied)  <-- change to `hex` if backend expects `hex`
    const body: any = {};

    // If this is a static theme selection, only send themeId (backend will apply canonical color)
    if (STATIC_THEME_IDS.includes(id ?? "")) {
      body.themeId = id;
    } else {
      // For custom themes (or hex-based selections), include full info
      // We try to find the matching customTheme (by hex or themeId) to include the label
      const colorToUse = payloadColor;
      const matchingCustom =
        customThemes.find(
          (c) =>
            (c.hex &&
              colorToUse &&
              c.hex.toUpperCase() === colorToUse.toUpperCase()) ||
            (payload?.themeId && c.themeId === payload.themeId)
        ) ?? null;

      // themeId: prefer payload.themeId, otherwise if we have a matching custom theme use its themeId,
      // otherwise derive from id (which in our UI is the hex for custom entries)
      body.themeId = payload?.themeId ?? matchingCustom?.themeId ?? id ?? null;

      // label: prefer matching custom label (user-provided), otherwise fall back to themeId
      if (matchingCustom?.label) body.label = matchingCustom.label;
      else if (payload?.themeId) body.label = payload.themeId;
      else if (body.themeId) body.label = String(body.themeId);

      // colorHex: include the hex being applied
      if (colorToUse) body.colorHex = colorToUse;
      // If your backend expects `hex` instead of `colorHex`, replace the line above:
      // if (colorToUse) body.hex = colorToUse;
    }

    // If we still don't have anything to send, revert optimistic UI and abort
    if (!body.themeId && !body.colorHex) {
      if (prevColor) applyAndSetTheme(prevColor, prevThemeId);
      else setSelectedThemeId(prevThemeId);
      return;
    }

    const token =
      getToken() ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      null;
    const headers: Record<string, string> = {};
    if (token)
      headers["Authorization"] = token.startsWith("Bearer")
        ? token
        : `Bearer ${token}`;

    try {
      const res = await api.patch("/themes", body, { headers });
      console.log;

      if (res.status >= 200 && res.status < 300) {
        const returned = res.data ?? {};
        const savedTheme = returned?.theme ?? returned;
        const serverThemeId = savedTheme?.themeId ?? selectedIdForUI;
        const serverColor =
          savedTheme?.colorHex ?? savedTheme?.color ?? savedTheme?.hex ?? null;

        if (serverColor) {
          const normalized = serverColor.toUpperCase().startsWith("#")
            ? serverColor.toUpperCase()
            : "#" + serverColor.toUpperCase();
          if (normalized !== currentColor) {
            applyAndSetTheme(normalized, serverThemeId ?? selectedIdForUI);
          } else {
            setSelectedThemeId(serverThemeId ?? selectedIdForUI);
          }
        } else if (serverThemeId) {
          setSelectedThemeId(serverThemeId);
        }

        // refresh custom themes from server (new selection may have created/changed custom list)
        try {
          const customsRes = await api.get("/themes/custom", { headers });
          const items = customsRes?.data?.items ?? customsRes?.data ?? [];
          setCustomThemes(Array.isArray(items) ? items : []);
        } catch {}
      } else {
        if (prevColor) applyAndSetTheme(prevColor, prevThemeId);
        else setSelectedThemeId(prevThemeId);
        alert("Failed to update theme on server");
      }
    } catch (err: any) {
      if (prevColor) applyAndSetTheme(prevColor, prevThemeId);
      else setSelectedThemeId(prevThemeId);
      alert(
        "Failed to update theme (network/server error). Check console for details."
      );
    }
  }

  // ---------- modal helpers ----------
  const openHexModal = () => {
    setHexError(null);
    setHexInput("#4287F5");
    setHexColorInput("#4287F5");
    setHexName("");
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

    // name (label) is required
    if (!hexName || hexName.trim().length === 0) {
      setHexError("Name (label) is required for the theme.");
      return;
    }

    const raw = hexInput.trim();
    if (!isValidHexCandidate(raw)) {
      setHexError("Enter a 6-digit hex, e.g. #4287F5");
      return;
    }
    const normalized = raw.startsWith("#")
      ? raw.toUpperCase()
      : ("#" + raw).toUpperCase();

    setPosting(true);
    try {
      setCustomLoading(true);

      // themeId is derived from name on the frontend (you mentioned themeId === name)
      const derivedThemeId = hexName.trim();

      const payload: any = {
        themeId: derivedThemeId,
        label: derivedThemeId,
        hex: normalized,
      };

      const res = await api.post("/themes/custom", payload, {
        headers: {
          Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
          "Content-Type": "application/json",
        },
      });

      const created = res?.data?.item ?? res?.data?.data ?? res?.data;
      const newItem: CustomThemeItem =
        created && created.hex
          ? {
              themeId: created.themeId || payload.themeId,
              label: payload.label,
              hex: created.hex,
            }
          : { themeId: payload.themeId, label: payload.label, hex: normalized };

      // optimistic update
      setCustomThemes((prev) => [newItem, ...prev]);
      setLocalMessage("Custom theme added.");
      setHexModalOpen(false);

      // apply newly created theme (persist selection on server)
      await handleThemeSelect(newItem.hex, {
        colorHex: newItem.hex,
        themeId: newItem.themeId,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to submit";
      setHexError(msg);
    } finally {
      setPosting(false);
      setCustomLoading(false);
    }
  }

  // delete handler for custom themes -> call DELETE /themes/custom/:hex (without leading #)
  async function handleDeleteCustom(hex: string) {
    const withoutHash = hex.startsWith("#") ? hex.slice(1) : hex;
    const prev = customThemes;
    setCustomThemes((s) =>
      s.filter(
        (c) =>
          c.hex.replace(/^#/, "").toUpperCase() !== withoutHash.toUpperCase()
      )
    );

    try {
      const res = await api.delete(
        `/themes/custom/${encodeURIComponent(withoutHash)}`,
        {
          headers: {
            Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
          },
        }
      );

      // if deleted hex was currently active, fall back to light
      const normalized = hex.startsWith("#")
        ? hex.toUpperCase()
        : "#" + hex.toUpperCase();
      if (currentColor && currentColor.toUpperCase() === normalized) {
        const LIGHT_HEX = THEMES.find(
          (t) => t.id === "light"
        )!.color.toUpperCase();

        try {
          const patchRes = await api.patch(
            "/themes",
            { themeId: "light", colorHex: LIGHT_HEX },
            {
              headers: {
                Authorization: getToken() ? `Bearer ${getToken()}` : undefined,
              },
            }
          );
          if (patchRes?.status >= 200 && patchRes?.status < 300) {
            const serverColor =
              patchRes?.data?.theme?.colorHex ??
              patchRes?.data?.colorHex ??
              LIGHT_HEX;
            applyAndSetTheme(serverColor, "light");
          } else {
            applyAndSetTheme(LIGHT_HEX, "light");
          }
        } catch {
          applyAndSetTheme(LIGHT_HEX, "light");
        }
      }
    } catch (err) {
      setCustomThemes(prev);
      console.error("failed to delete custom theme", err);
      setLocalMessage("Failed to delete theme.");
    }
  }

  const name = meQuery.data?.name ?? "Vedant";
  const userTotal = (totalUsers ?? 0) > 1 ? "total users" : "total user";

  return (
    <div className={styles.dmRoot}>
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

          <button
            className={`${styles.date} ${styles.addThemeBtn}`}
            onClick={openHexModal}
            aria-haspopup="dialog"
            aria-expanded={hexModalOpen}
            title="Add custom theme"
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>Add theme</div>
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
            {THEMES.map((t) => (
              <ThemePreview
                key={t.id}
                id={t.id}
                label={t.label}
                selected={t.id === selectedThemeId}
                onSelect={handleThemeSelect}
              />
            ))}

            {customThemes.length > 0 &&
              customThemes.map((c) => (
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
                  onSelect={handleThemeSelect}
                />
              ))}
          </div>
        </section>
      </div>

      {/* Modal: now only requests Name + color/hex */}
      {hexModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hex-modal-title"
        >
          <div className={styles.modalDialog}>
            <h3 id="hex-modal-title" style={{ margin: 0, marginBottom: 8 }}>
              Add custom theme
            </h3>
            <p
              style={{
                marginTop: 0,
                marginBottom: 12,
                color: "rgba(0,0,0,0.6)",
              }}
            >
              <strong>Name is required.</strong> Enter a name (used as label and
              themeId) and a 6-digit hex (e.g. <code>#4287F5</code>) or pick a
              color.
            </p>

            {/* REQUIRED: Name (label); themeId derived from this */}
            <div style={{ marginBottom: 10 }}>
              <label
                htmlFor="hex-name"
                style={{ display: "block", fontSize: 13, marginBottom: 6 }}
              >
                Name{" "}
                <span aria-hidden="true" style={{ color: "#b91c1c" }}>
                  *
                </span>
              </label>
              <input
                id="hex-name"
                value={hexName}
                onChange={(e) => {
                  setHexName(e.target.value);
                  if (hexError) setHexError(null);
                }}
                className="input"
                placeholder="e.g. Sunset Orange"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
                disabled={posting}
                required
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <input
                type="color"
                aria-label="Choose color"
                value={hexColorInput}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  setHexColorInput(upper);
                  setHexInput(upper);
                }}
                style={{
                  width: 48,
                  height: 36,
                  padding: 0,
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.06)",
                  background: "transparent",
                }}
                disabled={posting}
              />
              <input
                value={hexInput}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setHexInput(val);
                  const maybe = val.startsWith("#") ? val : `#${val}`;
                  if (/^#([0-9A-F]{6})$/i.test(maybe)) {
                    setHexColorInput(maybe.toUpperCase());
                  }
                }}
                className="input"
                placeholder="#4287F5"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
                aria-invalid={!!hexError}
              />
            </div>

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
                {posting ? "Submitting…" : "Create"}
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
