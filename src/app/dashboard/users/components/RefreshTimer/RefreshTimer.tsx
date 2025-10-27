// src/app/dashboard/users/components/RefreshTimer.tsx
import React from "react";
import styles from "@/app/dashboard/styles/dashboard.module.css";

export function RefreshTimer({
  secondsLeft,
  onManualRefresh,
  disabled,
}: {
  secondsLeft: number;
  onManualRefresh: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        marginLeft: "auto",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.04)",
          fontWeight: 700,
        }}
        title="Auto refresh timer"
      >
        <span style={{ fontSize: 13 }}>Refresh in</span>
        <span
          style={{
            minWidth: 36,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {secondsLeft}s
        </span>
      </div>

      <button
        onClick={onManualRefresh}
        className={styles.btnSmall}
        style={{
          background: "var(--accent)",
          boxShadow: "none",
          color: "#fff",
        }}
        disabled={disabled}
      >
        Refresh
      </button>
    </div>
  );
}
