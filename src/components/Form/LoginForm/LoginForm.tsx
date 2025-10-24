"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, RotateCw } from "lucide-react";
import styles from "./loginForm.module.css";
import axios from "axios";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LModal from "@/components/Modal/LoginModal/LoginModal"; // ✅ Only LModal imported now

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // CAPTCHA states
  const [captchaSvg, setCaptchaSvg] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const BACKEND_BASE =
    (process.env.NEXT_PUBLIC_API_URL as string) || "https://localhost:3001";

  function persistTokenLocal(key: string, token: string) {
    try {
      localStorage.setItem(key, token);
    } catch {
      try {
        sessionStorage.setItem(key, token);
      } catch {
        // ignore
      }
    }
  }

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_BASE}/auth/captcha`, {
        headers: { Accept: "application/json" },
        validateStatus: (s) => s >= 200 && s < 500,
      });

      const body = res.data ?? {};

      if (body?.svg && body?.token) {
        setCaptchaSvg(body.svg);
        setCaptchaToken(body.token);
        setCaptchaInput("");
      } else {
        if (
          typeof res.data === "string" &&
          res.data.trim().startsWith("<svg")
        ) {
          setCaptchaSvg(res.data);
          setCaptchaToken(null);
          setCaptchaInput("");
        } else {
          setCaptchaSvg(null);
          setCaptchaToken(null);
          setError("Failed to load captcha from server.");
        }
      }
    } catch (err) {
      console.error("Captcha fetch error:", err);
      setError("Unable to load captcha. Try refreshing the page.");
      setCaptchaSvg(null);
      setCaptchaToken(null);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (body?.ok === true) return { ok: true };

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

    if (!captchaInput || !captchaInput.trim()) {
      setError("Please solve the captcha before signing in.");
      return;
    }

    setLoading(true);

    try {
      const verify = await verifyCaptcha();
      if (!verify.ok) {
        setError(verify.message || "Captcha verification failed.");
        await fetchCaptcha();
        setLoading(false);
        return;
      }

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
        } catch {}
        try {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } catch {}
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

  const renderCaptcha = () => {
    if (!captchaSvg) {
      return (
        <div className={styles.captchaPlaceholder}>Captcha not available</div>
      );
    }

    if (
      typeof captchaSvg === "string" &&
      captchaSvg.trim().startsWith("<svg")
    ) {
      return (
        <div
          className={styles.captchaSvg}
          aria-hidden={false}
          dangerouslySetInnerHTML={{ __html: captchaSvg }}
        />
      );
    }

    return (
      <div style={{ display: "inline-block", lineHeight: 0 }}>
        <Image
          src={captchaSvg}
          alt="captcha"
          width={160}
          height={56}
          style={{ display: "block", maxWidth: "100%", height: "auto" }}
        />
      </div>
    );
  };

  return (
    <>
      <div
        className={styles.loginCard}
        role="region"
        aria-labelledby="lf-heading"
      >
        <div className={styles.loginCardInner}>
          <h2 id="lf-heading" className={styles.loginTitle}>
            Sign in
          </h2>
          <p className={styles.loginSub}>
            Enter your credentials to access your account.
          </p>

          <form className={styles.loginForm} onSubmit={handleSubmit} noValidate>
            {error && (
              <div className={styles.loginError} role="alert">
                {error}
              </div>
            )}

            <label className={styles.loginField}>
              <span className={styles.loginLabel}>Email</span>
              <input
                className={styles.loginInput}
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className={styles.loginField}>
              <span className={styles.loginLabel}>Password</span>

              <div className={styles.passwordWrapper}>
                <input
                  className={`${styles.loginInput} ${styles.passwordInput}`}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className={styles.passwordToggle}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className={styles.passwordIcon} size={20} />
                  ) : (
                    <Eye className={styles.passwordIcon} size={20} />
                  )}
                </button>
              </div>
            </label>

            {/* CAPTCHA block */}
            <div className={styles.captchaField} aria-live="polite">
              <span className={styles.loginLabel}>Captcha</span>

              <div className={styles.captchaRow}>
                <div className={styles.captchaBox} aria-hidden={captchaLoading}>
                  {captchaLoading ? (
                    <div className={styles.captchaLoading}>Loading...</div>
                  ) : (
                    renderCaptcha()
                  )}
                </div>

                <div className={styles.captchaControls}>
                  <button
                    type="button"
                    className={`btn btn-ghost ${styles.captchaRefresh}`}
                    aria-label="Refresh captcha"
                    onClick={fetchCaptcha}
                    disabled={captchaLoading}
                  >
                    <RotateCw size={16} /> Refresh
                  </button>
                </div>
              </div>

              <input
                className={`${styles.loginInput} ${styles.captchaInput}`}
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

            <div className={`${styles.loginRow} ${styles.loginBetween}`}>
              <button
                type="button"
                className={styles.loginLinkBtn}
                onClick={() => setShowForgotModal(true)}
              >
                Forgot password?
              </button>
            </div>

            <button
              className={`btn btn-accent ${styles.loginSubmit}`}
              type="submit"
              disabled={loading || captchaLoading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div className={styles.loginDivider}>
              <span>or</span>
            </div>

            <p className={styles.loginSignup}>
              New here?{" "}
              <a className={styles.loginLink} href="/auth/register">
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
