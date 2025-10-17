// components/Topbar/Topbar.tsx
"use client";

import React from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import ProfileDropdown from "@/components/NavBar/ProfileDropdown";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Topbar() {
  const router = useRouter();

  const BACKEND_BASE = (process.env.NEXT_PUBLIC_API_URL as string) || "https://localhost:3001";
  const logoutEndpoint = `${BACKEND_BASE.replace(/\/$/, "")}/auth/logout`;

  async function handleLogout(e?: React.MouseEvent) {
    if (e) e.preventDefault();

    // read token fresh
    let token: string | null = null;
    try {
      token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("authToken") ||
        null;
    } catch (err) {
      token = null;
    }

    try {
      // call backend logout endpoint (best-effort)
      await axios.post(
        logoutEndpoint,
        {},
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          validateStatus: (s) => s >= 200 && s < 500,
        }
      );
    } catch (err) {
      // ignore errors — we'll still clear client state
      console.warn("Logout request failed (continuing to clear local state).", err);
    } finally {
      // clear tokens and related keys from client storage
      try {
        localStorage.removeItem("access_token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("jwt");
        localStorage.removeItem("authToken");
        localStorage.removeItem("jid");
        // remove dashboard theme so UI doesn't reapply light on reload
        try {
          localStorage.removeItem("dashboardTheme");
        } catch (err) {}
      } catch (err) {
        // ignore storage errors
      }
      try {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("authToken");
      } catch (err) {}

      // clear axios defaults
      try {
        // @ts-ignore
        delete axios.defaults.headers.common["Authorization"];
        axios.defaults.withCredentials = false;
      } catch (err) {}

      // --- Apply PUBLIC black theme CSS variables on :root so public pages render black immediately
      try {
        const rootStyle = document?.documentElement?.style;
        if (rootStyle) {
          // Public black theme (explicit values)
          rootStyle.setProperty("--accent", "#000000"); // main accent becomes black
          rootStyle.setProperty("--accent-rgb", `0, 0, 0`);
          rootStyle.setProperty("--accent-2", "#111111"); // slightly lighter for overlays
          rootStyle.setProperty("--accent-foreground", "#ffffff"); // text on black should be white
          rootStyle.setProperty("--header-bg", "#000000");
          rootStyle.setProperty("--top-left-bg", "#000000");
          rootStyle.setProperty("--top-left-bg-2", "#0a0a0a");
        }
      } catch (err) {
        console.warn("Failed to set public black theme vars:", err);
      }

      // redirect to login page
      router.push("/auth/login");
    }
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>identiq</div>

      <nav className={styles.topbarActions}>
        <ProfileDropdown />
        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </nav>
    </header>
  );
}
