// app/dashboard/layout.tsx
import React from "react";
import Topbar from "@/components/Dashboard/Topbar";
import Sidebar from "@/components/Dashboard/Sidebar";
import styles from "./styles/dashboard.module.css";
import Providers from "@/components/Providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.dmRoot} suppressHydrationWarning>
      <Topbar />
      <div className={styles.dmBody}>
        <Sidebar />
        {/* Wrap the dashboard children in a client-side Providers so react-query is available */}
        <main className={styles.dmMain}>
          <Providers>{children}</Providers>
        </main>
      </div>
    </div>
  );
}
