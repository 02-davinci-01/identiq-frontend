import React from "react";
import Topbar from "@/components/Dashboard/Topbar/Topbar";
import Sidebar from "@/components/Dashboard/Sidebar/Sidebar";
import styles from "./styles/dashboard.module.css";
import Providers from "@/components/Provider/Providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.dmRoot}>
      <Topbar />
      <Sidebar />
      <main className={styles.dmMain}>
        <Providers>{children}</Providers>
      </main>
    </div>
  );
}
