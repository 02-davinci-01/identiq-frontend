// src/components/NavBar/ProfileDropdown.tsx
"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
import styles from "./profileDropdown.module.css";
import {
  ChangePasswordModal,
  DeleteAccountModal,
} from "@/components/Modal/Modal";
import { api, getToken } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type ServerResp = { status: number; data: any };

/**
 * ProfileDropdown - fully typed
 */
export default function ProfileDropdown(): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [origEmail, setOrigEmail] = useState<string>("");
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

  // initial fetch to read original email
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
        const payload = res.data?.data ?? res.data;
        setOrigEmail(payload?.email || "");
        // keep inputs empty per previous behavior
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
    { previous?: any }
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
      const previous = queryClient.getQueryData<any>(["me"]);
      queryClient.setQueryData(["me"], (old: any) => ({
        ...(old ?? {}),
        name: newName,
      }));
      return { previous };
    },
    onError: (err: unknown, newName: string, context?: { previous?: any }) => {
      if (context?.previous) {
        queryClient.setQueryData(["me"], context.previous);
      }
    },
    onSuccess: (res: ServerResp, newName: string) => {
      if (res?.status >= 200 && res?.status < 300) {
        const returned = res?.data;
        const serverName = returned?.name ?? returned?.data?.name ?? newName;
        queryClient.setQueryData(["me"], (old: any) => ({
          ...(old ?? {}),
          name: serverName,
        }));
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

    // basic name validation
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }

    const emailProvided = email.trim().length > 0;

    // only validate email if the user typed something into the email field
    if (emailProvided && !isValidEmail(email)) {
      setError("Please enter a valid email");
      return;
    }

    setSaving(true);
    try {
      // 1) Update name via mutation (mutateAsync returns ServerResp)
      const mutateResult = await nameMutation.mutateAsync(name.trim());
      if (
        !mutateResult ||
        mutateResult.status >= 400 ||
        mutateResult.data?.ok === false
      ) {
        setError(
          mutateResult?.data?.error ||
            mutateResult?.data?.message ||
            "Failed to update name"
        );
        setSaving(false);
        return;
      }

      // 2) Only attempt email-change if the user provided a new email and it differs from original
      if (emailProvided && email.trim() !== origEmail.trim()) {
        const token = getToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // <-- WIRED UP: POST to /auth/request-email-change with { newEmail }
        const emailRes = await api.post(
          "/auth/request-email-change",
          { newEmail: email.trim() },
          { headers }
        );
        if (emailRes.status >= 400 || emailRes.data?.ok === false) {
          setError(
            emailRes.data?.error ||
              emailRes.data?.message ||
              "Failed to initiate email change"
          );
          setSaving(false);
          return;
        }
        setSuccessMsg("Name updated. Verification sent to new email.");
        setOrigEmail(email); // update baseline to new email
      } else {
        setSuccessMsg("Changes saved");
        // if user didn't provide a new email, keep origEmail unchanged
      }

      setTimeout(() => setSuccessMsg(null), 2000);
      setName("");
      setEmail("");
      setOpen(false);
    } catch {
      setError("Network error while saving changes");
    } finally {
      setSaving(false);
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
