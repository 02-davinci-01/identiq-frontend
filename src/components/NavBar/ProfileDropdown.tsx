"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./profileDropdown.module.css";
import {
  ChangePasswordModal,
  DeleteAccountModal,
} from "@/components/Modal/Modal";

export default function ProfileDropdown() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // fetch current user details (optional; replace with props/context if you already have user)
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user/me");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.data) {
          setName(data.data.name || "");
          setEmail(data.data.email || "");
        }
      } catch {
        // ignore - users can edit manually
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
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        setError(json?.error || "Failed to save changes");
        return;
      }
      setSuccessMsg("Changes saved");
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch {
      setError("Network error while saving changes");
    } finally {
      setSaving(false);
    }
  }

  // open modals instead of direct navigation/confirm
  function handleOpenChangePassword() {
    setOpen(false);
    setOpenChangePassword(true);
  }

  function handleOpenDelete() {
    setOpen(false);
    setOpenDeleteModal(true);
  }

  return (
    <>
      <div className={styles.wrapper} ref={rootRef}>
        <button
          className={styles.trigger}
          onClick={() => setOpen((v) => !v)}
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
