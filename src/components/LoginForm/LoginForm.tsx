// src/components/LoginForm/LoginForm.tsx
"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Modal from "@/components/LModal/LModal";
import "./loginForm.css";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // backend base from env (falls back to localhost:3001)
  const BACKEND_BASE = (process.env.NEXT_PUBLIC_API_URL as string) || "https://localhost:3001";

  // helper: persist token — per your request we ALWAYS store the canonical token in localStorage
  function persistTokenLocal(key: string, token: string) {
    try {
      localStorage.setItem(key, token); // ALWAYS store in localStorage
    } catch (e) {
      // fallback: sessionStorage (should be rare)
      try {
        sessionStorage.setItem(key, token);
      } catch (e2) {
        // ignore
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${BACKEND_BASE}/auth/login`,
        { email: email.trim(), password },
        {
          headers: { "Content-Type": "application/json" },
          validateStatus: (s) => s >= 200 && s < 500,
          // withCredentials: true, // enable only if your server uses cookie auth
        }
      );

      // DEBUG: inspect the full response shape in console (remove in prod)
      // eslint-disable-next-line no-console
      console.log("LOGIN RESPONSE", { status: res.status, data: res.data });

      if (res.status < 200 || res.status >= 300) {
        const body = res.data ?? {};
        const msg = body?.message || body?.error || "Invalid credentials";
        setError(msg);
        return;
      }

      // token is located at res.data.data.accessToken in your backend
      const token =
        res?.data?.accessToken ||
        res?.data?.data?.accessToken ||
        res?.data?.token ||
        res?.data?.data?.token ||
        res?.data?.auth?.token ||
        null;

      if (token) {
        // 1) persist canonical token to localStorage (guarantees dashboard sees it)
        persistTokenLocal("access_token", token);

        // 2) also set a fallback key 'token' (some older code checks this)
        try {
          localStorage.setItem("token", token);
        } catch (e) {}

        // 3) set global axios header so modules that use global axios get Authorization too
        try {
          // @ts-ignore
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } catch (e) {
          // ignore
        }

        // 4) clear sensitive field
        setPassword("");

        // 5) redirect to dashboard
        router.push("/dashboard");
        return;
      }

      // If no token in body but 200/201, assume cookie-based auth (less likely for your case)
      if (res.status === 200 || res.status === 201) {
        axios.defaults.withCredentials = true;
        router.push("/dashboard");
        return;
      }

      setError("Login succeeded but token missing from response.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Login error:", err);
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

              <div className="password-wrapper">
                <input
                  className="login-input password-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="password-icon" size={20} />
                  ) : (
                    <Eye className="password-icon" size={20} />
                  )}
                </button>
              </div>
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
            `Enter your email and we will send a reset link.`
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
