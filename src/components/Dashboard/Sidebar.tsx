"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/dashboard/styles/dashboard.module.css";

function SidebarItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/dashboard";
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`${styles.sbItem} ${active ? styles.active : ""}`}
    >
      {children}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <SidebarItem href="/dashboard">Dashboard</SidebarItem>
        <SidebarItem href="/dashboard/users">Users</SidebarItem>
      </nav>

      <div className={styles.sbFooter}>
        <div className={styles.divider} />
        <div className={styles.avatar} />
      </div>
    </aside>
  );
}
