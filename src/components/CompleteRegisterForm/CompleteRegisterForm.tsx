"use client";

import React, { useReducer, useState } from "react";
import axios from "axios";
import "./completeRegisterForm.css";
import { showBreadcrumb } from "@/lib/breadcrumb";

type State = {
  email: string;
  password: string;
  confirmPassword: string;
  error: string | null;
  loading: boolean;
};

type Action =
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "SET_CONFIRM"; payload: string }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "RESET" };

const initialState: State = {
  email: "",
  password: "",
  confirmPassword: "",
  error: null,
  loading: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "SET_CONFIRM":
      return { ...state, confirmPassword: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

export default function CompleteRegisterForm() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { email, password, confirmPassword, error, loading } = state;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getTokenFromLocation = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("token");
    } catch {
      return null;
    }
  };

  const validate = (): string | null => {
    if (!email.trim()) return "Please enter your email.";
    if (!password) return "Please enter a new password.";
    if (password.length < 2 || password.length > 128)
      return "Password must be between 2 and 128 characters.";
    if (!/^[a-zA-Z0-9]+$/.test(password))
      return "Password must be alphanumeric only.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", payload: null });

    const validationError = validate();
    if (validationError) {
      dispatch({ type: "SET_ERROR", payload: validationError });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = getTokenFromLocation();

      const url = `${base.replace(/\/$/, "")}/auth/complete-register${
        token ? `?token=${encodeURIComponent(token)}` : ""
      }`;

      const payload = {
        email,
        password,
      };

      const res = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      const successMsg =
        res?.data?.message || "Password set successfully. You can now log in.";
      showBreadcrumb(successMsg, "success");

      dispatch({ type: "RESET" });

      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 1200);
      }
    } catch (err: any) {
      let msg = "Failed to complete registration. Please try again.";
      if (axios.isAxiosError(err)) {
        if (err.response?.data) {
          if (typeof err.response.data === "string") msg = err.response.data;
          else if (err.response.data.message) msg = err.response.data.message;
          else if (err.response.data.error) msg = err.response.data.error;
        } else if (err.message) {
          msg = err.message;
        }
      }
      dispatch({ type: "SET_ERROR", payload: msg });
      showBreadcrumb(msg, "error");
      console.error("Complete register error:", err);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <div
      className="complete-register-card"
      role="region"
      aria-labelledby="complete-rf-heading"
    >
      <div className="complete-register-card-inner">
        <h2 id="complete-rf-heading" className="complete-register-title">
          Complete your registration
        </h2>

        <form
          className="complete-register-form"
          onSubmit={handleSubmit}
          noValidate
          aria-describedby={error ? "complete-register-error" : undefined}
        >
          {error && (
            <div
              id="complete-register-error"
              className="complete-register-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <label className="complete-register-field">
            <span className="complete-register-label">Email</span>
            <input
              className="complete-register-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                dispatch({ type: "SET_EMAIL", payload: e.target.value })
              }
              required
              autoComplete="email"
            />
          </label>

          <label className="complete-register-field">
            <span className="complete-register-label">New password</span>
            <div className="password-wrapper">
              <input
                className="complete-register-input password-input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) =>
                  dispatch({ type: "SET_PASSWORD", payload: e.target.value })
                }
                required
                minLength={2}
                maxLength={128}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="complete-register-field">
            <span className="complete-register-label">Confirm password</span>
            <div className="password-wrapper">
              <input
                className="complete-register-input password-input"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIRM", payload: e.target.value })
                }
                required
                minLength={2}
                maxLength={128}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm((s) => !s)}
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button
            className="btn btn-accent complete-register-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Saving…" : "Set password"}
          </button>
        </form>
      </div>
    </div>
  );
}
