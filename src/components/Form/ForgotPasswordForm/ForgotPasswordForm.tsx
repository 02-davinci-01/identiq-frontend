// src/components/ForgotPasswordForm/ForgotPasswordForm.tsx
"use client";

import React, { useReducer, useState } from "react";
import axios, { AxiosError } from "axios";
import "./forgotPasswordForm.css"; // keep your existing css name if different, replace if required

type State = {
  password: string;
  confirmPassword: string;
  loading: boolean;
  error: string | null;
  success: string | null;
};

type Action =
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "SET_CONFIRM"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_SUCCESS"; payload: string | null }
  | { type: "RESET" };

const initialState: State = {
  password: "",
  confirmPassword: "",
  loading: false,
  error: null,
  success: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "SET_CONFIRM":
      return { ...state, confirmPassword: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_SUCCESS":
      return { ...state, success: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export default function ForgotPasswordForm() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { password, confirmPassword, loading, error, success } = state;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const API_BASE =
    (process.env.NEXT_PUBLIC_API_URL as string) || "https://localhost:3001";

  const getQueryParam = (key: string) => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  };

  const token = typeof window !== "undefined" ? getQueryParam("token") : null;
  const email = typeof window !== "undefined" ? getQueryParam("email") : null;

  const validate = (): string | null => {
    if (!password) return "Please enter a password.";
    if (password.length < 2 || password.length > 128)
      return "Password length must be 2-128 characters.";
    if (!/^[a-zA-Z0-9]+$/.test(password))
      return "Password must be alphanumeric only.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!token || !email) return "Missing reset token or email in URL.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_SUCCESS", payload: null });

    const validationError = validate();
    if (validationError) {
      dispatch({ type: "SET_ERROR", payload: validationError });
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const url = `${API_BASE.replace(/\/$/, "")}/auth/reset-password`;
      const res = await axios.post<{ message?: string }>(
        `${url}?token=${encodeURIComponent(token!)}&email=${encodeURIComponent(
          email!
        )}`,
        { password },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      const message = res.data?.message ?? "Password updated successfully.";
      dispatch({ type: "SET_SUCCESS", payload: message });

      // redirect to login after a short delay
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
      }, 1200);
    } catch (err: unknown) {
      console.error("Reset password failed", err);

      let msg = "Failed to reset password.";
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        msg = axiosErr.response?.data?.message || axiosErr.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }

      dispatch({ type: "SET_ERROR", payload: msg });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <div className="forgot-password-card">
      <div className="forgot-password-card-inner">
        <h2 className="forgot-password-title">Reset your password</h2>

        <form
          className="forgot-password-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {error && (
            <div className="forgot-password-error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div role="status" style={{ color: "#0a7a00", marginBottom: 10 }}>
              {success}
            </div>
          )}

          <label className="forgot-password-field">
            <span className="forgot-password-label">New password</span>
            <div className="password-wrapper">
              <input
                className="forgot-password-input password-input"
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

          <label className="forgot-password-field">
            <span className="forgot-password-label">Confirm password</span>
            <div className="password-wrapper">
              <input
                className="forgot-password-input password-input"
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
            className="btn btn-accent forgot-password-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Saving…" : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
}
