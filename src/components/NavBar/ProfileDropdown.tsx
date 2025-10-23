"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./profileDropdown.module.css";
import {
  ChangePasswordModal,
  DeleteAccountModal,
} from "@/components/Modal/Modal";
import axios, { AxiosInstance } from "axios";

const BACKEND_BASE =
  (process.env.NEXT_PUBLIC_API_URL as string) || "https://localhost:3001";
const api: AxiosInstance = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 10_000,
  validateStatus: (s) => s >= 200 && s < 500,
});

function getToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken") ||
    null
  );
}

export default function ProfileDropdown() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  // Controlled state for the inputs (we'll always clear these on open/close)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Keep origEmail for change-detection only; this does NOT populate the input fields.
  const [origEmail, setOrigEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // Utility: close dropdown but ensure inputs & messages are cleared first
  function closeDropdown() {
    setName("");
    setEmail("");
    setError(null);
    setSuccessMsg(null);
    setOpen(false);
  }

  // close dropdown when clicking outside -> use closeDropdown so clearing runs
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // we intentionally leave deps empty; closeDropdown uses stable setters

  // fetch current user details (only to read original email for change flow)
  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // GET /users/me (users controller)
        const res = await api.get("/users/me", { headers });
        if (!res || res.status >= 400) {
          setLoading(false);
          return;
        }
        const data = res.data;
        const payload = data?.data ?? data;

        // IMPORTANT: do NOT populate visible inputs here.
        // Keep original email for change detection only.
        setOrigEmail(payload?.email || "");
        // ensure visible inputs remain empty:
        setName("");
        setEmail("");
      } catch {
        // ignore - users can edit manually
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email");
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1) Update name via auth endpoint
      const nameRes = await api.patch(
        "/auth/name",
        { name: name.trim() },
        { headers }
      );
      if (nameRes.status >= 400 || nameRes.data?.ok === false) {
        setError(
          nameRes.data?.error ||
            nameRes.data?.message ||
            "Failed to update name"
        );
        setSaving(false);
        return;
      }

      // 2) If email changed, initiate email change flow
      if (email.trim() !== origEmail.trim()) {
        const emailRes = await api.post(
          "/auth/email",
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
        // keep origEmail as previous email until user confirms via email
        setSuccessMsg("Name updated. Verification sent to new email.");
      } else {
        setSuccessMsg("Changes saved");
        setOrigEmail(email);
      }

      setTimeout(() => setSuccessMsg(null), 2000);

      // After successful save, clear visible inputs and close dropdown.
      setName("");
      setEmail("");
      setOpen(false);
    } catch {
      setError("Network error while saving changes");
    } finally {
      setSaving(false);
    }
  }

  // open modals instead of direct navigation/confirm; ensure dropdown closes & clears
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
              // opening: ensure inputs are empty when the dropdown becomes visible
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

      {/* Modals placed at root so they overlay everything */}
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
