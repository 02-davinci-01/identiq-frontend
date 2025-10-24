// src/app/email-verification/EmailVerificationClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./email-verification.module.css";

type Status = "pending" | "success" | "failure";

/**
 * Client-side verification component.
 * Uses useSearchParams/useRouter safely (client-only).
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
        "Missing backend configuration (NEXT_PUBLIC_BACKEND_URL). Contact support."
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
    let redirectTid: number | undefined;

    (async () => {
      try {
        const res = await fetch(url, { method: "GET" });

        // payload unknown -> coerce safely
        let payload: unknown = null;
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }

        if (cancelled) return;

        const p = (payload as Record<string, unknown> | null) ?? null;

        if (res.ok) {
          const msg =
            (p?.message as string) ||
            (p?.msg as string) ||
            (typeof p?.success === "string"
              ? (p?.success as string)
              : undefined) ||
            "Email verified successfully.";
          setStatus("success");
          setMessage(String(msg));
        } else {
          const msg =
            (p?.message as string) ||
            (p?.error as string) ||
            (p?.msg as string) ||
            `Verification failed (${res.status}).`;
          setStatus("failure");
          setMessage(String(msg));
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err ?? "");
        setStatus("failure");
        setMessage(
          msg || "Network error — could not reach verification endpoint."
        );
      } finally {
        // schedule redirect and keep a reference so we can clear it on cleanup
        redirectTid = window.setTimeout(() => router.push("/auth/login"), 3500);
      }
    })();

    return () => {
      cancelled = true;
      if (redirectTid) window.clearTimeout(redirectTid);
    };
    // token and email are stable values from the search params; router is stable
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

      <p className={styles.redirectNote}>Redirecting to login...</p>
    </div>
  );
}
