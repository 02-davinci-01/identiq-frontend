import React from "react";
import Topbar from "@/components/Dashboard/Topbar";
import Sidebar from "@/components/Dashboard/Sidebar";
import styles from "./styles/dashboard.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.dmRoot}>
      <Topbar />
      <div className={styles.dmBody}>
        <Sidebar />
        <main className={styles.dmMain}>{children}</main>
      </div>
    </div>
  );
}
