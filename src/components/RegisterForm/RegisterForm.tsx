// src/components/RegisterForm/RegisterForm.tsx
"use client";

import React, { useReducer } from "react";
import "./registerForm.css";

type State = {
  userName: string;
  email: string;
  remember: boolean;
  error: string | null;
  loading: boolean;
};

type Action =
  | { type: "SET_USER"; payload: string }
  | { type: "SET_EMAIL"; payload: string }
  | { type: "TOGGLE_REMEMBER" }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "RESET_FORM" };

const initialState: State = {
  userName: "",
  email: "",
  remember: false,
  error: null,
  loading: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_USER":
      return { ...state, userName: action.payload };
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "TOGGLE_REMEMBER":
      return { ...state, remember: !state.remember };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "RESET_FORM":
      return { ...initialState };
    default:
      return state;
  }
}

export default function RegisterForm() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { userName, email, remember, error, loading } = state;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", payload: null });

    // Simple client-side validation
    if (!userName.trim()) {
      dispatch({ type: "SET_ERROR", payload: "Please enter a username." });
      return;
    }
    if (!email.trim()) {
      dispatch({ type: "SET_ERROR", payload: "Please enter your email." });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // TODO: call backend to create an account and send verification email
      // Example: POST /api/auth/register -> backend sends email verification
      await new Promise((r) => setTimeout(r, 700));

      // For now (demo): redirect to complete-register page where user sets password after email verification
      // Replace with actual redirect once API implements verification flow
      alert(
        "Demo: Registration step 1 complete. The next step (set password) happens after email verification."
      );

      dispatch({ type: "RESET_FORM" });
      // e.g. router.push('/auth/complete-register?token=...') after real verification flow
    } catch (err) {
      console.error(err);
      dispatch({
        type: "SET_ERROR",
        payload:
          typeof err === "string"
            ? err
            : "Registration failed. Please try again later.",
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
        </form>
      </div>
    </div>
  );
}
