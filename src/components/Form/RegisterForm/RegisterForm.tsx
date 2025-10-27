// src/components/RegisterForm/RegisterForm.tsx
"use client";

import React, { useReducer } from "react";
import axios, { AxiosError } from "axios";
import "./registerForm.css";
import { showBreadcrumb } from "@/lib/breadcrumb";

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", payload: null });

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

      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      // server expects { name, email } (confirmed from your controller & service)
      const payload = {
        name: userName,
        email,
        remember: !!remember, // harmless extra field if server ignores it
      };

      const res = await axios.post(
        `${base.replace(/\/$/, "")}/auth/register`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 8000,
        }
      );

      // If backend returns { message, status } or similar on success, use it.
      const successMessage =
        res?.data?.message ?? "Email sent — check your inbox to verify.";

      showBreadcrumb(successMessage, "success");

      dispatch({ type: "RESET_FORM" });
    } catch (err: unknown) {
      // Normalize errors safely (no `any`)
      let msg = "Registration failed. Please try again.";

      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<unknown>;
        const data = axiosErr.response?.data;

        if (typeof data === "string") {
          msg = data;
        } else if (data && typeof data === "object") {
          try {
            const d = data as Record<string, unknown>;
            if (typeof d.message === "string") msg = d.message;
            else if (typeof d.error === "string") msg = d.error;
          } catch {
            /* ignore parse errors */
          }
        } else if (axiosErr.message) {
          msg = axiosErr.message;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }

      dispatch({ type: "SET_ERROR", payload: msg });
      showBreadcrumb(msg, "error");
      // keep the original object for console debugging
      console.error("Register error:", err);
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

          {/* password removed here: password is set on complete-register after email verification */}

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
