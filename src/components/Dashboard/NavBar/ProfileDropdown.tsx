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

/**
 * ProfileDropdown - fully typed
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
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const queryClient = useQueryClient();

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
        // keep inputs empty per previous behavior (user types to change)
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

  // useMutation: pass an options object with mutationFn to avoid TS overload ambiguity
  const nameMutation = useMutation<
    ServerResp,
    unknown,
    string,
    { previous?: unknown }
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
        return {
          ...o,
          name: newName,
        };
      });
      return { previous };
    },
    onError: (
      _err: unknown,
      _newName: string,
      context?: { previous?: unknown }
    ) => {
      if (context?.previous) {
        queryClient.setQueryData(["me"], context.previous);
      }
    },
    onSuccess: (res: ServerResp, newName: string) => {
      if (res?.status >= 200 && res?.status < 300) {
        const returned = res?.data as Record<string, unknown> | null;

        let serverName = newName;

        // returned.name as string?
        if (returned && typeof returned.name === "string") {
          serverName = returned.name;
        } else if (
          returned &&
          typeof returned.data === "object" &&
          returned.data !== null
        ) {
          const nested = returned.data as Record<string, unknown>;
          if (typeof nested.name === "string") serverName = nested.name;
        }

        queryClient.setQueryData(["me"], (old: unknown) => {
          const o = (old as Record<string, unknown> | null) ?? {};
          return {
            ...o,
            name: serverName,
          };
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const nameProvided = name.trim().length > 0;
    const emailProvided = email.trim().length > 0;

    // if nothing provided -> nothing to do
    if (!nameProvided && !emailProvided) {
      setError("No changes to save");
      return;
    }

    // validate email only when provided
    if (emailProvided && !isValidEmail(email)) {
      setError("Please enter a valid email");
      return;
    }

    setSaving(true);
    try {
      let nameUpdated = false;
      let emailRequested = false;

      // 1) Update name only if user typed a name and it's different from origName
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
          setError(
            (data?.error as string) ||
              (data?.message as string) ||
              "Failed to update name"
          );
          setSaving(false);
          return;
        } else {
          nameUpdated = true;
        }
      }

      // 2) Only attempt email-change if the user provided a new email and it differs from original
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
          setError(
            (d?.error as string) ||
              (d?.message as string) ||
              "Failed to initiate email change"
          );
          setSaving(false);
          return;
        } else {
          emailRequested = true;
          setOrigEmail(email.trim()); // update baseline so subsequent changes compare correctly
        }
      }

      // Build succinct success message
      if (nameUpdated && emailRequested) {
        setSuccessMsg("Name updated. Verification sent to new email.");
      } else if (nameUpdated) {
        setSuccessMsg("Name updated");
      } else if (emailRequested) {
        setSuccessMsg("Verification sent to new email.");
      } else {
        // If user provided inputs but neither resulted in an action (e.g., provided same name/email),
        // give a gentle message.
        setSuccessMsg("No changes were necessary.");
      }

      setTimeout(() => setSuccessMsg(null), 2500);
      // clear inputs but keep origName/origEmail (origName updated by query invalidation after mutation)
      setName("");
      setEmail("");
      setOpen(false);
    } catch (err: unknown) {
      let msg = "Network error while saving changes";
      if (err instanceof Error) msg = err.message;
      else if (typeof err === "object" && err !== null) {
        try {
          const maybe = err as Record<string, unknown>;
          if (typeof maybe.message === "string") msg = maybe.message;
        } catch {
          /* ignore */
        }
      }
      setError(msg);
    } finally {
      setSaving(false);
      // refresh server state
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

  return (
    <>
      <div className={styles.wrapper} ref={rootRef}>
        <button
          className={styles.trigger}
          onClick={() => {
            if (open) {
              closeDropdown();
            } else {
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

              {(error || successMsg) && (
                <div
                  className={`${styles.feedback} ${
                    error ? styles.error : styles.success
                  }`}
                  role="status"
                >
                  {error || successMsg}
                </div>
              )}
            </form>
          </div>
        )}
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
