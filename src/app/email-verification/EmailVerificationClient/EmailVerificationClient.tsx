// src/app/email-verification/EmailVerificationClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "@/app/email-verification/EmailVerificationClient/email-verification.module.css";

type Status = "pending" | "success" | "failure";

/**
 * Client-side verification component.
 * On success: if server returns accessToken, store tokens + user in localStorage and go to /dashboard
 */
export default function EmailVerificationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState<string>("Verifying your email...");
  const [backendUrlResolved, setBackendUrlResolved] = useState<string | null>(
    null
  );

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    if (!base) {
      setStatus("failure");
      setMessage(
        "Missing backend configuration (NEXT_PUBLIC_API_URL). Contact support."
      );
      const t = window.setTimeout(() => router.push("/auth/login"), 3500);
      return () => clearTimeout(t);
    }

    const url = `${base.replace(
      /\/$/,
      ""
    )}/auth/confirm-email-change?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;
    setBackendUrlResolved(url);

    if (!token || !email) {
      setStatus("failure");
      setMessage("Missing token or email in the verification link.");
      const t = window.setTimeout(() => router.push("/auth/login"), 3500);
      return () => clearTimeout(t);
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url, { method: "GET" });

        let payload: any = null;
        try {
          payload = await res.json();
          console.log(payload);
        } catch {
          payload = null;
        }

        if (cancelled) return;

        if (res.ok) {
          // If server returned tokens (accessToken), persist them and redirect to dashboard immediately
          if (payload && payload.accessToken) {
            console.debug("[EmailVerification] token payload:", payload);

            // Normalize access token to "Bearer ..." form
            const tokenStr = String(payload.accessToken ?? "");
            const bearer = tokenStr;

            // Keys we will clear to avoid stale tokens
            const legacyKeys = [
              "access_token",
              "accessToken",
              "token",
              "jwt",
              "authToken",
              "auth_token",
              "authorization",
            ];

            try {
              // Remove legacy keys first
              for (const k of legacyKeys) {
                try {
                  localStorage.removeItem(k);
                } catch {
                  // ignore
                }
              }

              // Store canonical tokens & user
              localStorage.setItem("access_token", bearer);
              if (payload.refreshToken)
                localStorage.setItem(
                  "refresh_token",
                  String(payload.refreshToken)
                );
              if (payload.jid) localStorage.setItem("jid", String(payload.jid));
              if (payload.expiresIn)
                localStorage.setItem("expires_in", String(payload.expiresIn));
              if (payload.user)
                localStorage.setItem("user", JSON.stringify(payload.user));

              // Optionally store primary user email separately for quick access
              try {
                const u = payload.user;
                if (u && u.email)
                  localStorage.setItem("user_email", String(u.email));
              } catch {
                // ignore
              }

              setStatus("success");
              setMessage(
                String(
                  payload.message ??
                    "Email confirmed. Redirecting to dashboard..."
                )
              );

              // Immediately navigate to dashboard now that tokens are stored
              router.push("/dashboard");
              return;
            } catch (err) {
              // If localStorage failed for any reason, log but still redirect with a success state
              console.error(
                "[EmailVerification] Failed to persist tokens to localStorage:",
                err
              );
              setStatus("success");
              setMessage("Email confirmed. Redirecting to dashboard...");
              router.push("/dashboard");
              return;
            }
          }

          // No token returned: show success and redirect to login as before
          const msg = String(
            payload?.message ?? payload?.msg ?? "Email verified successfully."
          );
          setStatus("success");
          setMessage(msg);
          const t = window.setTimeout(() => router.push("/auth/login"), 2500);
          return () => clearTimeout(t);
        } else {
          const msg = String(
            payload?.message ??
              payload?.error ??
              payload?.msg ??
              `Verification failed (${res.status}).`
          );
          setStatus("failure");
          setMessage(msg);
          const t = window.setTimeout(() => router.push("/auth/login"), 3500);
          return () => clearTimeout(t);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err ?? "");
        setStatus("failure");
        setMessage(
          msg || "Network error — could not reach verification endpoint."
        );
        const t = window.setTimeout(() => router.push("/auth/login"), 3500);
        return () => clearTimeout(t);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, email, router]);

  return (
    <div className={styles.hero}>
      <div className={styles.iconWrapper}>
        {status === "pending" && (
          <div className={styles.typewriter}>Verifying your email...</div>
        )}

        {status === "success" && (
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" fill="#E6F8EE" />
            <path
              d="M7 12.5l2.8 2.8L17 8.1"
              stroke="#0A8A3B"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {status === "failure" && (
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" fill="#FBEAEA" />
            <path
              d="M15 9L9 15M9 9l6 6"
              stroke="#D23F3F"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <h1 className={styles.title}>
        {status === "success"
          ? "Email verified"
          : status === "failure"
          ? "Verification failed"
          : "Verifying..."}
      </h1>

      <p className={styles.message}>{message}</p>

      {backendUrlResolved && (
        <p className={styles.debugUrl}>
          Attempted: <code>{backendUrlResolved}</code>
        </p>
      )}

      <p className={styles.redirectNote}>Redirecting...</p>
    </div>
  );
}
