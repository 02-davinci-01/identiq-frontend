// src/components/CompleteRegistration/CompleteRegisterForm.tsx
"use client";

import React, { useReducer, useState } from "react";
import "./completeRegisterForm.css";

type State = {
  password: string;
  confirmPassword: string;
  error: string | null;
  loading: boolean;
};

type Action =
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "SET_CONFIRM"; payload: string }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "RESET" };

const initialState: State = {
  password: "",
  confirmPassword: "",
  error: null,
  loading: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
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
  const { password, confirmPassword, error, loading } = state;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = (): string | null => {
    if (!password) return "Please enter a new password.";
    if (password.length < 8)
      return "Password must be at least 8 characters long.";
    if (password !== confirmPassword) return "Passwords do not match.";
    // optional: add more checks (numbers, symbols) if desired
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", payload: null });

    const vError = validate();
    if (vError) {
      dispatch({ type: "SET_ERROR", payload: vError });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // TODO: call backend to set password using verification token in query (e.g. ?token=xxx)
      // For demo, simulate network latency
      await new Promise((r) => setTimeout(r, 700));

      // In real flow: route to login page or dashboard after success
      alert("Password set successfully. You may now log in.");

      dispatch({ type: "RESET" });
    } catch (err) {
      console.error(err);
      dispatch({
        type: "SET_ERROR",
        payload:
          typeof err === "string"
            ? err
            : "Failed to set password. Please try again later.",
      });
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
          Set a new password
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
            <span className="complete-register-label">New password</span>

            <div className="password-wrapper">
              <input
                className="complete-register-input password-input"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) =>
                  dispatch({ type: "SET_PASSWORD", payload: e.target.value })
                }
                required
                autoComplete="new-password"
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
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
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) =>
                  dispatch({ type: "SET_CONFIRM", payload: e.target.value })
                }
                required
                autoComplete="new-password"
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={
                  showConfirm
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
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
