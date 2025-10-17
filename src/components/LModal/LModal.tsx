"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import "./modal.css"; // for the overlay/blur styling

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setLoading(false);
      setMessage(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const API_BASE =
    (process.env.NEXT_PUBLIC_API_URL as string) || "http://localhost:3001";

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setMessage(null);

    const trimmed = String(email || "").trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE.replace(/\/$/, "")}/auth/forgot-password`,
        { email: trimmed },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      const serverMessage =
        res?.data?.message ??
        "If that email exists we have sent a reset link. Please check your inbox.";
      setMessage(serverMessage);

      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error("Forgot password send failed", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send reset link. Try again later.";
      setError(String(msg));
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Forgot password"
    >
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-window" role="document">
        <div className="modal-header">
          <h3 className="modal-title">Forgot password</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ padding: 8 }}>
            <form onSubmit={handleSend}>
              <label
                style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  height: 42,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.08)",
                  marginBottom: 10,
                  fontFamily: "inherit",
                  fontSize: 15,
                }}
                required
              />

              {error && (
                <div
                  role="alert"
                  style={{
                    color: "#b00020",
                    marginBottom: 10,
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  style={{
                    color: "#0a7a00",
                    marginBottom: 10,
                    fontSize: 13,
                  }}
                >
                  {message}
                </div>
              )}

              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) onClose();
                  }}
                  style={{
                    minWidth: 110,
                    height: 40,
                    fontFamily: "inherit",
                    fontSize: 15,
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.06)",
                    background: "transparent",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "background 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget.style.background = "rgba(0,0,0,0.03)");
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget.style.background = "transparent");
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  onClick={handleSend}
                  disabled={loading}
                  style={{
                    minWidth: 110,
                    height: 40,
                    fontFamily: "inherit",
                    fontSize: 15,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: "none",
                    background: loading
                      ? "#c9c9c9"
                      : "var(--accent, #c96a2b)",
                    color: "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
                    transition: "background 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    if (!loading)
                      e.currentTarget.style.background =
                        "var(--accent-hover, #b45a1f)";
                  }}
                  onMouseOut={(e) => {
                    if (!loading)
                      e.currentTarget.style.background =
                        "var(--accent, #c96a2b)";
                  }}
                >
                  {loading ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
