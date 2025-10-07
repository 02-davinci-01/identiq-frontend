// src/components/LoginForm/LoginForm.tsx
"use client";

import React, { useState } from "react";
import Modal from "@/components/Modal/Modal";
import "./loginForm.css";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      // TODO: replace this with your real auth API call
      // Example:
      // const res = await fetch('/api/auth/login', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({email,password})});
      // handle tokens/cookies and redirects

      await new Promise((r) => setTimeout(r, 600)); // demo delay
      setPassword("");
      // On success redirect as necessary: use next/navigation router.push('/dashboard')
      alert("Demo login succeeded — replace with real auth.");
    } catch (err) {
      console.error(err);
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-card" role="region" aria-labelledby="lf-heading">
        <div className="login-card-inner">
          <h2 id="lf-heading" className="login-title">
            Sign in
          </h2>
          <p className="login-sub">
            Enter your credentials to access your account.
          </p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <label className="login-field">
              <span className="login-label">Email</span>
              <input
                className="login-input"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className="login-field">
              <span className="login-label">Password</span>
              <input
                className="login-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            <div className="login-row login-between">
              <label className="login-checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="login-link-btn"
                onClick={() => setShowForgotModal(true)}
              >
                Forgot password?
              </button>
            </div>

            <button
              className="btn btn-accent login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <div className="login-socials">
              <button type="button" className="btn btn-ghost">
                Sign in with Google
              </button>
              <button type="button" className="btn btn-ghost">
                Sign in with GitHub
              </button>
            </div>

            <p className="login-signup">
              New here?{" "}
              <a className="login-link" href="/auth/register">
                Create an account
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Forgot password modal */}
      <Modal
        open={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset password"
      >
        <div style={{ padding: "8px 0" }}>
          <p style={{ marginBottom: 12 }}>
            Enter your email and well send a reset link.
          </p>
          <input
            className="login-input"
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn" onClick={() => setShowForgotModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-accent"
              onClick={() => {
                // TODO: wire forgot password API
                alert("Reset link sent (demo).");
                setShowForgotModal(false);
              }}
            >
              Send
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
