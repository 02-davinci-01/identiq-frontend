"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, RotateCw } from "lucide-react";
import "./loginForm.css";
import axios from "axios";
import { useRouter } from "next/navigation";
import LModal from "@/components/LModal/LModal"; // ✅ Only LModal imported now

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ---------- CAPTCHA states (token-based per your backend) ----------
  const [captchaSvg, setCaptchaSvg] = useState<string | null>(null); // raw svg string
  const [captchaToken, setCaptchaToken] = useState<string | null>(null); // ephemeral token returned by backend
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaExpiresIn, setCaptchaExpiresIn] = useState<number | null>(null);

  // backend base from env (falls back to localhost:3001)
  const BACKEND_BASE =
    (process.env.NEXT_PUBLIC_API_URL as string) || "https://localhost:3001";

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

  // fetch captcha from backend (GET /auth/captcha) — expects { svg, token, expiresIn }
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_BASE}/auth/captcha`, {
        headers: { Accept: "application/json" },
        validateStatus: (s) => s >= 200 && s < 500,
      });

      const body = res.data ?? {};

      // prefer explicit keys { svg, token, expiresIn }
      if (body?.svg && body?.token) {
        setCaptchaSvg(body.svg);
        setCaptchaToken(body.token);
        setCaptchaExpiresIn(body.expiresIn ?? null);
        setCaptchaInput("");
      } else {
        // fallback: if server returned raw svg string directly
        if (
          typeof res.data === "string" &&
          res.data.trim().startsWith("<svg")
        ) {
          setCaptchaSvg(res.data);
          setCaptchaToken(null);
          setCaptchaExpiresIn(null);
          setCaptchaInput("");
        } else {
          setCaptchaSvg(null);
          setCaptchaToken(null);
          setCaptchaExpiresIn(null);
          setError("Failed to load captcha from server.");
        }
      }
    } catch (err) {
      console.error("Captcha fetch error:", err);
      setError("Unable to load captcha. Try refreshing the page.");
      setCaptchaSvg(null);
      setCaptchaToken(null);
      setCaptchaExpiresIn(null);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // verify captcha with backend (POST /auth/captcha/verify) → { token, answer }
  const verifyCaptcha = async (): Promise<{
    ok: boolean;
    message?: string;
  }> => {
    if (!captchaToken) {
      return { ok: false, message: "Captcha token missing, please refresh." };
    }

    if (!captchaInput || !captchaInput.trim()) {
      return { ok: false, message: "Please enter the captcha text." };
    }

    try {
      const res = await axios.post(
        `${BACKEND_BASE}/auth/captcha/verify`,
        { token: captchaToken, answer: captchaInput.trim() },
        {
          headers: { "Content-Type": "application/json" },
          validateStatus: (s) => s >= 200 && s < 500,
        }
      );

      const body = res.data ?? {};
      // controller returns { ok: true } on success per your DTO
      if (body?.ok === true) {
        return { ok: true };
      }

      // server may send reason / message
      return {
        ok: false,
        message: body?.reason || body?.message || "Captcha incorrect",
      };
    } catch (err) {
      console.error("Captcha verify error:", err);
      return { ok: false, message: "Captcha verification error" };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    // enforce captcha is entered
    if (!captchaInput || !captchaInput.trim()) {
      setError("Please solve the captcha before signing in.");
      return;
    }

    setLoading(true);

    try {
      // 1) verify captcha first
      const verify = await verifyCaptcha();
      if (!verify.ok) {
        setError(verify.message || "Captcha verification failed.");
        // refresh captcha after a failed verify
        await fetchCaptcha();
        setLoading(false);
        return;
      }

      // 2) proceed with login request (unchanged behavior)
      const res = await axios.post(
        `${BACKEND_BASE}/auth/login`,
        { email: email.trim(), password },
        {
          headers: { "Content-Type": "application/json" },
          validateStatus: (s) => s >= 200 && s < 500,
        }
      );

      console.log("LOGIN RESPONSE", { status: res.status, data: res.data });

      if (res.status < 200 || res.status >= 300) {
        const body = res.data ?? {};
        const msg = body?.message || body?.error || "Invalid credentials";
        setError(msg);
        return;
      }

      const token =
        res?.data?.accessToken ||
        res?.data?.data?.accessToken ||
        res?.data?.token ||
        res?.data?.data?.token ||
        res?.data?.auth?.token ||
        null;

      if (token) {
        persistTokenLocal("access_token", token);

        try {
          localStorage.setItem("token", token);
        } catch (e) {}

        try {
          // @ts-ignore
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } catch (e) {}

        setPassword("");
        router.push("/dashboard");
        return;
      }

      if (res.status === 200 || res.status === 201) {
        axios.defaults.withCredentials = true;
        router.push("/dashboard");
        return;
      }

      setError("Login succeeded but token missing from response.");
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  };

  // helper to render svg or image
  const renderCaptcha = () => {
    if (!captchaSvg) {
      return <div className="captcha-placeholder">Captcha not available</div>;
    }

    // svg string
    if (
      typeof captchaSvg === "string" &&
      captchaSvg.trim().startsWith("<svg")
    ) {
      return (
        <div
          className="captcha-svg"
          aria-hidden={false}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: captchaSvg }}
        />
      );
    }

    // otherwise assume data url or external url (unlikely here)
    return <img src={captchaSvg} alt="captcha" className="captcha-img" />;
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

            {/* CAPTCHA block */}
            <div className="login-field captcha-field" aria-live="polite">
              <span className="login-label">Captcha</span>

              <div className="captcha-row">
                <div className="captcha-box" aria-hidden={captchaLoading}>
                  {captchaLoading ? (
                    <div className="captcha-loading">Loading...</div>
                  ) : (
                    renderCaptcha()
                  )}
                </div>

                <div className="captcha-controls">
                  <button
                    type="button"
                    className="btn btn-ghost captcha-refresh"
                    aria-label="Refresh captcha"
                    onClick={fetchCaptcha}
                    disabled={captchaLoading}
                  >
                    <RotateCw size={16} /> Refresh
                  </button>
                </div>
              </div>

              <input
                className="login-input captcha-input"
                type="text"
                placeholder="Type the text you see"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                required
                aria-required
                name="captcha"
                autoComplete="off"
              />
            </div>

            <div className="login-row login-between">
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
              disabled={loading || captchaLoading}
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
      <LModal
        open={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </>
  );
}
