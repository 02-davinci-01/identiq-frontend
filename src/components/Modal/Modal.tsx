"use client";

import React, { useEffect, useRef, ReactNode } from "react";
import ReactDOM from "react-dom";
import styles from "./modal.module.css";
import axios, { AxiosInstance } from "axios";
import { Eye, EyeOff } from "lucide-react";

type GenericModalProps = {
  open: boolean;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  hideClose?: boolean;
  ariaLabel?: string;
};

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

/** Clear text-like inputs, textareas and selects inside given container */
function clearInputsIn(el: HTMLElement | null) {
  if (!el) return;
  const inputs = el.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input, textarea, select");
  inputs.forEach((i) => {
    if (i instanceof HTMLInputElement) {
      const type = i.type?.toLowerCase();
      if (
        type === "text" ||
        type === "email" ||
        type === "tel" ||
        type === "search" ||
        type === "url" ||
        type === "password"
      ) {
        i.value = "";
        i.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } else if (i instanceof HTMLTextAreaElement) {
      i.value = "";
      i.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (i instanceof HTMLSelectElement) {
      i.selectedIndex = -1;
      i.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

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

  function handleClose() {
    try {
      clearInputsIn(modalRef.current);
    } catch {
      // ignore
    }
    onClose();
  }

  useEffect(() => {
    if (!open) return;

    // When opening, also clear any leftover values inside modal DOM so fields always start empty.
    try {
      clearInputsIn(modalRef.current);
    } catch {
      /* ignore */
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus first focusable element
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
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
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
              onClick={handleClose}
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
  ChangePasswordModal + DeleteAccountModal
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

  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNext, setShowNext] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  useEffect(() => {
    if (!open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
      setSuccess(null);
      setLoading(false);
      setShowCurrent(false);
      setShowNext(false);
      setShowConfirm(false);
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
      const token = getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await api.patch(
        "/auth/password",
        { oldPassword: current, password: next },
        { headers }
      );

      const json = res.data;
      if (
        res.status >= 200 &&
        res.status < 300 &&
        (json?.ok === undefined || json?.ok === true)
      ) {
        setSuccess(json?.message ?? "Password changed successfully.");
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 1100);
        return;
      }

      setError(json?.error || json?.message || "Failed to change password.");
    } catch (err) {
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
          <div className={styles.inputWrap}>
            <input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={styles.input}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              aria-label={
                showCurrent ? "Hide current password" : "Show current password"
              }
              className={styles.passwordToggle}
              onClick={() => setShowCurrent((s) => !s)}
            >
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label className={styles.field}>
          <div className={styles.fieldLabel}>New password</div>
          <div className={styles.inputWrap}>
            <input
              type={showNext ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <button
              type="button"
              aria-label={showNext ? "Hide new password" : "Show new password"}
              className={styles.passwordToggle}
              onClick={() => setShowNext((s) => !s)}
            >
              {showNext ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label className={styles.field}>
          <div className={styles.fieldLabel}>Confirm password</div>
          <div className={styles.inputWrap}>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <button
              type="button"
              aria-label={
                showConfirm ? "Hide confirm password" : "Show confirm password"
              }
              className={styles.passwordToggle}
              onClick={() => setShowConfirm((s) => !s)}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
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
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await api.delete("/auth", { headers });
      const json = res.data;
      if (
        res.status >= 200 &&
        res.status < 300 &&
        (json?.ok === undefined || json?.ok === true)
      ) {
        window.location.href = "/";
        return;
      }
      setError(json?.error || json?.message || "Failed to delete account.");
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
