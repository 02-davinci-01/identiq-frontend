"use client";

import React, { useEffect, useRef, ReactNode } from "react";
import ReactDOM from "react-dom";
import styles from "./modal.module.css";

type GenericModalProps = {
  open: boolean;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  hideClose?: boolean;
  ariaLabel?: string;
};

/**
 * GenericModal
 * - Renders into document.body using portal
 * - Handles ESC to close and clicking backdrop to close
 * - Focuses first focusable element when opened
 */
export function GenericModal({
  open,
  title,
  children,
  footer,
  onClose,
  hideClose = false,
  ariaLabel,
}: GenericModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    // prevent body scroll while modal open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus the first focusable element inside the modal
    requestAnimationFrame(() => {
      const el = modalRef.current;
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        // backdrop click closes; avoid closing when clicking inside modal
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title ?? "Dialog"}
        ref={modalRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          {!hideClose && (
            <button
              aria-label="Close"
              className={styles.closeBtn}
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ---------------------------
  Specific modal UIs that use GenericModal
   - ChangePasswordModal
   - DeleteAccountModal
   Both accept open + onClose and handle their own API calls.
----------------------------*/

type ChangePasswordProps = {
  open: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ open, onClose }: ChangePasswordProps) {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
      setSuccess(null);
      setLoading(false);
    }
  }, [open]);

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!current) {
      setError("Enter your current password.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        setError(json?.error || "Failed to change password.");
        return;
      }
      setSuccess("Password changed successfully.");
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1100);
    } catch {
      setError("Network error changing password.");
    } finally {
      setLoading(false);
    }
  }

  const footer = (
    <div className={styles.footerActions}>
      <button
        className={styles.btnGhost}
        type="button"
        onClick={onClose}
        disabled={loading}
      >
        Cancel
      </button>

      <button
        className={styles.btnPrimary}
        type="button"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </div>
  );

  return (
    <GenericModal
      open={open}
      title="Change password"
      footer={footer}
      onClose={onClose}
    >
      <form onSubmit={handleSave} className={styles.formInner}>
        <label className={styles.field}>
          <div className={styles.fieldLabel}>Current password</div>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={styles.input}
            autoComplete="current-password"
            required
          />
        </label>

        <label className={styles.field}>
          <div className={styles.fieldLabel}>New password</div>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={styles.input}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>

        <label className={styles.field}>
          <div className={styles.fieldLabel}>Confirm password</div>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={styles.input}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
      </form>
    </GenericModal>
  );
}

type DeleteAccountProps = {
  open: boolean;
  onClose: () => void;
};

export function DeleteAccountModal({ open, onClose }: DeleteAccountProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        setError(json?.error || "Failed to delete account.");
        return;
      }
      // If deletion succeeded, redirect
      window.location.href = "/";
    } catch {
      setError("Network error during deletion.");
    } finally {
      setLoading(false);
    }
  }

  const footer = (
    <div className={styles.footerActions}>
      <button
        className={styles.btnGhost}
        type="button"
        onClick={onClose}
        disabled={loading}
      >
        Cancel
      </button>

      <button
        className={styles.btnDanger}
        type="button"
        onClick={handleConfirm}
        disabled={loading}
      >
        {loading ? "Deleting..." : "Confirm"}
      </button>
    </div>
  );

  return (
    <GenericModal
      open={open}
      title="Delete account"
      footer={footer}
      onClose={onClose}
      ariaLabel="Delete account confirmation"
    >
      <div className={styles.confirmBody}>
        <p className={styles.confirmText}>
          Are you sure you want to permanently delete your account? This action
          cannot be undone.
        </p>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </GenericModal>
  );
}
