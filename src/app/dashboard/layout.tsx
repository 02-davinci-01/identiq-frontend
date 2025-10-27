// app/dashboard/layout.tsx
import React from "react";
import Topbar from "@/components/Dashboard/Topbar/Topbar";
import Sidebar from "@/components/Dashboard/Sidebar/Sidebar";
import styles from "./styles/dashboard.module.css";
import Providers from "@/components/Provider/Providers"; // ensure this path matches your file

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className={styles.dmRoot}>
        <Topbar />
        <Sidebar />
        <main className={styles.dmMain}>{children}</main>
      </div>
    </Providers>
  );
}
