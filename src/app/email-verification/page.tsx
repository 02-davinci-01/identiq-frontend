"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./email-verification.module.css";

type Status = "pending" | "success" | "failure";

export default function EmailVerificationPage() {
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
      const t = setTimeout(() => router.push("/auth/login"), 3500);
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
      const t = setTimeout(() => router.push("/auth/login"), 3500);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url, { method: "GET" });
        let payload: any = null;
        try {
          payload = await res.json();
        } catch {}

        if (cancelled) return;

        if (res.ok) {
          const msg =
            payload?.message ||
            payload?.msg ||
            payload?.success ||
            "Email verified successfully.";
          setStatus("success");
          setMessage(msg);
        } else {
          const msg =
            payload?.message ||
            payload?.error ||
            payload?.msg ||
            `Verification failed (${res.status}).`;
          setStatus("failure");
          setMessage(msg);
        }
      } catch (err: any) {
        if (cancelled) return;
        setStatus("failure");
        setMessage(
          err?.message ??
            "Network error — could not reach verification endpoint."
        );
      } finally {
        const t = setTimeout(() => router.push("/auth/login"), 3500);
        return () => clearTimeout(t);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, email, router]);

  return (
    <main className={styles.mainContainer}>
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
    </main>
  );
}
