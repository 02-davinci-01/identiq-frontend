// components/Topbar/Topbar.tsx (or wherever your Topbar lives)
import React from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";
import ProfileDropdown from "@/components/NavBar/ProfileDropdown";
import Link from "next/link";

export default function Topbar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>identiq</div>

      <nav className={styles.topbarActions}>
        <ProfileDropdown />
        <form action="/api/auth/logout" method="post">
          {/* removed "btn btn-accent" to avoid global accent hover */}
          <button type="submit" className={styles.logoutBtn}>
            Logout
          </button>
        </form>
      </nav>
    </header>
  );
}
