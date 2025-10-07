// src/components/RegisterForm/RegisterForm.tsx
"use client";

import React, { useReducer } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./registerForm.css";
// plain css import; file below
// if you use CSS modules, change import accordingly

type State = {
  userName: string;
  email: string;
  password: string;
  remember: boolean;
  error: string | null;
  loading: boolean;
  showPassword: boolean;
};

type Action =
  | { type: "SET_USER"; payload: string }
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "TOGGLE_REMEMBER" }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "TOGGLE_PASSWORD" }
  | { type: "RESET_FORM" };

const initialState: State = {
  userName: "",
  email: "",
  password: "",
  remember: false,
  error: null,
  loading: false,
  showPassword: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_USER":
      return { ...state, userName: action.payload };
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "TOGGLE_REMEMBER":
      return { ...state, remember: !state.remember };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "TOGGLE_PASSWORD":
      return { ...state, showPassword: !state.showPassword };
    case "RESET_FORM":
      return { ...initialState };
    default:
      return state;
  }
}

export default function RegisterForm() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { userName, email, password, remember, error, loading, showPassword } =
    state;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", payload: null });

    // Basic client-side validation (extend with Yup/schema later)
    if (!userName.trim()) {
      dispatch({ type: "SET_ERROR", payload: "Please enter a username." });
      return;
    }
    if (!email.trim()) {
      dispatch({ type: "SET_ERROR", payload: "Please enter your email." });
      return;
    }
    if (!password) {
      dispatch({ type: "SET_ERROR", payload: "Please enter a password." });
      return;
    }
    if (password.length < 8) {
      dispatch({
        type: "SET_ERROR",
        payload: "Password must be at least 8 characters.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // TODO: replace with real API call
      // Example:
      // const res = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'content-type': 'application/json' },
      //   body: JSON.stringify({ userName, email, password, remember })
      // });
      // if (!res.ok) { throw new Error(await res.text()) }

      // Demo delay
      await new Promise((r) => setTimeout(r, 700));

      // On success you might redirect: router.push('/auth/confirm') or /dashboard
      alert("Registration (demo) succeeded — replace with real API call.");

      // Optionally clear sensitive fields

      dispatch({ type: "RESET_FORM" });
    } catch (err) {
      console.error(err);
      dispatch({
        type: "SET_ERROR",
        payload:
          typeof err === "string"
            ? err
            : "Registration failed. Please try again.",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <div className="register-card" role="region" aria-labelledby="rf-heading">
      <div className="register-card-inner">
        <h2 id="rf-heading" className="register-title">
          Create account
        </h2>

        <form className="register-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="register-error" role="alert">
              {error}
            </div>
          )}

          <label className="register-field">
            <span className="register-label">Username</span>
            <input
              className="register-input"
              type="text"
              placeholder="your-username"
              value={userName}
              onChange={(e) =>
                dispatch({ type: "SET_USER", payload: e.target.value })
              }
              required
              autoComplete="username"
            />
          </label>

          <label className="register-field">
            <span className="register-label">Email</span>
            <input
              className="register-input"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                dispatch({ type: "SET_EMAIL", payload: e.target.value })
              }
              required
              autoComplete="email"
            />
          </label>

          <label className="register-field">
            <span className="register-label">Password</span>

            <div className="password-wrapper">
              <input
                className="register-input password-input"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) =>
                  dispatch({ type: "SET_PASSWORD", payload: e.target.value })
                }
                required
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => dispatch({ type: "TOGGLE_PASSWORD" })}
              >
                {/* If you use lucide-react: replace below with <Eye /> / <EyeOff /> */}
                {showPassword ? (
                  <EyeOff className="password-icon" size={20} />
                ) : (
                  <Eye className="password-icon" size={20} />
                )}
              </button>
            </div>
          </label>

          <div className="register-row register-between">
            <label className="register-checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => dispatch({ type: "TOGGLE_REMEMBER" })}
              />
              <span>Remember me</span>
            </label>

            <a className="register-link" href="/auth/forgot">
              Forgot password?
            </a>
          </div>

          <button
            className="btn btn-accent register-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          {/* <p className="register-signup">
            Already have an account?{" "}
            <a className="register-link" href="/auth/login">
              Sign in
            </a>
          </p> */}
        </form>
      </div>
    </div>
  );
}
