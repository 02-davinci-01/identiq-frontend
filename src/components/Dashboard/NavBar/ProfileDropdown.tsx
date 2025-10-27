// src/components/NavBar/ProfileDropdown.tsx
"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
import styles from "./profileDropdown.module.css";
import {
  ChangePasswordModal,
  DeleteAccountModal,
} from "@/components/Modal/DashboardModal/DashboardModal";
import { api, getToken } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type ServerResp = { status: number; data: unknown };

type Breadcrumb = {
  id: string;
  type: "success" | "error" | "info" | "loading";
  text: string;
};

/**
 * ProfileDropdown with informative breadcrumbs:
 * - "name updating" (yellow) → replaced by success/error
 * - success/failure/info appear as top-right floating breadcrumbs
 * - inline bottom feedback removed for cleaner UX
 */
export default function ProfileDropdown(): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [origEmail, setOrigEmail] = useState<string>("");
  const [origName, setOrigName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [, setError] = useState<string | null>(null);
  const [, setSuccessMsg] = useState<string | null>(null);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const queryClient = useQueryClient();

  // breadcrumb / toast state
  const [crumbs, setCrumbs] = useState<Breadcrumb[]>([]);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  function closeDropdown() {
    setName("");
    setEmail("");
    setError(null);
    setSuccessMsg(null);
    setOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // initial fetch to read original email & name
  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await api.get("/users/me", { headers });
        if (!res || res.status >= 400) {
          setLoading(false);
          return;
        }
        const payload = (res.data?.data ?? res.data) as Record<
          string,
          unknown
        > | null;
        setOrigEmail((payload?.email as string) ?? "");
        setOrigName((payload?.name as string) ?? "");
        setName("");
        setEmail("");
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  // ----------------------------
  // Breadcrumb helpers
  // ----------------------------
  function pushBreadcrumb(type: Breadcrumb["type"], text: string): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const crumb: Breadcrumb = { id, type, text };
    setCrumbs((c) => [crumb, ...c]);

    // auto-dismiss after 3s
    window.setTimeout(() => {
      setCrumbs((c) => c.filter((x) => x.id !== id));
    }, 3000);

    return id;
  }

  function removeBreadcrumb(id?: string) {
    if (!id) return;
    setCrumbs((c) => c.filter((x) => x.id !== id));
  }

  function showError(msg: string) {
    setError(msg);
    pushBreadcrumb("error", msg);
  }
  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    pushBreadcrumb("success", msg);
    window.setTimeout(() => setSuccessMsg(null), 2500);
  }

  // ----------------------------
  // Mutation (name)
  // ----------------------------
  type NameMutationContext = { previous?: unknown; loadingCrumbId?: string };

  const nameMutation = useMutation<
    ServerResp,
    unknown,
    string,
    NameMutationContext
  >({
    mutationFn: async (newName: string) => {
      const token = getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await api.patch("/auth/name", { name: newName }, { headers });
      return { status: res.status, data: res.data };
    },
    onMutate: async (newName: string) => {
      await queryClient.cancelQueries({ queryKey: ["me"] });
      const previous = queryClient.getQueryData<unknown>(["me"]);
      queryClient.setQueryData(["me"], (old: unknown) => {
        const o = (old as Record<string, unknown> | null) ?? {};
        return { ...o, name: newName };
      });
      const loadingCrumbId = pushBreadcrumb("loading", "name updating");
      return { previous, loadingCrumbId };
    },
    onError: (_err, _newName, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["me"], context.previous);
      }
      removeBreadcrumb(context?.loadingCrumbId);
      pushBreadcrumb("error", "Failed to update name.");
    },
    onSuccess: (res, newName, context) => {
      removeBreadcrumb(context?.loadingCrumbId);
      if (res?.status >= 200 && res?.status < 300) {
        const returned = res?.data as Record<string, unknown> | null;
        let serverName = newName;
        if (returned && typeof returned.name === "string")
          serverName = returned.name;
        else if (
          returned &&
          typeof returned.data === "object" &&
          returned.data !== null
        ) {
          const nested = returned.data as Record<string, unknown>;
          if (typeof nested.name === "string") serverName = nested.name;
        }
        queryClient.setQueryData(["me"], (old: unknown) => ({
          ...(old as Record<string, unknown> | null),
          name: serverName,
        }));
        pushBreadcrumb("success", "updated successfully");
      } else {
        pushBreadcrumb("error", "Failed to update name (server).");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  // ----------------------------
  // Save handler (name + email)
  // ----------------------------
  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const nameProvided = name.trim().length > 0;
    const emailProvided = email.trim().length > 0;

    if (!nameProvided && !emailProvided) {
      showError("No changes to save");
      return;
    }

    if (emailProvided && !isValidEmail(email)) {
      showError("Please enter a valid email");
      return;
    }

    setSaving(true);
    try {
      let nameUpdated = false;
      let emailRequested = false;

      if (nameProvided && name.trim() !== origName.trim()) {
        const mutateResult = await nameMutation.mutateAsync(name.trim());
        const mutateData =
          (mutateResult?.data as Record<string, unknown> | null) ?? null;

        if (
          !mutateResult ||
          mutateResult.status >= 400 ||
          (mutateData && mutateData["ok"] === false)
        ) {
          const data = mutateResult?.data as Record<string, unknown> | null;
          const msg =
            (data?.error as string) ||
            (data?.message as string) ||
            "Failed to update name";
          showError(msg);
          setSaving(false);
          return;
        } else {
          nameUpdated = true;
        }
      }

      if (emailProvided && email.trim() !== origEmail.trim()) {
        const token = getToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const emailRes = await api.post(
          "/auth/request-email-change",
          { newEmail: email.trim() },
          { headers }
        );

        const emailData =
          (emailRes.data as Record<string, unknown> | null) ?? null;

        if (
          emailRes.status >= 400 ||
          (emailData && emailData["ok"] === false)
        ) {
          const d = emailData;
          const msg =
            (d?.error as string) ||
            (d?.message as string) ||
            "Failed to initiate email change";
          showError(msg);
          setSaving(false);
          return;
        } else {
          emailRequested = true;
          setOrigEmail(email.trim());
          pushBreadcrumb("info", "Verification email sent to new address.");
        }
      }

      if (nameUpdated && emailRequested) {
        // showSuccess("Name updated. Verification sent to new email.");
      } else if (nameUpdated) {
        showSuccess("Name updated");
      } else if (emailRequested) {
        // showSuccess("Verification sent to new email.");
      } else {
        showSuccess("No changes were necessary.");
      }

      setName("");
      setEmail("");
      setOpen(false);
    } catch (err) {
      let msg = "Network error while saving changes";
      if (err instanceof Error) msg = err.message;
      else if (typeof err === "object" && err !== null) {
        try {
          const maybe = err as Record<string, unknown>;
          if (typeof maybe.message === "string") msg = maybe.message;
        } catch {}
      }
      showError(msg);
    } finally {
      setSaving(false);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  }

  function handleOpenChangePassword() {
    closeDropdown();
    setOpenChangePassword(true);
  }

  function handleOpenDelete() {
    closeDropdown();
    setOpenDeleteModal(true);
  }

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <>
      <div className={styles.wrapper} ref={rootRef}>
        <button
          className={styles.trigger}
          onClick={() => {
            if (open) closeDropdown();
            else {
              setName("");
              setEmail("");
              setError(null);
              setSuccessMsg(null);
              setOpen(true);
            }
          }}
          aria-expanded={open}
          aria-haspopup="true"
          type="button"
        >
          <span className={styles.triggerText}>Edit profile</span>
          <span className={styles.caret} aria-hidden>
            ▾
          </span>
        </button>

        {open && (
          <div
            className={styles.dropdown}
            role="dialog"
            aria-label="Edit profile"
          >
            <div className={styles.breadcrumbs} aria-hidden>
              Profile › Edit
            </div>

            <form className={styles.form} onSubmit={handleSave}>
              <label className={styles.label}>
                <span className={styles.labelText}>Name</span>
                <input
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving || loading}
                  name="name"
                  autoComplete="name"
                  placeholder={origName || "leave blank to keep current name"}
                />
              </label>

              <label className={styles.label}>
                <span className={styles.labelText}>Email</span>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving || loading}
                  name="email"
                  autoComplete="email"
                  placeholder={origEmail || "leave blank to keep current email"}
                />
              </label>

              <div className={styles.actionsRow}>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={saving || loading}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>

              <div className={styles.divider} />

              <div className={styles.secondaryActions}>
                <button
                  type="button"
                  className={`${styles.secondaryBtn} ${styles.changePasswordBtn}`}
                  onClick={handleOpenChangePassword}
                  disabled={loading || saving}
                >
                  Change password
                </button>

                <button
                  type="button"
                  className={`${styles.secondaryBtn} ${styles.deleteBtn}`}
                  onClick={handleOpenDelete}
                  disabled={loading || saving}
                >
                  Delete account
                </button>
              </div>
              {/* ✅ Removed inline bottom feedback */}
            </form>
          </div>
        )}
      </div>

      {/* Floating breadcrumbs */}
      <div
        className={styles.crumbsContainer}
        aria-live="polite"
        aria-atomic="true"
      >
        {crumbs.map((c) => (
          <div
            key={c.id}
            className={`${styles.crumb} ${
              c.type === "success"
                ? styles.crumbSuccess
                : c.type === "error"
                ? styles.crumbError
                : c.type === "info"
                ? styles.crumbInfo
                : styles.crumbLoading
            }`}
            role="status"
          >
            <span className={styles.crumbText}>{c.text}</span>
          </div>
        ))}
      </div>

      <ChangePasswordModal
        open={openChangePassword}
        onClose={() => setOpenChangePassword(false)}
      />
      <DeleteAccountModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
      />
    </>
  );
}
