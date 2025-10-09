// app/dashboard/components/Topbar.tsx
import React from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import Link from "next/link";

export default function Topbar({
  accentColor,
  textColor = "#fff",
}: {
  accentColor?: string | undefined;
  textColor?: string;
}) {
  // If accentColor is not provided, the CSS var fallback will be used.
  const style: React.CSSProperties = accentColor
    ? { background: accentColor, color: textColor }
    : {};

  return (
    <header className={styles.topbar} role="banner" style={style}>
      {/* Brand — same visual proportions as public header */}
      <div className={styles.brand}>identiq</div>

      {/* Right-side actions (use global button classes for identical sizing) */}
      <nav className={styles.topbarActions} aria-label="top navigation">
        <Link href="/profile" className="btn btn-ghost">
          Edit profile
        </Link>

        <form
          action="/api/auth/logout"
          method="post"
          style={{ display: "inline" }}
        >
          {/* Use a scoped class so we can guarantee contrast */}
          <button
            type="submit"
            className={`btn btn-accent ${styles.logoutBtn}`}
          >
            Logout
          </button>
        </form>
      </nav>
    </header>
  );
}
